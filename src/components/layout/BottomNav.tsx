import { Home, Wallet, User, Swords } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

const tabs = [
  { label: 'Home',    icon: Home,   path: '/home'    },
  { label: 'Battle',  icon: Swords, path: '/battle/create' },
  { label: 'Wallet',  icon: Wallet, path: '/wallet'  },
  { label: 'Profile', icon: User,   path: '/profile' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-bg border-t border-border h-14 flex z-40">
      {tabs.map(({ label, icon: Icon, path }) => {
        const active = pathname === path || (path !== '/home' && pathname.startsWith(path))
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${active ? 'text-green' : 'text-text3'}`}
          >
            {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green rounded-b" />}
            <Icon size={18} />
            <span className="text-[10px] uppercase tracking-widest font-semibold font-display">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
