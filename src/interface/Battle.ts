import { FieldValue, Timestamp } from "firebase/firestore";
import { UID } from "./UID";

export type BattleStatus =
	| "open"
	| "running"
	| "completed"
	| "disputed"
	| "cancelled";
export type BattleResult = "creator_win" | "joiner_win" | "refund_both" | null;
export type PlayerResult = "won" | "lost" | null;

export interface Battle {
	id?: string;
	creatorId: UID;
	creatorName: string;
	joinerId: UID | null;
	joinerName: string | null;
	entryFee: number;
	prizePool: number;
	platformFee: number;
	status: BattleStatus;
	roomCode: string | null;
	roomCodeSetAt: FieldValue | null;
	roomJoinDeadline: Timestamp | null;
	joinerJoined: boolean;
	winnerId: UID | null;
	winnerScreenshot: string | null;
	result: BattleResult;
	adminVerified: boolean;
	startedAt: Timestamp | null;
	completedAt: Timestamp | null;
	createdAt: FieldValue;
	postedAt: string;
}
