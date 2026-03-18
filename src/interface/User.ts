import { Timestamp } from "firebase/firestore";
import { UID } from "./UID";

export interface User {
	uid: UID;
	phone: string;
	username: string;
	walletBalance: number;
	totalWins: number;
	totalLosses: number;
	totalEarnings: number;
	winRate: number;
	isBlocked: boolean;
	isAdmin: boolean;
	referralCode: UID | null;
	referredBy: UID | null;
	fcmToken: string | null;
	createdAt?: Timestamp | Date;
}
