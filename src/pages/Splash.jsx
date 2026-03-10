import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Splash() {
  const [progress, setProgress] = useState(0)
  const navigate = useNavigate()
  const { user, profile, loading } = useAuthStore()

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100 }
        return p + 2
      })
    }, 50)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (progress === 100 && !loading) {
      if (!user) navigate('/login')
      else if (!profile) navigate('/setup')
      else navigate('/home')
    }
  }, [progress, loading, user, profile])

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center relative overflow-hidden">
      <div className="text-center space-y-3">
        <h1 className="font-display font-black text-[28px] text-text1">
          Ludo<span className="text-green">Battle</span>
        </h1>
        <p className="text-text3 text-[13px] tracking-[0.2em] uppercase font-display">
          1v1 · Real Money
        </p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-border">
        <div
          className="h-full bg-green transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
