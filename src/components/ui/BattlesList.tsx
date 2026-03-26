import { Battle } from "../../interface/Battle";
import { Button } from "./Button";
import { formatAmount } from "../../utils/currency";

export interface BattlesListProps {
	list: Battle[];
	joiningId: string | null;
	joinBattle: (battle: Battle) => void;
}

export default function BattlesList({ list, joiningId, joinBattle }: Readonly<BattlesListProps>) {
	return (
		<div className="space-y-2">
			{list.map((battle) => (
				<div
					key={battle.id}
					className="bg-surface border-l-2 border-l-green border border-border rounded-[8px] p-3 flex items-center justify-between"
				>
					<div>
						<p className="font-display font-semibold text-sm text-text1">
							{battle.creatorName}
						</p>
						<p className="text-[11px] text-text3 mt-0.5">
							Waiting for opponent
						</p>
					</div>
					<div className="text-right flex flex-col items-end gap-1">
						<p className="font-mono text-lg font-bold text-gold">
							{formatAmount(battle.prizePool)}
						</p>
						<p className="text-[10px] text-text3">
							Entry ₹{battle.entryFee}
						</p>
						<Button
							variant="primary"
							className="h-8 text-xs px-3"
							loading={joiningId === battle.id}
							onClick={() => joinBattle(battle)}
						>
							Join ₹{battle.entryFee}
						</Button>
					</div>
				</div>
			))}
		</div>
	);
}
