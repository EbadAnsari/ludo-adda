const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

// ─── Helper: send FCM ─────────────────────────────────────────────────────────
/**
 * Sends a Firebase Cloud Messaging (FCM) push notification to a specific user.
 * @param {string} uid - The user ID to send the notification to.
 * @param {string} title - The notification title.
 * @param {string} body - The notification body content.
 * @returns {Promise<void>}
 */
async function sendNotification(uid, title, body) {
	try {
		const snap = await db.collection("users").doc(uid).get();
		const token = snap.data()?.fcmToken;
		if (!token) return;
		await getMessaging().send({ token, notification: { title, body } });
	} catch (e) {
		console.log("FCM error:", e.message);
	}
}

// ─── Helper: create transaction record ───────────────────────────────────────
/**
 * Helper to execute a synchronous Firestore transaction creating a standard ledger record.
 * @param {FirebaseFirestore.Transaction} tx - The active Firestore transaction instance.
 * @param {string} uid - The user ID associated with the transaction.
 * @param {"credit" | "debit" | "bonus" | "refund"} type - The type of financial transaction.
 * @param {number} amount - The transaction amount.
 * @param {number} balanceBefore - The user's wallet balance before the transaction.
 * @param {string} description - A description explaining the transaction.
 * @param {string|null} [battleId=null] - An optional associated battle ID.
 */
function createTransaction(
	tx,
	uid,
	type,
	amount,
	balanceBefore,
	description,
	battleId = null,
) {
	const ref = db.collection("transactions").doc();
	return tx.set(ref, {
		uid,
		type,
		amount,
		balanceBefore,
		balanceAfter:
			type === "credit" || type === "bonus" || type === "refund"
				? balanceBefore + amount
				: balanceBefore - amount,
		description,
		battleId,
		timestamp: FieldValue.serverTimestamp(),
		status: "completed",
	});
}

// ─── Helper: verify admin ────────────────────────────────────────────────────
/**
 * Asserts the caller has administrative privileges via Firebase Auth custom claims or Firestore roles.
 * @param {string} uid - The authenticated user ID from the request context.
 * @throws {HttpsError} If the user is unauthenticated or lacks admin privileges.
 * @returns {Promise<void>}
 */
async function verifyAdmin(uid) {
	if (!uid) throw new HttpsError("unauthenticated", "Login required");
	const user = await require("firebase-admin/auth").getAuth().getUser(uid);
	if (!user.customClaims?.admin) {
		const snap = await db.collection("users").doc(uid).get();
		if (!snap.exists || !snap.data().isAdmin)
			throw new HttpsError("permission-denied", "Admin only");
	}
}

// ─── 1. onJoinBattle ─────────────────────────────────────────────────────────
/**
 * Callable function to let a user securely join an existing battle transactionally.
 * Deducts the entry fee from both the joiner and the creator's wallet synchronously.
 * @type {import("firebase-functions/v2/https").CallableFunction<any, any>}
 */
exports.onJoinBattle = onCall({ region: "asia-south1" }, async (request) => {
	if (!request.auth)
		throw new HttpsError("unauthenticated", "Login required");
	const { battleId } = request.data;
	if (!battleId)
		throw new HttpsError("invalid-argument", "battleId required");

	const uid = request.auth.uid;

	await db.runTransaction(async (tx) => {
		const battleRef = db.collection("battles").doc(battleId);
		const userRef = db.collection("users").doc(uid);

		const [battleSnap, userSnap] = await Promise.all([
			tx.get(battleRef),
			tx.get(userRef),
		]);

		if (!battleSnap.exists)
			throw new HttpsError("not-found", "Battle not found");
		const battle = battleSnap.data();

		if (battle.status !== "open")
			throw new HttpsError("failed-precondition", "Battle is not open");
		if (battle.joinerId !== null)
			throw new HttpsError(
				"already-exists",
				"Battle already has a joiner",
			);
		if (battle.creatorId === uid)
			throw new HttpsError(
				"invalid-argument",
				"Cannot join your own battle",
			);

		if (!userSnap.exists)
			throw new HttpsError("not-found", "User not found");
		const user = userSnap.data();

		if (user.isBlocked)
			throw new HttpsError("permission-denied", "Account is blocked");
		if (user.walletBalance < battle.entryFee)
			throw new HttpsError("failed-precondition", "Insufficient balance");

		const creatorRef = db.collection("users").doc(battle.creatorId);
		const creatorSnap = await tx.get(creatorRef);
		if (!creatorSnap.exists)
			throw new HttpsError("not-found", "Creator not found");
		const creator = creatorSnap.data();
		if (creator.walletBalance < battle.entryFee) {
			tx.update(battleRef, { status: "cancelled" });
			throw new HttpsError(
				"failed-precondition",
				"Creator has insufficient funds. Battle cancelled.",
			);
		}

		tx.update(userRef, {
			walletBalance: FieldValue.increment(-battle.entryFee),
		});
		tx.update(creatorRef, {
			walletBalance: FieldValue.increment(-battle.entryFee),
		});
		tx.update(battleRef, {
			joinerId: uid,
			joinerName: user.username,
			status: "running",
			startedAt: FieldValue.serverTimestamp(),
		});

		createTransaction(
			tx,
			uid,
			"debit",
			battle.entryFee,
			user.walletBalance,
			"Battle entry fee",
			battleId,
		);
		createTransaction(
			tx,
			battle.creatorId,
			"debit",
			battle.entryFee,
			creator.walletBalance,
			"Battle entry fee",
			battleId,
		);
	});

	return { success: true };
});

// ─── 2. onCancelBattle ────────────────────────────────────────────────────────
/**
 * Callable function for a creator to securely cancel their own unjoined battle.
 * @type {import("firebase-functions/v2/https").CallableFunction<any, any>}
 */
exports.onCancelBattle = onCall({ region: "asia-south1" }, async (request) => {
	if (!request.auth)
		throw new HttpsError("unauthenticated", "Login required");
	const { battleId } = request.data;
	const uid = request.auth.uid;

	const battleRef = db.collection("battles").doc(battleId);
	const snap = await battleRef.get();
	if (!snap.exists) throw new HttpsError("not-found", "Battle not found");

	const battle = snap.data();
	if (battle.creatorId !== uid)
		throw new HttpsError("permission-denied", "Only creator can cancel");
	if (battle.status !== "open")
		throw new HttpsError(
			"failed-precondition",
			"Can only cancel open battles",
		);

	await battleRef.update({ status: "cancelled" });
	return { success: true };
});

// ─── 3. onRoomCodeSet ─────────────────────────────────────────────────────────
/**
 * Firestore trigger to capture when a battle creator sets a valid room code.
 * Upon change, auto-configures a 3-minute deadline for the joiner to arrive.
 * @type {import("firebase-functions/v2/firestore").DocumentUpdatedFunction}
 */
exports.onRoomCodeSet = onDocumentUpdated(
	"battles/{battleId}",
	async (event) => {
		const before = event.data.before.data();
		const after = event.data.after.data();

		// Fix: require roomCode to be a string
		if (
			before.roomCode ||
			!after.roomCode ||
			typeof after.roomCode !== "string"
		)
			return;

		const deadline = new Date(Date.now() + 180 * 1000);
		await db.collection("battles").doc(event.params.battleId).update({
			roomJoinDeadline: deadline,
		});
	},
);

// ─── 4. onRoomDeadline ────────────────────────────────────────────────────────
/**
 * Callable function invoked by battle creator when the room join deadline passes.
 * If the joiner doesn't join the room, the creator automatically wins the entry pool.
 * @type {import("firebase-functions/v2/https").CallableFunction<any, any>}
 */
exports.onRoomDeadline = onCall({ region: "asia-south1" }, async (request) => {
	if (!request.auth)
		throw new HttpsError("unauthenticated", "Login required");
	const { battleId } = request.data;
	const uid = request.auth.uid;

	await db.runTransaction(async (tx) => {
		const ref = db.collection("battles").doc(battleId);
		const snap = await tx.get(ref);
		if (!snap.exists) throw new HttpsError("not-found", "Battle not found");
		const data = snap.data();

		if (data.creatorId !== uid)
			throw new HttpsError(
				"permission-denied",
				"Only creator can trigger deadline",
			);

		if (data.status !== "running")
			throw new HttpsError(
				"failed-precondition",
				"Battle is not running",
			);
		if (data.joinerJoined)
			throw new HttpsError(
				"failed-precondition",
				"Joiner already joined",
			);

		if (!data.roomJoinDeadline)
			throw new HttpsError("failed-precondition", "No deadline set");
		const deadlineMs = data.roomJoinDeadline.toMillis
			? data.roomJoinDeadline.toMillis()
			: new Date(data.roomJoinDeadline).getTime();
		if (Date.now() < deadlineMs)
			throw new HttpsError(
				"failed-precondition",
				"Deadline has not passed yet",
			);

		if (data.result)
			throw new HttpsError(
				"failed-precondition",
				"Battle already resolved",
			);

		const creatorRef = db.collection("users").doc(data.creatorId);
		const creatorSnap = await tx.get(creatorRef);
		// Fix: recalculate prizePool instead of trusting doc
		const derivedPrizePool = Math.floor(data.entryFee * 2 * 0.9);

		tx.update(creatorRef, {
			walletBalance: FieldValue.increment(derivedPrizePool),
			totalWins: FieldValue.increment(1),
			totalEarnings: FieldValue.increment(derivedPrizePool),
		});
		tx.update(ref, {
			result: "creator_won",
			winnerId: data.creatorId,
			winnerName: data.creatorName,
			status: "completed",
			completedAt: FieldValue.serverTimestamp(),
		});

		createTransaction(
			tx,
			data.creatorId,
			"credit",
			derivedPrizePool,
			creatorSnap.data().walletBalance,
			"Battle won (joiner no-show)",
			battleId,
		);
	});

	return { success: true };
});

/**
 * Calculates a player's win rate percentage.
 * @param {number} wins - The count of total wins.
 * @param {number} losses - The count of total losses.
 * @returns {number} The integer win rate percentage.
 */
function computeWinRate(wins, losses) {
	const total = wins + losses;
	return total === 0 ? 0 : Math.round((wins / total) * 100);
}

// ─── 5. onResultSubmitted ─────────────────────────────────────────────────────
/**
 * Synchronous ledger trigger invoked when both users independently submit end results.
 * Cross-checks claims, awards automated pools on agreement, or forces a manual admin dispute.
 * @type {import("firebase-functions/v2/firestore").DocumentUpdatedFunction}
 */
exports.onResultSubmitted = onDocumentUpdated(
	"battles/{battleId}",
	async (event) => {
		const before = event.data.before.data();
		const after = event.data.after.data();
		const battleId = event.params.battleId;

		if (
			before.creatorResult === after.creatorResult &&
			before.joinerResult === after.joinerResult
		)
			return;

		// The user shouldn't have to wait for the loser's confirmation.
		// As soon as anyone submits a result, flag it for Admin Review.
		if (!after.creatorResult && !after.joinerResult) return;

		if (after.status === "completed" || after.status !== "running") return;

		// The business logic requests NO AUTOMATIC PAYOUTS.
		// Even if players agree, the admin must manually verify the screenshot.
		await db
			.collection("battles")
			.doc(battleId)
			.update({ status: "disputed" });
			
		await sendNotification(
			after.creatorId,
			"Under Review",
			"Admin is reviewing the match results before releasing funds.",
		);
		await sendNotification(
			after.joinerId,
			"Under Review",
			"Admin is reviewing the match results before releasing funds.",
		);
	},
);

// ─── 6. onDepositApproved ─────────────────────────────────────────────────────
/**
 * Admin callable route to permanently approve a deposit request and inflate a user's wallet.
 * Validates request legitimacy and handles optional referral payouts.
 * @type {import("firebase-functions/v2/https").CallableFunction<any, any>}
 */
exports.onDepositApproved = onCall(
	{ region: "asia-south1" },
	async (request) => {
		await verifyAdmin(request.auth?.uid);
		const { requestId, amount } = request.data;

		if (
			!amount ||
			typeof amount !== "number" ||
			amount < 50 ||
			amount > 100000
		)
			throw new HttpsError("invalid-argument", "Invalid amount");
		if (!Number.isInteger(amount))
			throw new HttpsError(
				"invalid-argument",
				"Amount must be whole number",
			);

		const reqRef = db.collection("depositRequests").doc(requestId);
		const reqSnap = await reqRef.get();
		if (!reqSnap.exists)
			throw new HttpsError("not-found", "Request not found");

		const reqData = reqSnap.data();
		if (reqData.status !== "pending")
			throw new HttpsError(
				"failed-precondition",
				"Request already processed",
			);

		const { uid } = reqData;

		await db.runTransaction(async (tx) => {
			const userRef = db.collection("users").doc(uid);
			const userSnap = await tx.get(userRef);
			if (!userSnap.exists)
				throw new HttpsError("not-found", "User not found");
			const userData = userSnap.data();

			tx.update(userRef, { walletBalance: FieldValue.increment(amount) });
			tx.update(reqRef, {
				status: "approved",
				approvedAmount: amount,
				resolvedAt: FieldValue.serverTimestamp(),
			});

			createTransaction(
				tx,
				uid,
				"credit",
				amount,
				userData.walletBalance,
				"Deposit approved",
				null,
			);

			const referredBy = userData.referredBy;
			const alreadyDone = userData.firstDepositDone;
			if (referredBy && !alreadyDone && referredBy !== uid) {
				const refRef = db.collection("users").doc(referredBy);
				const refSnap = await tx.get(refRef);
				if (refSnap.exists) {
					tx.update(refRef, {
						walletBalance: FieldValue.increment(10),
					});
					tx.update(userRef, { firstDepositDone: true });
					createTransaction(
						tx,
						referredBy,
						"bonus",
						10,
						refSnap.data().walletBalance,
						"Referral bonus",
						null,
					);
				}
			}
		});

		await sendNotification(
			uid,
			"Deposit Approved!",
			`₹${amount} added to your wallet.`,
		);
		return { success: true };
	},
);

// ─── 7. onDepositRejected ─────────────────────────────────────────────────────
/**
 * Admin callable route to safely reject a misleading or fraudulent deposit request.
 * @type {import("firebase-functions/v2/https").CallableFunction<any, any>}
 */
exports.onDepositRejected = onCall(
	{ region: "asia-south1" },
	async (request) => {
		await verifyAdmin(request.auth?.uid);
		const { requestId, adminNote } = request.data;
		const reqRef = db.collection("depositRequests").doc(requestId);

		await db.runTransaction(async (tx) => {
			const reqSnap = await tx.get(reqRef);
			if (!reqSnap.exists)
				throw new HttpsError("not-found", "Request not found");
			if (reqSnap.data().status !== "pending")
				throw new HttpsError(
					"failed-precondition",
					"Already processed",
				);

			tx.update(reqRef, {
				status: "rejected",
				adminNote: adminNote || "",
				resolvedAt: FieldValue.serverTimestamp(),
			});
		});

		const snap = await reqRef.get();
		await sendNotification(
			snap.data().uid,
			"Deposit Rejected",
			adminNote || "Your deposit request was rejected.",
		);
		return { success: true };
	},
);

// ─── 8. onWithdrawalApproved ──────────────────────────────────────────────────
/**
 * Admin callable route to finalize an approved withdrawal payout request,
 * confirming ledger debits and updating status.
 * @type {import("firebase-functions/v2/https").CallableFunction<any, any>}
 */
exports.onWithdrawalApproved = onCall(
	{ region: "asia-south1" },
	async (request) => {
		await verifyAdmin(request.auth?.uid);
		const { requestId } = request.data;

		const reqRef = db.collection("withdrawRequests").doc(requestId);

		let amount, uid;
		await db.runTransaction(async (tx) => {
			const reqSnap = await tx.get(reqRef);
			if (!reqSnap.exists)
				throw new HttpsError("not-found", "Request not found");
			const reqData = reqSnap.data();

			if (reqData.status !== "pending")
				throw new HttpsError(
					"failed-precondition",
					"Already processed",
				);

			amount = reqData.amount;
			uid = reqData.uid;

			const userRef = db.collection("users").doc(uid);
			const userSnap = await tx.get(userRef);
			const bal = userSnap.data().walletBalance;

			if (bal < amount)
				throw new HttpsError(
					"failed-precondition",
					"Insufficient balance",
				);

			tx.update(userRef, {
				walletBalance: FieldValue.increment(-amount),
			});
			tx.update(reqRef, {
				status: "approved",
				resolvedAt: FieldValue.serverTimestamp(),
			});
			createTransaction(
				tx,
				uid,
				"debit",
				amount,
				bal,
				"Withdrawal processed",
				null,
			);
		});

		await sendNotification(
			uid,
			"Withdrawal Processed",
			`₹${amount} sent to your UPI.`,
		);
		return { success: true };
	},
);

// ─── 9. onWithdrawalRejected ──────────────────────────────────────────────────
/**
 * Admin callable route to reject a withdrawal and automatically refund the frozen funds.
 * @type {import("firebase-functions/v2/https").CallableFunction<any, any>}
 */
exports.onWithdrawalRejected = onCall(
	{ region: "asia-south1" },
	async (request) => {
		await verifyAdmin(request.auth?.uid);
		const { requestId, adminNote } = request.data;
		const reqRef = db.collection("withdrawRequests").doc(requestId);

		const reqSnap = await reqRef.get();
		if (!reqSnap.exists)
			throw new HttpsError("not-found", "Request not found");
		const reqData = reqSnap.data();
		if (reqData.status !== "pending")
			throw new HttpsError("failed-precondition", "Already processed");
		const { uid, amount } = reqData;

		await db.runTransaction(async (tx) => {
			const userRef = db.collection("users").doc(uid);
			const userSnap = await tx.get(userRef);

			tx.update(userRef, { walletBalance: FieldValue.increment(amount) });
			tx.update(reqRef, {
				status: "rejected",
				adminNote: adminNote || "",
				resolvedAt: FieldValue.serverTimestamp(),
			});

			createTransaction(
				tx,
				uid,
				"refund",
				amount,
				userSnap.data().walletBalance,
				"Withdrawal rejected",
				null,
			);
		});

		await sendNotification(
			uid,
			"Withdrawal Rejected",
			adminNote || "Withdrawal request was rejected. Amount refunded.",
		);
		return { success: true };
	},
);

// ─── 10. onDisputeResolved ───────────────────────────────────────────────────
/**
 * Admin callable route used to override or finalize a disputed automated battle outcome.
 * Prevents string injections and handles split refunds or explicit winner assignments tightly.
 * @type {import("firebase-functions/v2/https").CallableFunction<any, any>}
 */
exports.onDisputeResolved = onCall(
	{ region: "asia-south1" },
	async (request) => {
		await verifyAdmin(request.auth?.uid);
		const { battleId, decision } = request.data;

		// New validation: Reject string injections!
		if (!["refund_both", "player1_wins", "player2_wins"].includes(decision))
			throw new HttpsError(
				"invalid-argument",
				`Unknown decision: ${decision}`,
			);

		const battleRef = db.collection("battles").doc(battleId);

		await db.runTransaction(async (tx) => {
			const battleSnap = await tx.get(battleRef);
			if (!battleSnap.exists)
				throw new HttpsError("not-found", "Battle not found");
			const battle = battleSnap.data();

			if (battle.status === "completed")
				throw new HttpsError("failed-precondition", "Already resolved");

			const prizePool = Math.floor(battle.entryFee * 2 * 0.9);

			if (decision === "refund_both") {
				const c = db.collection("users").doc(battle.creatorId);
				const j = db.collection("users").doc(battle.joinerId);
				const [cs, js] = await Promise.all([tx.get(c), tx.get(j)]);

				tx.update(c, {
					walletBalance: FieldValue.increment(battle.entryFee),
				});
				tx.update(j, {
					walletBalance: FieldValue.increment(battle.entryFee),
				});
				tx.update(battleRef, {
					status: "completed",
					adminVerified: true,
					result: "disputed",
					completedAt: FieldValue.serverTimestamp(),
				});
				createTransaction(
					tx,
					battle.creatorId,
					"refund",
					battle.entryFee,
					cs.data().walletBalance,
					"Dispute refund",
					battleId,
				);
				createTransaction(
					tx,
					battle.joinerId,
					"refund",
					battle.entryFee,
					js.data().walletBalance,
					"Dispute refund",
					battleId,
				);
			} else {
				const winnerId =
					decision === "player1_wins"
						? battle.creatorId
						: battle.joinerId;
				const loserId =
					decision === "player1_wins"
						? battle.joinerId
						: battle.creatorId;
				const winnerName =
					decision === "player1_wins"
						? battle.creatorName
						: battle.joinerName;

				const winnerRef = db.collection("users").doc(winnerId);
				const loserRef = db.collection("users").doc(loserId);
				const [ws, ls] = await Promise.all([
					tx.get(winnerRef),
					tx.get(loserRef),
				]);

				tx.update(winnerRef, {
					walletBalance: FieldValue.increment(prizePool),
					totalWins: FieldValue.increment(1),
					totalEarnings: FieldValue.increment(prizePool),
				});
				tx.update(loserRef, { totalLosses: FieldValue.increment(1) });
				tx.update(battleRef, {
					status: "completed",
					adminVerified: true,
					winnerId,
					winnerName,
					prizePool,
					result:
						decision === "player1_wins"
							? "creator_won"
							: "joiner_won",
					completedAt: FieldValue.serverTimestamp(),
				});

				createTransaction(
					tx,
					winnerId,
					"credit",
					prizePool,
					ws.data().walletBalance,
					"Dispute resolved",
					battleId,
				);
			}
		});

		const bsnap = await battleRef.get();
		const battle = bsnap.data();
		const msg = `Admin resolved the dispute: ${decision.replace("_", " ")}`;
		await sendNotification(battle.creatorId, "Dispute Resolved", msg);
		await sendNotification(battle.joinerId, "Dispute Resolved", msg);
		return { success: true };
	},
);

/**
 * Root callable utility to grant initial Firebase admin status to a user via an environment secret injection.
 * @type {import("firebase-functions/v2/https").CallableFunction<any, any>}
 */
exports.setAdminClaim = onCall({ region: "asia-south1" }, async (request) => {
	if (request.data.secret !== process.env.ADMIN_BOOTSTRAP_SECRET)
		throw new HttpsError("permission-denied", "Invalid secret");

	const { targetUid, isAdmin } = request.data;
	const { getAuth } = require("firebase-admin/auth");
	await getAuth().setCustomUserClaims(targetUid, { admin: isAdmin });
	await db.collection("users").doc(targetUid).update({ isAdmin });
	return { success: true };
});
