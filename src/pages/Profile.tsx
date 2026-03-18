import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { signOut } from '../firebase/auth'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Copy, ChevronRight, History, Swords, HelpCircle, Headphones, Shield, LogOut } from 'lucide-react'
import { useState } from 'react'

export default function Profile() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const handleLogout = async () => { await signOut(); navigate('/login') }
  const copyRef = () => {
    navigator.clipboard.writeText(profile?.referralCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const stats = [
    { label: 'Wins', value: profile?.totalWins ?? 0, color: 'text-green' },
    { label: 'Losses', value: profile?.totalLosses ?? 0, color: 'text-red' },
    { label: 'Earned', value: `₹${profile?.totalEarnings ?? 0}`, color: 'text-gold' },
    { label: 'Win Rate', value: `${profile?.winRate ?? 0}%`, color: 'text-text1' },
  ]

  const menu = [
    { icon: History, label: 'Transaction History', action: () => navigate('/wallet') },
    { icon: Swords, label: 'My Battles', action: () => navigate('/home') },
    { icon: HelpCircle, label: 'How to Play', action: () => {} },
    { icon: Headphones, label: 'Support', action: () => {} },
    ...(profile?.isAdmin ? [{ icon: Shield, label: 'Admin Panel', action: () => navigate('/admin') }] : []),
  ]

  return (
    <PageWrapper>
      <div className="px-4 pt-4 space-y-5 pb-6">
        {/* Profile Header */}
        <div className="space-y-1">
          <h2 className="font-display font-bold text-xl text-text1">{profile?.username}</h2>
          <p className="text-text3 text-sm">{profile?.phone}</p>
          <p className="font-mono text-xs text-text2">
            {profile?.totalWins}W · {profile?.totalLosses}L ·{' '}
            <span className="text-green">{profile?.winRate ?? 0}% WR</span>
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          {stats.map(({ label, value, color }) => (
            <div key={label} className="bg-surface border border-border rounded-[8px] p-4">
              <p className={`font-mono text-xl font-bold ${color}`}>{value}</p>
              <p className="text-[11px] uppercase tracking-widest text-text3 font-semibold mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Referral Card */}
        <div className="bg-surface border border-border rounded-[8px] p-4 space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-text3 font-semibold">Referral Code</p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-text1 text-base flex-1">{profile?.referralCode}</span>
            <button onClick={copyRef} className="text-green text-xs font-semibold flex items-center gap-1">
              <Copy size={12} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-text3 text-[11px]">Earn ₹10 per referral</p>
        </div>

        {/* Menu */}
        <div className="bg-surface border border-border rounded-[8px] divide-y divide-border">
          {menu.map(({ icon: Icon, label, action }) => (
            <button key={label} onClick={action} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface2 transition-colors">
              <div className="w-8 h-8 bg-surface2 rounded-[6px] flex items-center justify-center shrink-0">
                <Icon size={16} className="text-text3" />
              </div>
              <span className="font-display font-medium text-sm text-text1 flex-1 text-left">{label}</span>
              <ChevronRight size={16} className="text-text3" />
            </button>
          ))}
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface2 transition-colors">
            <div className="w-8 h-8 bg-red-dim rounded-[6px] flex items-center justify-center shrink-0">
              <LogOut size={16} className="text-red" />
            </div>
            <span className="font-display font-medium text-sm text-red flex-1 text-left">Logout</span>
          </button>
        </div>
      </div>
    </PageWrapper>
  )
}
