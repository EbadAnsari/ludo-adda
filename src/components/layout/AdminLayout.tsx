import { useNavigate } from 'react-router-dom'
import { LogOut, Shield } from 'lucide-react'
import { signOut } from '../../firebase/auth'

export function AdminLayout({ children }) {
  const navigate = useNavigate()
  const handleLogout = async () => { await signOut(); navigate('/login') }

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-40 bg-bg border-b border-border h-[52px] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-green" />
          <span className="font-display font-bold text-text1">Admin Panel</span>
        </div>
        <button onClick={handleLogout} className="w-8 h-8 flex items-center justify-center text-text3 hover:text-red transition-colors">
          <LogOut size={16} />
        </button>
      </header>
      <main className="pb-8 page-enter">{children}</main>
    </div>
  )
}
