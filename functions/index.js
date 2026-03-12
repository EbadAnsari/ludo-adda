const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

// ─── Helper: send FCM ─────────────────────────────────────────────────────────
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
async function createTransaction(
	tx,
	uid,
	type,
	amount,
	balanceBefore,
	description,
	battleId = null,
) {
	const ref = db.collection("transactions").doc();
	await tx.set(ref, {
		uid,
		type,
		amount,
		balanceBefore,
		balanceAfter:
			type === "credit" || type === "bonus"
				? balanceBefore + amount
				: balanceBefore - amount,
		description,
		battleId,
		timestamp: FieldValue.serverTimestamp(),
		status: "completed",
	});
}

// ─── 1. onBattleJoined ────────────────────────────────────────────────────────
exports.onBattleJoined = onDocumentUpdated(
	"battles/{battleId}",
	async (event) => {
		const before = event.data.before.data();
		const after = event.data.after.data();
		const battleId = event.params.battleId;

		if (before.joinerId || !after.joinerId) return; // Not a join event

		const { creatorId, joinerId, entryFee, prizePool } = after;

		await db.runTransaction(async (tx) => {
			const creatorRef = db.collection("users").doc(creatorId);
			const joinerRef = db.collection("users").doc(joinerId);
			const battleRef = db.collection("battles").doc(battleId);

			const [creatorSnap, joinerSnap] = await Promise.all([
				tx.get(creatorRef),
				tx.get(joinerRef),
			]);
			const creatorBal = creatorSnap.data().walletBalance;
			const joinerBal = joinerSnap.data().walletBalance;

			if (creatorBal < entryFee || joinerBal < entryFee) {
				tx.update(battleRef, { status: "cancelled" });
				return;
			}

			tx.update(creatorRef, {
				walletBalance: FieldValue.increment(-entryFee),
			});
			tx.update(joinerRef, {
				walletBalance: FieldValue.increment(-entryFee),
			});
			tx.update(battleRef, {
				status: "running",
				startedAt: FieldValue.serverTimestamp(),
			});

			await createTransaction(
				tx,
				creatorId,
				"debit",
				entryFee,
				creatorBal,
				`Battle entry fee`,
				battleId,
			);
			await createTransaction(
				tx,
				joinerId,
				"debit",
				entryFee,
				joinerBal,
				`Battle entry fee`,
				battleId,
			);
		});

		await sendNotification(
			creatorId,
			"Battle Started!",
			`${after.joinerName} joined your battle. Good luck!`,
		);
		await sendNotification(
			joinerId,
			"Battle Started!",
			`You joined ${after.creatorName}'s battle. Good luck!`,
		);
	},
);

// ─── 2. onRoomCodeSet ─────────────────────────────────────────────────────────
exports.onRoomCodeSet = onDocumentUpdated(
	"battles/{battleId}",
	async (event) => {
		const before = event.data.before.data();
		const after = event.data.after.data();

		if (before.roomCode || !after.roomCode) return;

		const deadline = new Date(Date.now() + 180 * 1000);
		await db.collection("battles").doc(event.params.battleId).update({
			roomJoinDeadline: deadline,
		});
	},
);

// ─── 3. onRoomDeadline ────────────────────────────────────────────────────────
exports.onRoomDeadline = onCall({ region: "asia-south1" }, async (request) => {
	const { battleId } = request.data;

	await db.runTransaction(async (tx) => {
		const ref = db.collection("battles").doc(battleId);
		const snap = await tx.get(ref);
		const data = snap.data();

		if (data.status !== "running" || data.joinerJoined) return;

		const creatorRef = db.collection("users").doc(data.creatorId);
		const joinerRef = db.collection("users").doc(data.joinerId);
		const [cs, js] = await Promise.all([
			tx.get(creatorRef),
			tx.get(joinerRef),
		]);

		tx.update(creatorRef, {
			walletBalance: FieldValue.increment(data.prizePool),
			totalWins: FieldValue.increment(1),
			totalEarnings: FieldValue.increment(data.prizePool),
		});
		tx.update(ref, {
			result: "creator_won",
			winnerId: data.creatorId,
			winnerName: data.creatorName,
			status: "completed",
			completedAt: FieldValue.serverTimestamp(),
		});

		await createTransaction(
			tx,
			data.creatorId,
			"credit",
			data.prizePool,
			cs.data().walletBalance,
			"Battle won (forfeit)",
			battleId,
		);
	});

	return { success: true };
});

// ─── 4. onResultSubmitted ─────────────────────────────────────────────────────
exports.onResultSubmitted = onDocumentUpdated(
	"battles/{battleId}",
	async (event) => {
		const before = event.data.before.data();
		const after = event.data.after.data();
		const battleId = event.params.battleId;

		const creatorChanged = before.creatorResult !== after.creatorResult;
		const joinerChanged = before.joinerResult !== after.joinerResult;
		if (!creatorChanged && !joinerChanged) return;

		const {
			creatorId,
			joinerId,
			creatorResult,
			joinerResult,
			prizePool,
			entryFee,
		} = after;
		if (!creatorResult || !joinerResult) return; // Wait for both

		// Both agree
		if (
			(creatorResult === "won" && joinerResult === "lost") ||
			(creatorResult === "lost" && joinerResult === "won")
		) {
			const winnerId = creatorResult === "won" ? creatorId : joinerId;
			const loserId = creatorResult === "won" ? joinerId : creatorId;
			const winnerName =
				creatorResult === "won" ? after.creatorName : after.joinerName;

			await db.runTransaction(async (tx) => {
				const winnerRef = db.collection("users").doc(winnerId);
				const loserRef = db.collection("users").doc(loserId);
				const battleRef = db.collection("battles").doc(battleId);
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
					result:
						creatorResult === "won" ? "creator_won" : "joiner_won",
					winnerId,
					winnerName,
					status: "completed",
					completedAt: FieldValue.serverTimestamp(),
				});

				await createTransaction(
					tx,
					winnerId,
					"credit",
					prizePool,
					ws.data().walletBalance,
					`Battle won`,
					battleId,
				);
			});

			await sendNotification(
				winnerId,
				"You Won!",
				`You won ₹${prizePool}! 🎉`,
			);
			await sendNotification(
				loserId,
				"Match Lost",
				"Better luck next time!",
			);
		} else {
			// Dispute
			await db
				.collection("battles")
				.doc(battleId)
				.update({ status: "disputed" });
			await sendNotification(
				creatorId,
				"Under Review",
				"Both players claimed different results. Admin will review.",
			);
			await sendNotification(
				joinerId,
				"Under Review",
				"Both players claimed different results. Admin will review.",
			);
		}
	},
);

// ─── Helper: verify admin ────────────────────────────────────────────────────
async function verifyAdmin(uid) {
	const snap = await db.collection("users").doc(uid).get();
	if (!snap.exists() || !snap.data().isAdmin)
		throw new HttpsError("permission-denied", "Admin only");
	return snap.data();
}

// ─── 5. onDepositApproved ─────────────────────────────────────────────────────
exports.onDepositApproved = onCall(
	{ region: "asia-south1" },
	async (request) => {
		await verifyAdmin(request.auth?.uid);
		const { requestId, amount } = request.data;

		const reqRef = db.collection("depositRequests").doc(requestId);
		const reqSnap = await reqRef.get();
		if (!reqSnap.exists())
			throw new HttpsError("not-found", "Request not found");
		const { uid } = reqSnap.data();

		await db.runTransaction(async (tx) => {
			const userRef = db.collection("users").doc(uid);
			const userSnap = await tx.get(userRef);
			const bal = userSnap.data().walletBalance;

			tx.update(userRef, { walletBalance: FieldValue.increment(amount) });
			tx.update(reqRef, {
				status: "approved",
				resolvedAt: FieldValue.serverTimestamp(),
			});

			await createTransaction(
				tx,
				uid,
				"credit",
				amount,
				bal,
				`Deposit approved`,
				null,
			);

			// Referral bonus
			const referredBy = userSnap.data().referredBy;
			if (referredBy && !userSnap.data().firstDepositDone) {
				const refRef = db.collection("users").doc(referredBy);
				const refSnap = await tx.get(refRef);
				if (refSnap.exists()) {
					tx.update(refRef, {
						walletBalance: FieldValue.increment(10),
					});
					tx.update(userRef, { firstDepositDone: true });
					await createTransaction(
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
			`₹${amount} has been added to your wallet.`,
		);
		return { success: true };
	},
);

// ─── 6. onDepositRejected ─────────────────────────────────────────────────────
exports.onDepositRejected = onCall(
	{ region: "asia-south1" },
	async (request) => {
		await verifyAdmin(request.auth?.uid);
		const { requestId, adminNote } = request.data;

		const reqRef = db.collection("depositRequests").doc(requestId);
		const reqSnap = await reqRef.get();
		if (!reqSnap.exists())
			throw new HttpsError("not-found", "Request not found");
		const { uid } = reqSnap.data();

		await reqRef.update({
			status: "rejected",
			adminNote: adminNote || "",
			resolvedAt: FieldValue.serverTimestamp(),
		});
		await sendNotification(
			uid,
			"Deposit Rejected",
			adminNote || "Your deposit request was rejected.",
		);
		return { success: true };
	},
);

// ─── 7. onWithdrawalApproved ──────────────────────────────────────────────────
exports.onWithdrawalApproved = onCall(
	{ region: "asia-south1" },
	async (request) => {
		await verifyAdmin(request.auth?.uid);
		const { requestId } = request.data;

		const reqRef = db.collection("withdrawRequests").doc(requestId);
		const reqSnap = await reqRef.get();
		if (!reqSnap.exists())
			throw new HttpsError("not-found", "Request not found");
		const { uid, amount } = reqSnap.data();

		await db.runTransaction(async (tx) => {
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
			await createTransaction(
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
			`₹${amount} has been sent to your UPI.`,
		);
		return { success: true };
	},
);

// ─── 8. onDisputeResolved ─────────────────────────────────────────────────────
exports.onDisputeResolved = onCall(
	{ region: "asia-south1" },
	async (request) => {
		await verifyAdmin(request.auth?.uid);
		const { battleId, decision } = request.data;

		const battleRef = db.collection("battles").doc(battleId);
		const battleSnap = await battleRef.get();
		if (!battleSnap.exists())
			throw new HttpsError("not-found", "Battle not found");
		const battle = battleSnap.data();

		await db.runTransaction(async (tx) => {
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
				await createTransaction(
					tx,
					battle.creatorId,
					"refund",
					battle.entryFee,
					cs.data().walletBalance,
					"Dispute refund",
					battleId,
				);
				await createTransaction(
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
				const ws = await tx.get(winnerRef);
				tx.update(winnerRef, {
					walletBalance: FieldValue.increment(battle.prizePool),
					totalWins: FieldValue.increment(1),
				});
				tx.update(db.collection("users").doc(loserId), {
					totalLosses: FieldValue.increment(1),
				});
				tx.update(battleRef, {
					status: "completed",
					adminVerified: true,
					winnerId,
					winnerName,
					result:
						decision === "player1_wins"
							? "creator_won"
							: "joiner_won",
					completedAt: FieldValue.serverTimestamp(),
				});
				await createTransaction(
					tx,
					winnerId,
					"credit",
					battle.prizePool,
					ws.data().walletBalance,
					"Dispute resolved — won",
					battleId,
				);
			}
		});

		const msg = `Admin resolved the dispute: ${decision.replace("_", " ")}`;
		await sendNotification(battle.creatorId, "Dispute Resolved", msg);
		await sendNotification(battle.joinerId, "Dispute Resolved", msg);
		return { success: true };
	},
);
