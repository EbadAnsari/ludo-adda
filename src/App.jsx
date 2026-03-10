import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase/config'

// Pages
import Splash from './pages/Splash'
import Login from './pages/Login'
import OTP from './pages/OTP'
import ProfileSetup from './pages/ProfileSetup'
import Home from './pages/Home'
import Wallet from './pages/Wallet'
import Profile from './pages/Profile'
import CreateBattle from './pages/battle/CreateBattle'
import BattleRoom from './pages/battle/BattleRoom'
import SubmitResult from './pages/battle/SubmitResult'
import AdminDashboard from './pages/admin/Dashboard'
import AdminDeposits from './pages/admin/Deposits'
import AdminWithdrawals from './pages/admin/Withdrawals'
import AdminDisputes from './pages/admin/Disputes'
import AdminBattles from './pages/admin/Battles'
import AdminUsers from './pages/admin/Users'

function PrivateRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-bg"><div className="w-6 h-6 border-2 border-green border-t-transparent rounded-full animate-spin" /></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, profile, loading } = useAuthStore()
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-bg"><div className="w-6 h-6 border-2 border-green border-t-transparent rounded-full animate-spin" /></div>
  if (!user || !profile?.isAdmin) return <Navigate to="/home" replace />
  return children
}

export default function App() {
  const { setUser, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (snap.exists()) setProfile(snap.data())
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/otp" element={<OTP />} />
      <Route path="/setup" element={<ProfileSetup />} />
      <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/wallet" element={<PrivateRoute><Wallet /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/battle/create" element={<PrivateRoute><CreateBattle /></PrivateRoute>} />
      <Route path="/battle/:battleId/room" element={<PrivateRoute><BattleRoom /></PrivateRoute>} />
      <Route path="/battle/:battleId/result" element={<PrivateRoute><SubmitResult /></PrivateRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/deposits" element={<AdminRoute><AdminDeposits /></AdminRoute>} />
      <Route path="/admin/withdrawals" element={<AdminRoute><AdminWithdrawals /></AdminRoute>} />
      <Route path="/admin/disputes" element={<AdminRoute><AdminDisputes /></AdminRoute>} />
      <Route path="/admin/battles" element={<AdminRoute><AdminBattles /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
