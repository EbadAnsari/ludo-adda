import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { createUser, getUser } from '../firebase/firestore'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { isValidUsername } from '../utils/validators'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { CheckCircle, XCircle } from 'lucide-react'

export default function ProfileSetup() {
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState(null) // 'checking' | 'available' | 'taken' | 'invalid'
  const [loading, setLoading] = useState(false)
  const { user, setProfile } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!username || !isValidUsername(username)) { setStatus(username ? 'invalid' : null); return }
    setStatus('checking')
    const timer = setTimeout(async () => {
      const snap = await getDocs(query(collection(db, 'users'), where('username', '==', username)))
      setStatus(snap.empty ? 'available' : 'taken')
    }, 600)
    return () => clearTimeout(timer)
  }, [username])

  const handleCreate = async () => {
    if (status !== 'available' || !user) return
    setLoading(true)
    const referralCode = username + Math.floor(Math.random() * 90 + 10)
    const profile = {
      uid: user.uid,
      phone: user.phoneNumber,
      username,
      walletBalance: 0,
      totalWins: 0,
      totalLosses: 0,
      totalEarnings: 0,
      winRate: 0,
      isBlocked: false,
      isAdmin: false,
      referralCode,
      referredBy: null,
      fcmToken: null,
    }
    await createUser(user.uid, profile)
    setProfile(profile)
    navigate('/home')
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col page-enter">
      <div className="flex-1 flex flex-col justify-center px-6 gap-8">
        <div>
          <h1 className="font-display font-black text-[28px] text-text1">Ludo<span className="text-green">Battle</span></h1>
          <h2 className="font-display font-bold text-xl text-text1 mt-6">Create your username</h2>
          <p className="text-text3 text-sm mt-1">4–16 alphanumeric characters</p>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <Input
              placeholder="e.g. ludoking99"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
              maxLength={16}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {status === 'available' && <CheckCircle size={18} className="text-green" />}
              {status === 'taken' && <XCircle size={18} className="text-red" />}
              {status === 'checking' && <div className="w-4 h-4 border-2 border-text3 border-t-transparent rounded-full animate-spin" />}
            </div>
          </div>
          {status === 'taken' && <p className="text-red text-xs">Username already taken</p>}
          {status === 'invalid' && <p className="text-text3 text-xs">Only letters and numbers, 4–16 chars</p>}
          <Button variant="primary" className="w-full" disabled={status !== 'available'} loading={loading} onClick={handleCreate}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
