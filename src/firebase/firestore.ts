import {
	addDoc,
	collection,
	doc,
	DocumentData,
	getDoc,
	limit,
	onSnapshot,
	orderBy,
	query,
	QueryDocumentSnapshot,
	QuerySnapshot,
	serverTimestamp,
	setDoc,
	updateDoc,
	where,
} from "firebase/firestore";
import { Battle } from "../interface/Battle";
import { UID } from "../interface/UID";
import { User } from "../interface/User";
import { db } from "./config";

// Users
export function getUser(uid: UID) {
	return getDoc(doc(db, "users", uid));
}

// TODO: CHECKED
export function createUser(uid: UID, data: User) {
	return setDoc(doc(db, "users", uid), {
		...data,
		createdAt: serverTimestamp(),
	});
}
export function updateUser(uid: UID, data: Partial<User>) {
	return updateDoc(doc(db, "users", uid), data);
}

// Battles
export function createBattle(data: Battle) {
	return addDoc(collection(db, "battles"), {
		...data,
		createdAt: serverTimestamp(),
	});
}
export function getBattle(id: string) {
	return getDoc(doc(db, "battles", id));
}
export function updateBattle(id: string, data: any) {
	return updateDoc(doc(db, "battles", id), data);
}
export function watchBattle(id: string, cb: any) {
	return onSnapshot(doc(db, "battles", id), cb);
}

export function watchOpenBattles(
	cb: (snapshot: QuerySnapshot<Battle>) => void,
) {
	console.log("Code comes here too.");
	return onSnapshot(
		query(
			collection(db, "battles"),
			where("status", "==", "open"),
			orderBy("createdAt", "desc"),
			limit(50),
		),
		cb,
	);
}

export function watchMyBattles(
	uid: UID,
	cb: (docs: QueryDocumentSnapshot<DocumentData>[]) => void,
) {
	return onSnapshot(
		query(
			collection(db, "battles"),
			where("status", "in", ["open", "running", "disputed"]),
			orderBy("createdAt", "desc"),
		),
		function (snap) {
			cb(
				snap.docs.filter(function (d) {
					return (
						d.data().creatorId === uid || d.data().joinerId === uid
					);
				}),
			);
		},
	);
}

// Transactions
export function watchTransactions(uid: UID, cb: any) {
	return onSnapshot(
		query(
			collection(db, "transactions"),
			where("uid", "==", uid),
			orderBy("timestamp", "desc"),
			limit(20),
		),
		cb,
	);
}

// Deposits
export function createDepositRequest(data: any) {
	return addDoc(collection(db, "depositRequests"), {
		...data,
		createdAt: serverTimestamp(),
	});
}
export function watchPendingDeposits(cb: any) {
	return onSnapshot(
		query(
			collection(db, "depositRequests"),
			where("status", "==", "pending"),
			orderBy("createdAt", "desc"),
		),
		cb,
	);
}

// Withdrawals
export function createWithdrawRequest(data: any) {
	return addDoc(collection(db, "withdrawRequests"), {
		...data,
		createdAt: serverTimestamp(),
	});
}
export function watchPendingWithdrawals(cb: any) {
	return onSnapshot(
		query(
			collection(db, "withdrawRequests"),
			where("status", "==", "pending"),
			orderBy("createdAt", "desc"),
		),
		cb,
	);
}
