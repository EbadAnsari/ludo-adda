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
import { useAuthStore } from "../../store/authStore";
import { formatAmount } from "../../utils/currency";
import { openLudoKing } from "../../utils/deepLinks";

export default function BattleRoom() {
	const { battleId } = useParams();
	const { user, profile } = useAuthStore();
	const [battle, setBattle] = useState(null);
	const [roomCodeInput, setRoomCodeInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [copied, setCopied] = useState(false);
	const navigate = useNavigate();

	const isCreator = battle?.creatorId === user?.uid;

	useEffect(() => {
		const unsub = watchBattle(battleId, (snap) => {
			if (snap.exists()) setBattle({ id: snap.id, ...snap.data() });
		});
		return unsub;
	}, [battleId]);

	const setRoomCode = async () => {
		if (!roomCodeInput.trim()) return;
		setLoading(true);
		await updateBattle(battleId, {
			roomCode: roomCodeInput.trim(),
			roomCodeSetBy: user.uid,
			roomCodeSetAt: serverTimestamp(),
		});
		setLoading(false);
	};

	const copyCode = () => {
		navigator.clipboard.writeText(battle.roomCode);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const markJoined = async () => {
		await updateBattle(battleId, { joinerJoined: true });
	};

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
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<button
							onClick={() => navigate("/home")}
							className="w-9 h-9 bg-surface border border-border rounded-[6px] flex items-center justify-center text-text2"
						>
							<ChevronLeft size={18} />
						</button>
						<div>
							<h1 className="font-display font-bold text-lg text-text1">
								Battle Room
							</h1>
							<p className="font-mono text-[11px] text-text3">
								{battleId.slice(0, 12)}...
							</p>
						</div>
					</div>
					<StatusChip status={battle.status} />
				</div>

				{/* Matchup Card */}
				<div className="bg-surface border border-border rounded-[8px] overflow-hidden">
					<div className="flex items-center justify-between p-4">
						<div className="flex items-center gap-2">
							<StatusDot status="open" />
							<div>
								<p className="font-display font-semibold text-sm text-text1">
									{isCreator
										? `You (${profile?.username})`
										: battle.creatorName}
								</p>
								<p className="text-[11px] text-text3">
									Creator
								</p>
							</div>
						</div>
						<StatusChip
							status={
								battle.creatorResult ? "completed" : "running"
							}
						/>
					</div>
					<div className="border-t border-b border-border py-3 text-center">
						<p className="font-mono font-bold text-xl text-gold">
							{formatAmount(battle.prizePool)}
						</p>
						<p className="text-[11px] text-text3">Prize Pool</p>
					</div>
					<div className="flex items-center justify-between p-4">
						<div className="flex items-center gap-2">
							<StatusDot
								status={battle.joinerId ? "running" : "open"}
							/>
							<div>
								<p className="font-display font-semibold text-sm text-text1">
									{!battle.joinerId
										? "Waiting for opponent"
										: isCreator
											? battle.joinerName
											: `You (${profile?.username})`}
								</p>
								<p className="text-[11px] text-text3">
									Opponent
								</p>
							</div>
						</div>
						<StatusChip
							status={
								battle.joinerResult
									? "completed"
									: battle.joinerId
										? "running"
										: "open"
							}
						/>
					</div>
				</div>

				{/* State A: Creator, no room code yet */}
				{isCreator &&
					!battle.roomCode &&
					battle.status === "running" && (
						<div className="bg-surface border border-border rounded-[8px] p-4 space-y-3">
							<p className="text-[11px] uppercase tracking-widest text-text3 font-semibold">
								Set Room Code
							</p>
							<input
								type="text"
								value={roomCodeInput}
								onChange={(e) =>
									setRoomCodeInput(e.target.value)
								}
								placeholder="Enter room code from Ludo King"
								className="w-full bg-surface2 border border-border rounded-[6px] px-4 py-3 text-center font-mono text-xl tracking-[6px] text-text1 outline-none focus:border-green transition-colors placeholder:tracking-normal placeholder:text-text3 placeholder:text-sm"
								maxLength={8}
							/>
							<p className="text-[11px] text-text3">
								Create a room in Ludo King and enter the code
								here
							</p>
							<Button
								variant="primary"
								className="w-full"
								loading={loading}
								disabled={!roomCodeInput.trim()}
								onClick={setRoomCode}
							>
								Share Room Code
							</Button>
						</div>
					)}

				{/* State B: Joiner, waiting for room code */}
				{!isCreator &&
					!battle.roomCode &&
					battle.status === "running" && (
						<div className="bg-surface border border-border rounded-[8px] p-6 flex flex-col items-center gap-3">
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 rounded-full bg-amber animate-pulse" />
								<span className="text-text2 text-sm">
									Waiting for room code
								</span>
							</div>
							<p className="text-text3 text-xs text-center">
								The creator will share the Ludo King room code
								shortly
							</p>
						</div>
					)}

				{/* State C: Room code exists */}
				{battle.roomCode && !battle.joinerJoined && (
					<div className="space-y-4">
						<div className="bg-surface2 border border-dashed border-border2 rounded-[8px] p-4 text-center">
							<p className="text-[11px] uppercase tracking-widest text-text3 font-semibold mb-2">
								Room Code
							</p>
							<p className="font-mono text-3xl font-bold text-text1 tracking-[4px]">
								{battle.roomCode}
							</p>
							<button
								onClick={copyCode}
								className="mt-2 flex items-center gap-1 mx-auto text-green text-xs font-semibold"
							>
								<Copy size={12} />
								{copied ? "Copied!" : "Copy Code"}
							</button>
						</div>
						{battle.roomJoinDeadline && (
							<div className="text-center space-y-2">
								<p className="text-[11px] uppercase tracking-widest text-text3 font-semibold">
									Time to Join
								</p>
								<FlipTimer deadline={battle.roomJoinDeadline} />
							</div>
						)}
						<button
							onClick={openLudoKing}
							className="btn-press w-full bg-surface2 border border-border rounded-[6px] py-3 flex items-center justify-center gap-2 text-text2 text-sm font-semibold hover:border-border2 transition-colors"
						>
							<ExternalLink size={16} />
							Open Ludo King App
						</button>
						{!isCreator && (
							<Button
								variant="outline"
								className="w-full"
								onClick={markJoined}
							>
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
							<p className="text-text1 font-display font-semibold">
								Game in Progress
							</p>
						</div>
						<Button
							variant="primary"
							className="w-full"
							onClick={() =>
								navigate(`/battle/${battleId}/result`)
							}
						>
							Submit Match Result
						</Button>
					</div>
				)}

				{battle.status === "open" && !battle.joinerId && (
					<div className="bg-surface border border-border rounded-[8px] p-6 flex flex-col items-center gap-3">
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 rounded-full bg-green animate-pulse" />
							<p className="text-text2 text-sm">
								Waiting for opponent to join
							</p>
						</div>
					</div>
				)}
			</div>
		</PageWrapper>
	);
}
