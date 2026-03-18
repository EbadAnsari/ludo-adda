import {
	collection,
	limit,
	onSnapshot,
	orderBy,
	query,
	where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../../firebase/config";
import { formatAmount } from "../../utils/currency";

export function Ticker() {
	const [winners, setWinners] = useState([]);

	useEffect(() => {
		console.log("Ticker code comes here too.");
		const unsub = onSnapshot(
			query(
				collection(db, "battles"),
				where("status", "==", "completed"),
				orderBy("completedAt", "desc"),
				limit(20),
			),
			(snap) =>
				setWinners(
					snap.docs.map((d) => d.data()).filter((b) => b.winnerId),
				),
		);
		return unsub;
	}, []);

	if (!winners.length) return null;

	const items = [...winners, ...winners];

	return (
		<div className="h-8 bg-bg2 border-b border-border overflow-hidden flex items-center">
			<div className="flex items-center gap-6 animate-[ticker_30s_linear_infinite] whitespace-nowrap">
				{items.map((b, i) => (
					<span
						key={i}
						className="text-[11px] text-text3 tracking-wide shrink-0"
					>
						{b.winnerName} won{" "}
						<span className="font-mono text-gold">
							{formatAmount(b.prizePool)}
						</span>
					</span>
				))}
			</div>
			<style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
		</div>
	);
}
