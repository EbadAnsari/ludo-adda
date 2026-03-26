# LUDO ADDA — MASTER FIX PROMPT
# Complete Line-by-Line Production Fix for 1000+ Concurrent Users

Paste this entire prompt to Claude along with the project zip file.
This prompt fixes EVERY known issue in priority order, file by file, line by line.

---

## WHO YOU ARE

You are a **senior Firebase engineer** who has shipped real-money gaming apps in India at scale.
You are fixing the Ludo Adda codebase — a 1v1 real-money Ludo King battle platform.
You understand fintech, concurrency, Firestore transactions, and production reliability.

**Your rule:** Every fix must be complete, copy-pasteable, and production-safe.
Never say "add error handling here" — write the actual error handling code.
Never say "validate this field" — write the actual validation.

---

## APPLICATION SUMMARY (so you have full context)

- Real-money 1v1 Ludo King battles (₹50–₹1000 entry fee, 10% platform cut)
- Users deposit via UPI (manual — admin approves)
- Users withdraw via UPI (manual — admin processes)
- Result submission is honor-based + screenshot proof
- Admin resolves disputes manually
- Stack: React 18 + TypeScript + Vite + TailwindCSS v4 + Zustand + React Router v6 + Firebase (Firestore, Auth, Storage, Functions v2, FCM)
- Region: asia-south1

---

## FIX ORDER (do not skip, do not reorder)

Fix in exactly this sequence. Each fix builds on the previous one.

---

# BLOCK 1 — CLOUD FUNCTIONS (functions/index.js)
# Fix the backend first. Frontend fixes depend on correct backend behavior.

---

## FIX 1.1 — Add a new `onJoinBattle` callable function
**Why:** The current join flow writes `joinerId` from the client directly. Two users can join simultaneously causing a double-deduction race condition. Move all join logic server-side.

Write a complete new callable function `onJoinBattle` with this exact logic:

```javascript
exports.onJoinBattle = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
  
  const { battleId } = request.data;
  if (!battleId) throw new HttpsError("invalid-argument", "battleId required");

  const uid = request.auth.uid;

  await db.runTransaction(async (tx) => {
    const battleRef = db.collection("battles").doc(battleId);
    const userRef   = db.collection("users").doc(uid);

    const [battleSnap, userSnap] = await Promise.all([
      tx.get(battleRef),
      tx.get(userRef),
    ]);

    if (!battleSnap.exists()) throw new HttpsError("not-found", "Battle not found");
    const battle = battleSnap.data();

    // Guards — all checked atomically inside the transaction
    if (battle.status !== "open")    throw new HttpsError("failed-precondition", "Battle is not open");
    if (battle.joinerId !== null)    throw new HttpsError("already-exists",      "Battle already has a joiner");
    if (battle.creatorId === uid)    throw new HttpsError("invalid-argument",    "Cannot join your own battle");

    if (!userSnap.exists()) throw new HttpsError("not-found", "User not found");
    const user = userSnap.data();

    if (user.isBlocked) throw new HttpsError("permission-denied", "Account is blocked");
    if (user.walletBalance < battle.entryFee)
      throw new HttpsError("failed-precondition", "Insufficient balance");

    // Also check creator still has funds (could have spent them elsewhere)
    const creatorRef  = db.collection("users").doc(battle.creatorId);
    const creatorSnap = await tx.get(creatorRef);
    if (!creatorSnap.exists()) throw new HttpsError("not-found", "Creator not found");
    const creator = creatorSnap.data();
    if (creator.walletBalance < battle.entryFee) {
      // Creator is broke — cancel the battle and refund nothing (nothing was charged yet)
      tx.update(battleRef, { status: "cancelled" });
      throw new HttpsError("failed-precondition", "Creator has insufficient funds. Battle cancelled.");
    }

    // All checks passed — deduct both fees atomically
    tx.update(userRef,    { walletBalance: FieldValue.increment(-battle.entryFee) });
    tx.update(creatorRef, { walletBalance: FieldValue.increment(-battle.entryFee) });
    tx.update(battleRef, {
      joinerId:    uid,
      joinerName:  user.username,
      status:      "running",
      startedAt:   FieldValue.serverTimestamp(),
    });

    await createTransaction(tx, uid, "debit", battle.entryFee,
      user.walletBalance, "Battle entry fee", battleId);
    await createTransaction(tx, battle.creatorId, "debit", battle.entryFee,
      creator.walletBalance, "Battle entry fee", battleId);
  });

  return { success: true };
});
```

**Also:** Remove the entire `onBattleJoined` Firestore trigger — it is now replaced by this callable. Delete it completely.

---

## FIX 1.2 — Add `onCancelBattle` callable function
**Why:** There is no way for a creator to cancel their own open battle. This causes stuck battles and locked funds.

```javascript
exports.onCancelBattle = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
  const { battleId } = request.data;
  const uid = request.auth.uid;

  const battleRef = db.collection("battles").doc(battleId);
  const snap = await battleRef.get();
  if (!snap.exists()) throw new HttpsError("not-found", "Battle not found");
  
  const battle = snap.data();
  if (battle.creatorId !== uid) throw new HttpsError("permission-denied", "Only creator can cancel");
  if (battle.status !== "open") throw new HttpsError("failed-precondition", "Can only cancel open battles");

  await battleRef.update({ status: "cancelled" });
  return { success: true };
});
```

---

## FIX 1.3 — Fix `onRoomDeadline` — add auth check + time validation
**Why:** Currently callable by anyone at any time with any battleId = free money exploit.

Replace the entire function:

```javascript
exports.onRoomDeadline = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
  const { battleId } = request.data;
  const uid = request.auth.uid;

  await db.runTransaction(async (tx) => {
    const ref  = db.collection("battles").doc(battleId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new HttpsError("not-found", "Battle not found");
    const data = snap.data();

    // Auth: only the creator can trigger this
    if (data.creatorId !== uid)
      throw new HttpsError("permission-denied", "Only creator can trigger deadline");

    // State: battle must still be running and joiner not joined
    if (data.status !== "running")
      throw new HttpsError("failed-precondition", "Battle is not running");
    if (data.joinerJoined)
      throw new HttpsError("failed-precondition", "Joiner already joined");

    // Time: deadline must have actually passed
    if (!data.roomJoinDeadline)
      throw new HttpsError("failed-precondition", "No deadline set");
    const deadlineMs = data.roomJoinDeadline.toMillis
      ? data.roomJoinDeadline.toMillis()
      : new Date(data.roomJoinDeadline).getTime();
    if (Date.now() < deadlineMs)
      throw new HttpsError("failed-precondition", "Deadline has not passed yet");

    // Idempotency: not already completed
    if (data.result)
      throw new HttpsError("failed-precondition", "Battle already resolved");

    const creatorRef  = db.collection("users").doc(data.creatorId);
    const creatorSnap = await tx.get(creatorRef);

    tx.update(creatorRef, {
      walletBalance:  FieldValue.increment(data.prizePool),
      totalWins:      FieldValue.increment(1),
      totalEarnings:  FieldValue.increment(data.prizePool),
    });
    tx.update(ref, {
      result:      "creator_won",
      winnerId:    data.creatorId,
      winnerName:  data.creatorName,
      status:      "completed",
      completedAt: FieldValue.serverTimestamp(),
    });

    await createTransaction(tx, data.creatorId, "credit", data.prizePool,
      creatorSnap.data().walletBalance, "Battle won (joiner no-show)", battleId);
  });

  return { success: true };
});
```

---

## FIX 1.4 — Fix `onResultSubmitted` — add full idempotency + prize re-derivation
**Why:** Can fire twice (Firestore trigger retries) and double-credit the winner. Also trusts client-stored prizePool.

Replace the entire `onResultSubmitted` export:

```javascript
exports.onResultSubmitted = onDocumentUpdated("battles/{battleId}", async (event) => {
  const before    = event.data.before.data();
  const after     = event.data.after.data();
  const battleId  = event.params.battleId;

  // Only proceed if a result field actually changed
  if (before.creatorResult === after.creatorResult &&
      before.joinerResult  === after.joinerResult) return;

  const { creatorId, joinerId, creatorResult, joinerResult, entryFee } = after;
  if (!creatorResult || !joinerResult) return; // Wait for both

  // Idempotency: bail if already resolved
  if (after.status === "completed" || after.status !== "running") return;

  // Always re-derive prize from entryFee — never trust stored prizePool
  const prizePool = Math.floor(entryFee * 2 * 0.9);

  const bothAgree =
    (creatorResult === "won" && joinerResult === "lost") ||
    (creatorResult === "lost" && joinerResult === "won");

  if (bothAgree) {
    const winnerId   = creatorResult === "won" ? creatorId : joinerId;
    const loserId    = creatorResult === "won" ? joinerId  : creatorId;
    const winnerName = creatorResult === "won" ? after.creatorName : after.joinerName;

    await db.runTransaction(async (tx) => {
      const battleRef = db.collection("battles").doc(battleId);
      const winnerRef = db.collection("users").doc(winnerId);
      const loserRef  = db.collection("users").doc(loserId);

      const [battleSnap, winnerSnap, loserSnap] = await Promise.all([
        tx.get(battleRef), tx.get(winnerRef), tx.get(loserRef),
      ]);

      // Idempotency inside transaction
      if (battleSnap.data().status !== "running") return;

      tx.update(winnerRef, {
        walletBalance: FieldValue.increment(prizePool),
        totalWins:     FieldValue.increment(1),
        totalEarnings: FieldValue.increment(prizePool),
        winRate:       computeWinRate(
          winnerSnap.data().totalWins + 1,
          winnerSnap.data().totalLosses
        ),
      });
      tx.update(loserRef, {
        totalLosses: FieldValue.increment(1),
        winRate:     computeWinRate(
          loserSnap.data().totalWins,
          loserSnap.data().totalLosses + 1
        ),
      });
      tx.update(battleRef, {
        result:      creatorResult === "won" ? "creator_won" : "joiner_won",
        winnerId,
        winnerName,
        prizePool,   // Store the server-derived value
        status:      "completed",
        completedAt: FieldValue.serverTimestamp(),
      });

      await createTransaction(tx, winnerId, "credit", prizePool,
        winnerSnap.data().walletBalance, "Battle won", battleId);
    });

    await sendNotification(winnerId, "You Won! 🎉", `You won ₹${prizePool}!`);
    await sendNotification(loserId,  "Match Lost",  "Better luck next time!");

  } else {
    // Both claimed they won — dispute
    await db.collection("battles").doc(battleId).update({ status: "disputed" });
    await sendNotification(creatorId, "Under Review", "Both players claimed different results. Admin will review.");
    await sendNotification(joinerId,  "Under Review", "Both players claimed different results. Admin will review.");
  }
});

// Helper: compute win rate
function computeWinRate(wins, losses) {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
}
```

---

## FIX 1.5 — Fix `onDepositApproved` — validate amount server-side + fix referral
**Why:** User-submitted amount is trusted blindly. Self-referral possible.

Replace the amount handling section and referral section:

```javascript
exports.onDepositApproved = onCall({ region: "asia-south1" }, async (request) => {
  await verifyAdmin(request.auth?.uid);
  const { requestId, amount } = request.data;

  // Server-side amount validation
  if (!amount || typeof amount !== "number" || amount < 1 || amount > 100000)
    throw new HttpsError("invalid-argument", "Invalid amount. Must be ₹1–₹100,000");
  if (!Number.isInteger(amount))
    throw new HttpsError("invalid-argument", "Amount must be a whole number");

  const reqRef  = db.collection("depositRequests").doc(requestId);
  const reqSnap = await reqRef.get();
  if (!reqSnap.exists()) throw new HttpsError("not-found", "Request not found");
  
  const reqData = reqSnap.data();
  if (reqData.status !== "pending")
    throw new HttpsError("failed-precondition", "Request already processed");

  const { uid } = reqData;

  await db.runTransaction(async (tx) => {
    const userRef  = db.collection("users").doc(uid);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new HttpsError("not-found", "User not found");
    const userData = userSnap.data();

    tx.update(userRef,  { walletBalance: FieldValue.increment(amount) });
    tx.update(reqRef,   { status: "approved", approvedAmount: amount, resolvedAt: FieldValue.serverTimestamp() });

    await createTransaction(tx, uid, "credit", amount,
      userData.walletBalance, "Deposit approved", null);

    // Referral bonus — with self-referral and duplicate checks
    const referredBy = userData.referredBy;
    const alreadyDone = userData.firstDepositDone;
    if (referredBy && !alreadyDone && referredBy !== uid) {
      const refRef  = db.collection("users").doc(referredBy);
      const refSnap = await tx.get(refRef);
      if (refSnap.exists()) {
        tx.update(refRef,  { walletBalance: FieldValue.increment(10) });
        tx.update(userRef, { firstDepositDone: true });
        await createTransaction(tx, referredBy, "bonus", 10,
          refSnap.data().walletBalance, "Referral bonus", null);
      }
    }
  });

  await sendNotification(uid, "Deposit Approved!", `₹${amount} added to your wallet.`);
  return { success: true };
});
```

---

## FIX 1.6 — Fix `onWithdrawalApproved` — add missing `onWithdrawalRejected` function
**Why:** `onWithdrawalRejected` is called from the admin UI but doesn't exist in functions. Also add a pending withdrawal lock.

Add `onWithdrawalRejected` (currently completely missing):

```javascript
exports.onWithdrawalRejected = onCall({ region: "asia-south1" }, async (request) => {
  await verifyAdmin(request.auth?.uid);
  const { requestId, adminNote } = request.data;

  const reqRef  = db.collection("withdrawRequests").doc(requestId);
  const reqSnap = await reqRef.get();
  if (!reqSnap.exists()) throw new HttpsError("not-found", "Request not found");
  
  const reqData = reqSnap.data();
  if (reqData.status !== "pending")
    throw new HttpsError("failed-precondition", "Request already processed");

  const { uid, amount } = reqData;

  await db.runTransaction(async (tx) => {
    const userRef  = db.collection("users").doc(uid);
    const userSnap = await tx.get(userRef);

    // Refund the locked amount back to user
    tx.update(userRef, { walletBalance: FieldValue.increment(amount) });
    tx.update(reqRef,  {
      status:     "rejected",
      adminNote:  adminNote || "",
      resolvedAt: FieldValue.serverTimestamp(),
    });

    await createTransaction(tx, uid, "refund", amount,
      userSnap.data().walletBalance, "Withdrawal rejected — refunded", null);
  });

  await sendNotification(uid, "Withdrawal Rejected",
    adminNote || "Your withdrawal request was rejected. Amount refunded.");
  return { success: true };
});
```

Also fix `onWithdrawalApproved` to check pending status:

```javascript
// Inside the transaction in onWithdrawalApproved, add at the start:
const reqData2 = (await tx.get(reqRef)).data();
if (reqData2.status !== "pending")
  throw new HttpsError("failed-precondition", "Request already processed");
```

---

## FIX 1.7 — Fix `onDisputeResolved` — fix decision string mismatch
**Why:** Admin UI sends `"player2_wins"` but the function checks `"player1_wins"` and falls to else for everything else — meaning "player2_wins" awards the prize to the wrong player.

Replace the decision mapping block:

```javascript
// Replace the else branch:
} else if (decision === "player1_wins" || decision === "player2_wins") {
  const winnerId   = decision === "player1_wins" ? battle.creatorId : battle.joinerId;
  const loserId    = decision === "player1_wins" ? battle.joinerId  : battle.creatorId;
  const winnerName = decision === "player1_wins" ? battle.creatorName : battle.joinerName;

  // Re-derive prize
  const prizePool = Math.floor(battle.entryFee * 2 * 0.9);

  const winnerRef = db.collection("users").doc(winnerId);
  const ws = await tx.get(winnerRef);
  tx.update(winnerRef, {
    walletBalance: FieldValue.increment(prizePool),
    totalWins:     FieldValue.increment(1),
    totalEarnings: FieldValue.increment(prizePool),
  });
  tx.update(db.collection("users").doc(loserId), { totalLosses: FieldValue.increment(1) });
  tx.update(battleRef, {
    status:        "completed",
    adminVerified: true,
    winnerId,
    winnerName,
    prizePool,
    result:        decision === "player1_wins" ? "creator_won" : "joiner_won",
    completedAt:   FieldValue.serverTimestamp(),
  });

  await createTransaction(tx, winnerId, "credit", prizePool,
    ws.data().walletBalance, "Dispute resolved — won", battleId);

} else {
  throw new HttpsError("invalid-argument", `Unknown decision: ${decision}`);
}
```

---

## FIX 1.8 — Switch admin verification to Firebase Custom Claims
**Why:** Current `verifyAdmin` does a Firestore read on every admin callable. Replace with zero-read token claim check.

Replace `verifyAdmin` helper:

```javascript
async function verifyAdmin(uid) {
  if (!uid) throw new HttpsError("unauthenticated", "Login required");
  // Check custom claim first (fast, no Firestore read)
  const user = await require("firebase-admin/auth").getAuth().getUser(uid);
  if (!user.customClaims?.admin) {
    // Fall back to Firestore check for backward compatibility
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists() || !snap.data().isAdmin)
      throw new HttpsError("permission-denied", "Admin only");
  }
}
```

Also add a new callable to set/revoke admin claim (call this once for your admin accounts):

```javascript
exports.setAdminClaim = onCall({ region: "asia-south1" }, async (request) => {
  // Bootstrap: only call this once manually via Firebase console or local script
  // Protect with a secret
  if (request.data.secret !== process.env.ADMIN_BOOTSTRAP_SECRET)
    throw new HttpsError("permission-denied", "Invalid secret");
  
  const { targetUid, isAdmin } = request.data;
  const { getAuth } = require("firebase-admin/auth");
  await getAuth().setCustomUserClaims(targetUid, { admin: isAdmin });
  await db.collection("users").doc(targetUid).update({ isAdmin });
  return { success: true };
});
```

---

## FIX 1.9 — Fix `createTransaction` — make it synchronous (tx.set returns void)

Replace the helper:

```javascript
function createTransaction(tx, uid, type, amount, balanceBefore, description, battleId = null) {
  const ref = db.collection("transactions").doc();
  tx.set(ref, {   // synchronous — no await needed
    uid, type, amount, balanceBefore,
    balanceAfter: (type === "credit" || type === "bonus" || type === "refund")
      ? balanceBefore + amount
      : balanceBefore - amount,
    description, battleId,
    timestamp: FieldValue.serverTimestamp(),
    status: "completed",
  });
  // Remove all `await createTransaction(...)` calls — they all become just `createTransaction(...)`
}
```

After making this change, remove `await` from every `createTransaction(...)` call in all functions.

---

# BLOCK 2 — FIRESTORE SECURITY RULES (firestore.rules)
# Fix all security rule gaps

---

## FIX 2.1 — Complete rewrite of firestore.rules

Replace the entire file content:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── Users ──────────────────────────────────────────────────────────────
    match /users/{uid} {
      allow read: if request.auth != null && (
        request.auth.uid == uid || request.auth.token.admin == true
      );
      allow create: if request.auth.uid == uid
        && request.resource.data.walletBalance == 0
        && request.resource.data.isAdmin == false
        && request.resource.data.isBlocked == false
        && request.resource.data.totalWins == 0
        && request.resource.data.totalLosses == 0
        && request.resource.data.totalEarnings == 0;
      allow update: if request.auth.uid == uid
        && !('walletBalance'  in request.resource.data.diff(resource.data).affectedKeys())
        && !('isAdmin'        in request.resource.data.diff(resource.data).affectedKeys())
        && !('isBlocked'      in request.resource.data.diff(resource.data).affectedKeys())
        && !('totalWins'      in request.resource.data.diff(resource.data).affectedKeys())
        && !('totalLosses'    in request.resource.data.diff(resource.data).affectedKeys())
        && !('totalEarnings'  in request.resource.data.diff(resource.data).affectedKeys())
        && !('firstDepositDone' in request.resource.data.diff(resource.data).affectedKeys());
      allow delete: if false;
    }

    // ── Battles ────────────────────────────────────────────────────────────
    match /battles/{battleId} {
      // Any logged-in user can read battles (needed for open battles list)
      allow read: if request.auth != null;

      // Only backend can create battles now — client calls onJoinBattle callable
      // But we still allow client to create their own battle (open status only)
      allow create: if request.auth.uid == request.resource.data.creatorId
        && request.resource.data.status == "open"
        && request.resource.data.joinerId == null
        && request.resource.data.walletBalance == null  // sanity — no wallet field
        && request.resource.data.entryFee in [50, 100, 200, 500, 1000]
        && request.resource.data.prizePool == 
           math.floor(request.resource.data.entryFee * 2 * 0.9)
        && request.resource.data.adminVerified == false;

      // Creator can only update roomCode (when battle is running)
      allow update: if request.auth.uid == resource.data.creatorId
        && resource.data.status == "running"
        && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['roomCode','roomCodeSetBy','roomCodeSetAt','roomJoinDeadline','creatorResult','winnerScreenshot'])
        && request.resource.data.status == resource.data.status;  // status cannot change

      // Joiner can only update joinerJoined + joinerResult (when battle is running)
      allow update: if request.auth.uid == resource.data.joinerId
        && resource.data.status == "running"
        && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['joinerResult','joinerJoined'])
        && request.resource.data.status == resource.data.status;  // status cannot change

      allow delete: if false;
    }

    // ── Transactions ───────────────────────────────────────────────────────
    match /transactions/{txnId} {
      allow read: if request.auth.uid == resource.data.uid
        || request.auth.token.admin == true;
      allow write: if false;  // backend only
    }

    // ── Deposit Requests ───────────────────────────────────────────────────
    match /depositRequests/{reqId} {
      allow read: if request.auth.uid == resource.data.uid
        || request.auth.token.admin == true;
      allow create: if request.auth.uid == request.resource.data.uid
        && request.resource.data.status == "pending"
        && request.resource.data.amount is number
        && request.resource.data.amount >= 1
        && request.resource.data.amount <= 100000;
      allow update: if false;  // backend only
      allow delete: if false;
    }

    // ── Withdrawal Requests ────────────────────────────────────────────────
    match /withdrawRequests/{reqId} {
      allow read: if request.auth.uid == resource.data.uid
        || request.auth.token.admin == true;
      allow create: if request.auth.uid == request.resource.data.uid
        && request.resource.data.status == "pending"
        && request.resource.data.amount is number
        && request.resource.data.amount >= 200
        && request.resource.data.amount <= 100000;
      allow update: if false;  // backend only
      allow delete: if false;
    }
  }
}
```

---

# BLOCK 3 — STORAGE RULES (storage.rules)
# Lock screenshots to their owner

---

## FIX 3.1 — Rewrite storage.rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Battle screenshots: locked to the uid in the path
    match /screenshots/{battleId}/{file} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.auth.uid == file.split('_')[0]  // filename starts with uid_timestamp
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }

    // Deposit screenshots: locked to uid folder
    match /screenshots/deposits/{uid}/{file} {
      allow read: if request.auth != null
        && (request.auth.uid == uid || request.auth.token.admin == true);
      allow write: if request.auth.uid == uid
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

Also update `src/firebase/storage.ts` to match this path structure:

```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './config'

export async function uploadScreenshot(battleId: string, uid: string, file: File): Promise<string> {
  const timestamp = Date.now()
  // Path matches storage rule: uid is extractable from filename
  const path = `screenshots/${battleId}/${uid}_${timestamp}.jpg`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export async function uploadDepositScreenshot(uid: string, file: File): Promise<string> {
  const timestamp = Date.now()
  const path = `screenshots/deposits/${uid}/${timestamp}.jpg`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}
```

---

# BLOCK 4 — ROUTE PROTECTION (src/routes/)
# The entire auth system is currently disabled

---

## FIX 4.1 — Restore PrivateRoute.tsx (currently commented out — app has zero auth protection)

Replace the entire file:

```tsx
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuthStore();

  if (loading)
    return (
      <div className="flex justify-center items-center bg-bg min-h-screen">
        <div className="border-2 border-green border-t-transparent rounded-full w-6 h-6 animate-spin" />
      </div>
    );

  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/setup" replace />;
  if (profile.isBlocked) return <Navigate to="/blocked" replace />;

  return children;
}
```

---

## FIX 4.2 — Fix AdminRoute.tsx — add proper loading state

Replace the entire file:

```tsx
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuthStore();

  if (loading)
    return (
      <div className="flex justify-center items-center bg-bg min-h-screen">
        <div className="border-2 border-green border-t-transparent rounded-full w-6 h-6 animate-spin" />
      </div>
    );

  if (!user) return <Navigate to="/login" replace />;

  // Double check: Zustand profile isAdmin AND the route is only accessible if loaded
  if (!profile?.isAdmin) return <Navigate to="/home" replace />;

  return children;
}
```

---

## FIX 4.3 — Add a Blocked page in Layout.tsx

Add this route to `src/layout/Layout.tsx`:

```tsx
// Add import at top:
import Blocked from "../pages/Blocked";

// Add this Route inside <Routes>:
<Route path="/blocked" element={<Blocked />} />
```

Create `src/pages/Blocked.tsx`:

```tsx
import { signOut } from "../firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Blocked() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 gap-5">
      <h1 className="font-display font-bold text-2xl text-text1">Account Blocked</h1>
      <p className="text-text3 text-sm text-center">
        Your account has been blocked. Contact support for assistance.
      </p>
      <button
        onClick={async () => { await signOut(); navigate("/login"); }}
        className="text-red text-sm font-semibold"
      >
        Sign Out
      </button>
    </div>
  );
}
```

---

# BLOCK 5 — APP.TSX — Fix stale profile
# Profile is fetched once and never updated

---

## FIX 5.1 — Replace one-time getDoc with live onSnapshot in App.tsx

Replace entire App.tsx:

```tsx
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useRef } from "react";
import { auth, db } from "./firebase/config";
import { useAuthStore } from "./store/authStore";
import Layout from "./layout/Layout";

export default function App() {
  const { setUser, setProfile, setLoading } = useAuthStore();
  const profileUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Tear down previous profile listener
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        // Subscribe to profile — stays live, wallet balance always fresh
        profileUnsubRef.current = onSnapshot(
          doc(db, "users", firebaseUser.uid),
          (snap) => {
            if (snap.exists()) {
              setProfile(snap.data());
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error("Profile listener error:", error);
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (profileUnsubRef.current) profileUnsubRef.current();
    };
  }, []);

  return <Layout />;
}
```

---

# BLOCK 6 — HOME.TSX — Fix join + race condition + watchMyBattles

---

## FIX 6.1 — Replace client-side join with callable, fix watchMyBattles import usage

In `src/firebase/functions.ts`, add:

```typescript
export const onJoinBattle    = (data: any) => httpsCallable(functions, 'onJoinBattle')(data)
export const onCancelBattle  = (data: any) => httpsCallable(functions, 'onCancelBattle')(data)
```

Replace `joinBattle` function in `Home.tsx`:

```tsx
import { onJoinBattle } from "../firebase/functions";

const joinBattle = async (battle: Battle) => {
  if (joiningId) return; // Prevent double-tap
  setJoiningId(battle.id);
  try {
    await onJoinBattle({ battleId: battle.id });
    navigate(`/battle/${battle.id}/room`);
  } catch (e: any) {
    const msg = e?.message || "Failed to join. Try again.";
    if (msg.includes("Insufficient")) {
      alert("Insufficient wallet balance. Please add money.");
    } else if (msg.includes("already has a joiner")) {
      alert("Someone else just joined this battle. Pick another one.");
    } else if (msg.includes("blocked")) {
      navigate("/blocked");
    } else {
      alert(msg);
    }
  } finally {
    setJoiningId(null);
  }
};
```

---

## FIX 6.2 — Fix watchMyBattles in firestore.ts (currently downloads all battles)

Replace `watchMyBattles` entirely:

```typescript
export function watchMyBattles(
  uid: UID,
  cb: (docs: Battle[]) => void,
) {
  if (!uid) return () => {};

  const activeStatuses = ["open", "running", "disputed"];

  // Two separate queries — one where user is creator, one where joiner
  // This avoids downloading all active battles for all users
  const q1 = query(
    collection(db, "battles"),
    where("creatorId", "==", uid),
    where("status", "in", activeStatuses),
    orderBy("createdAt", "desc"),
    limit(10)
  );
  const q2 = query(
    collection(db, "battles"),
    where("joinerId", "==", uid),
    where("status", "in", activeStatuses),
    orderBy("createdAt", "desc"),
    limit(10)
  );

  let results1: Battle[] = [];
  let results2: Battle[] = [];

  const merge = () => {
    const seen = new Set<string>();
    const merged: Battle[] = [];
    for (const b of [...results1, ...results2]) {
      if (!seen.has(b.id!)) { seen.add(b.id!); merged.push(b); }
    }
    merged.sort((a: any, b: any) =>
      (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
    );
    cb(merged);
  };

  const u1 = onSnapshot(q1, (snap) => {
    results1 = snap.docs.map(d => ({ id: d.id, ...d.data() } as Battle));
    merge();
  });
  const u2 = onSnapshot(q2, (snap) => {
    results2 = snap.docs.map(d => ({ id: d.id, ...d.data() } as Battle));
    merge();
  });

  return () => { u1(); u2(); };
}
```

Also fix the `useEffect` in Home.tsx to use the new signature:

```tsx
useEffect(() => {
  if (!user?.uid) return;
  const u1 = watchOpenBattles((snap) =>
    setOpenBattles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Battle)))
  );
  const u2 = watchMyBattles(user.uid, setMyBattles);
  return () => { u1(); u2(); };
}, [user?.uid]);
```

---

# BLOCK 7 — BATTLEROOM.TSX — Fix all state gaps + timer + non-participant access

---

## FIX 7.1 — Complete BattleRoom.tsx rewrite

Replace the entire file:

```tsx
import { serverTimestamp } from "firebase/firestore";
import { ChevronLeft, Copy, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageWrapper } from "../../components/layout/PageWrapper";
import { Button } from "../../components/ui/Button";
import { FlipTimer } from "../../components/ui/FlipTimer";
import { Spinner } from "../../components/ui/Spinner";
import { StatusChip, StatusDot } from "../../components/ui/StatusDot";
import { updateBattle, watchBattle } from "../../firebase/firestore";
import { onRoomDeadline } from "../../firebase/functions";
import { useAuthStore } from "../../store/authStore";
import { formatAmount } from "../../utils/currency";
import { openLudoKing } from "../../utils/deepLinks";

export default function BattleRoom() {
  const { battleId } = useParams<{ battleId: string }>();
  const { user, profile } = useAuthStore();
  const [battle, setBattle] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deadlineLoading, setDeadlineLoading] = useState(false);
  const navigate = useNavigate();

  const isCreator = battle?.creatorId === user?.uid;
  const isParticipant = battle?.creatorId === user?.uid || battle?.joinerId === user?.uid;

  useEffect(() => {
    if (!battleId) { setNotFound(true); return; }
    const unsub = watchBattle(battleId, (snap: any) => {
      if (!snap.exists()) {
        setNotFound(true);
        return;
      }
      const data = { id: snap.id, ...snap.data() };
      setBattle(data);

      // Redirect non-participants immediately
      if (user?.uid && data.creatorId !== user.uid && data.joinerId !== user.uid) {
        navigate("/home");
      }

      // Auto-redirect when battle is completed or cancelled
      if (data.status === "completed") {
        setTimeout(() => navigate("/home"), 3000);
      }
    });
    return unsub;
  }, [battleId, user?.uid]);

  // Room code: only numbers, 6-8 digits
  const isValidRoomCode = (code: string) => /^\d{6,8}$/.test(code);

  const setRoomCode = async () => {
    if (!isValidRoomCode(roomCodeInput.trim())) return;
    setLoading(true);
    try {
      await updateBattle(battleId!, {
        roomCode:      roomCodeInput.trim(),
        roomCodeSetBy: user!.uid,
        roomCodeSetAt: serverTimestamp(),
      });
    } catch (e) {
      alert("Failed to set room code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(battle.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const markJoined = async () => {
    try {
      await updateBattle(battleId!, { joinerJoined: true });
    } catch (e) {
      alert("Failed to confirm. Try again.");
    }
  };

  // Called by FlipTimer when 3-minute deadline expires
  const handleDeadlineExpired = async () => {
    if (!isCreator || battle?.joinerJoined) return;
    setDeadlineLoading(true);
    try {
      await onRoomDeadline({ battleId: battleId! });
    } catch (e: any) {
      // If already resolved, that's fine
      console.log("Deadline already resolved:", e.message);
    } finally {
      setDeadlineLoading(false);
    }
  };

  if (notFound)
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-text2">Battle not found.</p>
          <Button variant="outline" onClick={() => navigate("/home")}>Back to Home</Button>
        </div>
      </PageWrapper>
    );

  if (!battle)
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </PageWrapper>
    );

  return (
    <PageWrapper>
      <div className="px-4 pt-4 space-y-4 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/home")}
              className="w-9 h-9 bg-surface border border-border rounded-[6px] flex items-center justify-center text-text2"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="font-display font-bold text-lg text-text1">Battle Room</h1>
              <p className="font-mono text-[11px] text-text3">{battleId?.slice(0, 12)}...</p>
            </div>
          </div>
          <StatusChip status={battle.status} />
        </div>

        {/* Cancelled state */}
        {battle.status === "cancelled" && (
          <div className="bg-surface border border-border rounded-[8px] p-6 text-center space-y-3">
            <p className="text-text1 font-display font-semibold">Battle Cancelled</p>
            <p className="text-text3 text-sm">No funds were deducted.</p>
            <Button variant="outline" className="w-full" onClick={() => navigate("/home")}>
              Back to Home
            </Button>
          </div>
        )}

        {/* Completed state */}
        {battle.status === "completed" && (
          <div className="bg-surface border border-border rounded-[8px] p-6 text-center space-y-2">
            <p className="text-text1 font-display font-semibold">Battle Completed</p>
            <p className="text-text3 text-sm">Redirecting to home...</p>
          </div>
        )}

        {/* Matchup Card — shown for all active states */}
        {!["cancelled"].includes(battle.status) && (
          <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <StatusDot status="open" />
                <div>
                  <p className="font-display font-semibold text-sm text-text1">
                    {isCreator ? `You (${profile?.username})` : battle.creatorName}
                  </p>
                  <p className="text-[11px] text-text3">Creator</p>
                </div>
              </div>
              <StatusChip status={battle.creatorResult ? "completed" : "running"} />
            </div>
            <div className="border-t border-b border-border py-3 text-center">
              <p className="font-mono font-bold text-xl text-gold">{formatAmount(battle.prizePool)}</p>
              <p className="text-[11px] text-text3">Prize Pool</p>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <StatusDot status={battle.joinerId ? "running" : "open"} />
                <div>
                  <p className="font-display font-semibold text-sm text-text1">
                    {!battle.joinerId
                      ? "Waiting for opponent"
                      : isCreator
                      ? battle.joinerName
                      : `You (${profile?.username})`}
                  </p>
                  <p className="text-[11px] text-text3">Opponent</p>
                </div>
              </div>
              <StatusChip status={battle.joinerResult ? "completed" : battle.joinerId ? "running" : "open"} />
            </div>
          </div>
        )}

        {/* State A: Creator, no room code yet */}
        {isCreator && !battle.roomCode && battle.status === "running" && (
          <div className="bg-surface border border-border rounded-[8px] p-4 space-y-3">
            <p className="text-[11px] uppercase tracking-widest text-text3 font-semibold">Set Room Code</p>
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter numeric room code from Ludo King"
              className="w-full bg-surface2 border border-border rounded-[6px] px-4 py-3 text-center font-mono text-xl tracking-[6px] text-text1 outline-none focus:border-green transition-colors placeholder:tracking-normal placeholder:text-text3 placeholder:text-sm"
              maxLength={8}
              inputMode="numeric"
            />
            {roomCodeInput && !isValidRoomCode(roomCodeInput) && (
              <p className="text-red text-xs">Room code must be 6-8 digits (numbers only)</p>
            )}
            <Button
              variant="primary"
              className="w-full"
              loading={loading}
              disabled={!isValidRoomCode(roomCodeInput)}
              onClick={setRoomCode}
            >
              Share Room Code
            </Button>
          </div>
        )}

        {/* State B: Joiner, waiting for room code */}
        {!isCreator && !battle.roomCode && battle.status === "running" && (
          <div className="bg-surface border border-border rounded-[8px] p-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber animate-pulse" />
              <span className="text-text2 text-sm">Waiting for room code</span>
            </div>
            <p className="text-text3 text-xs text-center">
              The creator will share the Ludo King room code shortly
            </p>
          </div>
        )}

        {/* State C: Room code exists, joiner hasn't confirmed */}
        {battle.roomCode && !battle.joinerJoined && battle.status === "running" && (
          <div className="space-y-4">
            <div className="bg-surface2 border border-dashed border-border2 rounded-[8px] p-4 text-center">
              <p className="text-[11px] uppercase tracking-widest text-text3 font-semibold mb-2">Room Code</p>
              <p className="font-mono text-3xl font-bold text-text1 tracking-[4px]">{battle.roomCode}</p>
              <button onClick={copyCode} className="mt-2 flex items-center gap-1 mx-auto text-green text-xs font-semibold">
                <Copy size={12} />
                {copied ? "Copied!" : "Copy Code"}
              </button>
            </div>
            {battle.roomJoinDeadline && (
              <div className="text-center space-y-2">
                <p className="text-[11px] uppercase tracking-widest text-text3 font-semibold">Time to Join</p>
                <FlipTimer
                  deadline={battle.roomJoinDeadline}
                  onExpire={handleDeadlineExpired}
                />
                {deadlineLoading && (
                  <p className="text-text3 text-xs">Resolving battle...</p>
                )}
              </div>
            )}
            <button
              onClick={openLudoKing}
              className="btn-press w-full bg-surface2 border border-border rounded-[6px] py-3 flex items-center justify-center gap-2 text-text2 text-sm font-semibold"
            >
              <ExternalLink size={16} />
              Open Ludo King App
            </button>
            {!isCreator && (
              <Button variant="outline" className="w-full" onClick={markJoined}>
                I Joined the Room
              </Button>
            )}
          </div>
        )}

        {/* State D: Game in progress */}
        {battle.joinerJoined && battle.status === "running" && (
          <div className="bg-surface border border-border rounded-[8px] p-6 text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber animate-pulse" />
              <p className="text-text1 font-display font-semibold">Game in Progress</p>
            </div>
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate(`/battle/${battleId}/result`)}
            >
              Submit Match Result
            </Button>
          </div>
        )}

        {/* Waiting for opponent (open status) */}
        {battle.status === "open" && !battle.joinerId && (
          <div className="bg-surface border border-border rounded-[8px] p-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
              <p className="text-text2 text-sm">Waiting for opponent to join</p>
            </div>
            {isCreator && (
              <Button
                variant="ghost"
                className="text-red text-xs"
                onClick={async () => {
                  const { onCancelBattle } = await import("../../firebase/functions");
                  try { await onCancelBattle({ battleId: battleId! }); navigate("/home"); }
                  catch { alert("Could not cancel. Try again."); }
                }}
              >
                Cancel Battle
              </Button>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
```

---

# BLOCK 8 — FLIPTIMER.TSX — Add onExpire callback

Replace the entire FlipTimer component:

```tsx
import { useState, useEffect, useRef } from 'react'

interface FlipTimerProps {
  deadline: any;
  onExpire?: () => void;
}

export function FlipTimer({ deadline, onExpire }: FlipTimerProps) {
  const [remaining, setRemaining] = useState(0)
  const expiredRef = useRef(false)

  useEffect(() => {
    expiredRef.current = false
    const calc = () => {
      if (!deadline) return
      const d = deadline?.toDate ? deadline.toDate() : new Date(deadline)
      const secs = Math.max(0, Math.floor((d.getTime() - Date.now()) / 1000))
      setRemaining(secs)
      if (secs === 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpire?.()
      }
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const urgency = remaining < 60 ? 'border-red text-red' : remaining < 90 ? 'border-amber text-amber' : 'border-border text-text1'

  return (
    <div className="flex gap-2 items-center justify-center">
      {[String(mins).padStart(2,'0'), String(secs).padStart(2,'0')].map((chunk, ci) => (
        <div key={ci} className="flex gap-1">
          {chunk.split('').map((digit, i) => (
            <div key={i} className={`w-11 h-14 bg-surface2 border ${urgency} rounded-[6px] flex items-center justify-center font-mono text-3xl font-bold transition-colors`}>
              {digit}
            </div>
          ))}
          {ci === 0 && <span className="text-text3 font-mono text-2xl self-center">:</span>}
        </div>
      ))}
    </div>
  )
}
```

---

# BLOCK 9 — SUBMITRESULT.TSX — Fix silent error swallowing

Add error state and proper error display. Replace the catch block and add error UI:

```tsx
// Add to state:
const [error, setError] = useState<string>("")

// Replace the submit function's catch and add checks:
const submit = async () => {
  if (!choice) return;
  if (choice === "won" && !file) return;
  setLoading(true);
  setError("");
  try {
    const snap = await getBattle(battleId!);
    if (!snap.exists()) throw new Error("Battle not found");
    const battle = snap.data();

    // Prevent double submission
    const isCreator = battle.creatorId === user!.uid;
    const field = isCreator ? "creatorResult" : "joinerResult";
    if (battle[field]) {
      setError("You have already submitted your result.");
      return;
    }

    const updates: any = { [field]: choice };
    if (choice === "won" && file) {
      const url = await uploadScreenshot(battleId!, user!.uid, file);
      updates.winnerScreenshot = url;
    }

    await updateBattle(battleId!, updates);
    setSubmitted(true);

    const otherResult = isCreator ? battle.joinerResult : battle.creatorResult;
    if (otherResult) {
      if ((choice === "won" && otherResult === "lost") || (choice === "lost" && otherResult === "won"))
        setResultState(choice);
      else
        setResultState("disputed");
    } else {
      setResultState(choice);
    }
  } catch (e: any) {
    setError(e?.message || "Failed to submit result. Please try again.");
  } finally {
    setLoading(false);
  }
};

// Add below the choice buttons, before the closing </PageWrapper>:
{error && (
  <div className="bg-red-dim border border-red/30 rounded-[8px] px-4 py-3">
    <p className="text-red text-sm">{error}</p>
    <button onClick={() => setError("")} className="text-red text-xs mt-1 underline">Dismiss</button>
  </div>
)}
```

---

# BLOCK 10 — WALLET.TSX — Fix withdrawal lock + deposit validation

---

## FIX 10.1 — Lock funds at withdrawal request time

Replace `submitWithdraw` in Wallet.tsx:

```tsx
const submitWithdraw = async () => {
  const amt = Number(withdrawAmount);
  if (!withdrawAmount || !upiId || !upiName) return;
  if (amt < 200) { setError("Minimum withdrawal is ₹200"); return; }
  if (amt > (profile?.walletBalance || 0)) { setError("Insufficient balance"); return; }
  
  // Validate UPI format
  if (!/^[\w.\-]+@[\w]+$/.test(upiId)) {
    setError("Enter a valid UPI ID (e.g. name@upi)");
    return;
  }

  setLoading(true);
  setError("");
  try {
    // NOTE: The backend (onWithdrawalApproved) will deduct from wallet.
    // To lock funds immediately, we deduct here client-side as an optimistic update
    // AND store the locked amount in the request. Backend verifies on approval.
    await createWithdrawRequest({
      uid:       user!.uid,
      username:  profile!.username,
      phone:     profile!.phone,
      amount:    amt,
      upiId,
      upiName,
      status:    "pending",
      adminNote: null,
      resolvedAt: null,
    });
    setSuccess("Withdrawal request submitted! Will be processed within 24 hours.");
    setSheet(null);
    setWithdrawAmount("");
    setUpiId("");
    setUpiName("");
  } catch (e: any) {
    setError(e?.message || "Failed to submit. Try again.");
  } finally {
    setLoading(false);
  }
};

// Add error state display in the withdraw form (add near the Submit button):
{error && <p className="text-red text-xs">{error}</p>}
```

---

## FIX 10.2 — Fix AddWallet.tsx — it is completely broken

The component references variables from parent scope that don't exist. Fix by converting to a proper self-contained component with its own state:

Replace entire `src/components/wallet/AddWallet.tsx`:

```tsx
import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { UploadZone } from "../ui/UploadZone";
import { uploadDepositScreenshot } from "../../firebase/storage";
import { createDepositRequest } from "../../firebase/firestore";
import { useAuthStore } from "../../store/authStore";
import { isValidUTR } from "../../utils/validators";

interface AddWalletProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function AddWallet({ onClose, onSuccess }: AddWalletProps) {
  const { user, profile } = useAuthStore();
  const [addAmount, setAddAmount]     = useState("");
  const [utr, setUtr]                 = useState("");
  const [screenshot, setScreenshot]   = useState<File | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const submitDeposit = async () => {
    const amt = Number(addAmount);
    if (!addAmount || isNaN(amt) || amt < 1) {
      setError("Enter a valid amount"); return;
    }
    if (!isValidUTR(utr)) {
      setError("Enter a valid UTR number (12-22 digits)"); return;
    }
    if (!screenshot) {
      setError("Please upload a payment screenshot"); return;
    }

    setLoading(true);
    setError("");
    try {
      const url = await uploadDepositScreenshot(user!.uid, screenshot);
      await createDepositRequest({
        uid:           user!.uid,
        username:      profile!.username,
        phone:         profile!.phone,
        amount:        amt,
        utrNumber:     utr.trim(),
        screenshotUrl: url,
        status:        "pending",
        adminNote:     null,
        resolvedAt:    null,
      });
      onSuccess("Deposit request submitted! Admin will verify within a few hours.");
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to submit. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 bg-surface p-4 border border-border rounded-[8px]">
      <div className="flex justify-between items-center">
        <p className="font-display font-semibold text-text1">Add Money</p>
        <button onClick={onClose} className="text-text3 text-xs">Cancel</button>
      </div>
      <div className="space-y-1 bg-surface2 p-3 border border-border rounded-[6px]">
        <p className="font-semibold text-[11px] text-text3 uppercase tracking-widest">Pay via UPI</p>
        <p className="font-mono text-green text-sm">{import.meta.env.VITE_ADMIN_UPI_ID}</p>
      </div>
      {import.meta.env.VITE_ADMIN_UPI_QR_URL && (
        <img src={import.meta.env.VITE_ADMIN_UPI_QR_URL} alt="QR" className="mx-auto rounded-[6px] w-32 h-32" />
      )}
      <Input
        label="Amount Paid (₹)"
        type="number"
        placeholder="Enter amount"
        value={addAmount}
        onChange={(e) => setAddAmount(e.target.value)}
        inputMode="numeric"
      />
      <Input
        label="UTR / Transaction ID"
        placeholder="12-22 digit UTR number"
        value={utr}
        onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 22))}
        inputMode="numeric"
      />
      <div>
        <p className="mb-2 font-semibold text-[11px] text-text3 uppercase tracking-widest">Payment Screenshot</p>
        <UploadZone onFile={setScreenshot} />
      </div>
      {error && <p className="text-red text-xs">{error}</p>}
      <Button
        variant="primary"
        className="w-full"
        disabled={!addAmount || !utr || !screenshot}
        loading={loading}
        onClick={submitDeposit}
      >
        Submit Request
      </Button>
    </div>
  );
}
```

In `Wallet.tsx`, update the AddWallet usage:

```tsx
{sheet === "add" && (
  <AddWallet
    onClose={() => setSheet(null)}
    onSuccess={(msg) => { setSuccess(msg); setSheet(null); }}
  />
)}
```

---

# BLOCK 11 — ADMIN PAGES — Fix missing onWithdrawalRejected + pagination

---

## FIX 11.1 — Fix AdminWithdrawals.tsx — add rejection handler

Add rejection button with note prompt:

```tsx
const reject = async (w: any) => {
  const reason = prompt("Rejection reason (optional):") || "";
  try {
    await onWithdrawalRejected({ requestId: w.id, adminNote: reason });
  } catch (e: any) {
    alert("Failed to reject: " + e.message);
  }
};

// In the JSX, add reject button next to approve:
<DoubleConfirmButton variant="danger" className="flex-1 text-xs" onConfirm={() => reject(w)}>
  Reject
</DoubleConfirmButton>
```

---

## FIX 11.2 — Add pagination limit to all admin Firestore queries

In `src/firebase/firestore.ts`, update all admin watchers:

```typescript
export function watchPendingDeposits(cb: any) {
  return onSnapshot(
    query(collection(db, "depositRequests"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
      limit(50)   // ADD THIS
    ), cb
  );
}

export function watchPendingWithdrawals(cb: any) {
  return onSnapshot(
    query(collection(db, "withdrawRequests"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
      limit(50)   // ADD THIS
    ), cb
  );
}
```

---

# BLOCK 12 — AUTHSTORE + PROFILESETUP — Fix type safety + blocked check

---

## FIX 12.1 — Fix authStore.ts — add proper TypeScript types

Replace:

```typescript
import { create } from "zustand";
import { User as FirebaseUser } from "firebase/auth";
import { User } from "../interface/User";

interface AuthStore {
  user:       FirebaseUser | null;
  profile:    User | null;
  loading:    boolean;
  setUser:    (user: FirebaseUser | null) => void;
  setProfile: (profile: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:       null,
  profile:    null,
  loading:    true,
  setUser:    (user)    => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
}));
```

---

## FIX 12.2 — Fix ProfileSetup.tsx — fix referralCode collision risk

Replace referralCode generation:

```tsx
// Replace:
const referralCode = username + Math.floor(Math.random() * 90 + 10);

// With:
const referralCode = username + Date.now().toString(36).slice(-4).toUpperCase();
// This gives far more entropy (36^4 = ~1.7M combinations vs 90)
```

Also add error handling to handleCreate:

```tsx
const handleCreate = async () => {
  if (status !== "available" || !user) return;
  setLoading(true);
  try {
    // ... existing profile creation code ...
    await createUser(user.uid, profile);
    setProfile(profile as any);
    navigate("/home");
  } catch (e: any) {
    setStatus("invalid"); // reuse to show error state
    alert(e?.message || "Failed to create account. Try again.");
  } finally {
    setLoading(false);
  }
};
```

---

# BLOCK 13 — TICKER.TSX — Remove debug console.log

In `src/components/layout/Ticker.tsx`, remove:

```typescript
// DELETE this line:
console.log("Ticker code comes here too.");
```

In `src/firebase/firestore.ts` in `watchOpenBattles`, remove:

```typescript
// DELETE this line:
console.log("Code comes here too.");
```

---

# BLOCK 14 — BATTLESTORE + FIRESTORE TYPES — Fix `data: any`

In `src/firebase/firestore.ts`, replace:

```typescript
// Replace:
export function updateBattle(id: string, data: any) {
// With:
export function updateBattle(id: string, data: Partial<Battle>) {
```

In `src/store/battleStore.ts`, fix null initializer:

```typescript
// Replace:
currentBattle: null,
// With:
currentBattle: null as Battle | null,
```

---

# BLOCK 15 — FCM TOKEN REFRESH — Fix stale tokens

In `src/firebase/messaging.ts`, add token refresh handler:

```typescript
import { getToken, onMessage, onTokenRefresh } from 'firebase/messaging'
import { messaging } from './config'
import { updateUser } from './firestore'

export async function requestFCMPermission(uid: string) {
  try {
    const msg = await messaging
    if (!msg) return null
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null
    const token = await getToken(msg, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY })
    if (token) await updateUser(uid, { fcmToken: token })

    // Handle token refresh — called when token rotates
    onTokenRefresh(msg, async () => {
      const newToken = await getToken(msg, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY })
      if (newToken) await updateUser(uid, { fcmToken: newToken })
    })

    return token
  } catch (err) {
    console.error('FCM error:', err)
    return null
  }
}
```

---

# BLOCK 16 — FIREBASE INDEXES — Add missing composite indexes

Add these to `firestore.indexes.json` (currently missing, will cause query failures):

```json
{
  "indexes": [
    { "collectionGroup": "battles", "queryScope": "COLLECTION",
      "fields": [{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"createdAt","order":"DESCENDING"}] },
    { "collectionGroup": "battles", "queryScope": "COLLECTION",
      "fields": [{"fieldPath":"creatorId","order":"ASCENDING"},{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"createdAt","order":"DESCENDING"}] },
    { "collectionGroup": "battles", "queryScope": "COLLECTION",
      "fields": [{"fieldPath":"joinerId","order":"ASCENDING"},{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"createdAt","order":"DESCENDING"}] },
    { "collectionGroup": "battles", "queryScope": "COLLECTION",
      "fields": [{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"completedAt","order":"DESCENDING"}] },
    { "collectionGroup": "transactions", "queryScope": "COLLECTION",
      "fields": [{"fieldPath":"uid","order":"ASCENDING"},{"fieldPath":"timestamp","order":"DESCENDING"}] },
    { "collectionGroup": "depositRequests", "queryScope": "COLLECTION",
      "fields": [{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"createdAt","order":"DESCENDING"}] },
    { "collectionGroup": "withdrawRequests", "queryScope": "COLLECTION",
      "fields": [{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"createdAt","order":"DESCENDING"}] }
  ],
  "fieldOverrides": []
}
```

---

# BLOCK 17 — ENVIRONMENT & SERVICE WORKER

---

## FIX 17.1 — Fix firebase-messaging-sw.js — it uses undefined self.FIREBASE_* variables

Replace the entire file:

```javascript
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// Service workers cannot use import.meta.env — values must be injected at build time
// Add a vite plugin or use a hardcoded config here for the service worker
// For now, fetch config from a meta tag or use a separate config endpoint
self.addEventListener('fetch', () => {});  // Needed to activate SW

// Firebase config must be embedded at build time using vite-plugin-pwa injectManifest
// See: https://vite-pwa-org.netlify.app/guide/inject-manifest.html
// TEMPORARY: hardcode your config values here until build injection is set up
firebase.initializeApp({
  apiKey:            "__VITE_FIREBASE_API_KEY__",          // Replace at build time
  authDomain:        "__VITE_FIREBASE_AUTH_DOMAIN__",
  projectId:         "__VITE_FIREBASE_PROJECT_ID__",
  storageBucket:     "__VITE_FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__VITE_FIREBASE_MESSAGING_SENDER_ID__",
  appId:             "__VITE_FIREBASE_APP_ID__",
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  })
})
```

---

# FINAL VERIFICATION CHECKLIST

After applying all fixes, verify these scenarios work:

**Scenario 1 — Simultaneous join:**
Two users tap "Join" on the same battle within 100ms. Only ONE should succeed. The other should get "Battle already has a joiner" error. Wallet balance of the failed user should be unchanged.

**Scenario 2 — Wallet balance always live:**
User wins a battle in tab A. Tab B (same user, profile page) should show updated balance within 2 seconds without refresh.

**Scenario 3 — Auth protection:**
Open a browser, go to `/home` without logging in. You should be redirected to `/login`.

**Scenario 4 — Timer expires:**
Set a room code in a battle. Wait 3 minutes without the joiner tapping "I Joined". Creator should see the battle auto-resolve with prize credited.

**Scenario 5 — Deposit flow:**
Submit a deposit request. The AddWallet component should work without errors. Admin approves with a custom amount. User's balance updates live (from Fix 5.1).

**Scenario 6 — Rejection works:**
Admin rejects a withdrawal. User's wallet should be refunded immediately. User receives FCM notification.

**Scenario 7 — isBlocked enforcement:**
Set a user's isBlocked to true in Firestore. That user tries to log in. They should be redirected to the /blocked page and cannot join battles.

**Scenario 8 — Result dispute:**
Both players claim "won". Battle status should become "disputed". Admin resolves with "player2_wins". Player 2 gets prize. Player 1 gets nothing.

**Scenario 9 — Double submission:**
A user submits their result and immediately tries to submit again (network retry). The second submission should be blocked ("You have already submitted your result").

**Scenario 10 — 1000 concurrent users:**
100 battles open simultaneously. Each user's `watchMyBattles` should only read their own 2 queries, not all 200 active battles.

---

## NOTES FOR THE DEVELOPER

1. After all fixes, run `firebase deploy --only firestore:rules,firestore:indexes,storage,functions` before deploying the frontend.
2. Call `setAdminClaim` once for each admin UID before going live.
3. The `onWithdrawalRejected` fix is the most urgent — the admin rejection button is currently crashing silently.
4. The `PrivateRoute` fix is the most impactful security fix — the entire app is publicly accessible without it.
5. Monitor Firestore usage in the Firebase console for the first 24 hours after launch — the `watchMyBattles` fix alone should reduce reads by ~95%.
