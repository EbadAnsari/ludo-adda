import { Bell } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { formatAmount } from "../../utils/currency";

export function Header() {
	const { profile } = useAuthStore();
	return (
		<header className="top-0 z-40 sticky flex justify-between items-center bg-bg px-4 border-border border-b h-[52px]">
			<span className="font-display font-black text-text1 text-xl">
				Ludo<span className="text-green">Adda</span>
			</span>
			<div className="flex items-center gap-3">
				{profile && (
					<span className="font-mono text-text1 text-sm">
						{formatAmount(profile.walletBalance ?? 0)}
					</span>
				)}
				<button className="flex justify-center items-center w-8 h-8 text-text3 hover:text-text1 transition-colors">
					<Bell size={18} />
				</button>
			</div>
		</header>
	);
}
