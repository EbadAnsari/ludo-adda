import { Bell } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { formatAmount } from '../../utils/currency'

export function Header() {
  const { profile } = useAuthStore()
  return (
    <header className="sticky top-0 z-40 bg-bg border-b border-border h-[52px] flex items-center justify-between px-4">
      <span className="font-display font-black text-xl text-text1">Ludo<span className="text-green">Battle</span></span>
      <div className="flex items-center gap-3">
        {profile && (
          <span className="font-mono text-sm text-text1">{formatAmount(profile.walletBalance ?? 0)}</span>
        )}
        <button className="w-8 h-8 flex items-center justify-center text-text3 hover:text-text1 transition-colors">
          <Bell size={18} />
        </button>
      </div>
    </header>
  )
}
