import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { verifyOTP } from '../firebase/auth'
import { getUser } from '../firebase/firestore'
import { sendOTP } from '../firebase/auth'
import { Button } from '../components/ui/Button'
import { ChevronLeft } from 'lucide-react'

export default function OTP() {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(30)
  const inputRefs = useRef([])
  const navigate = useNavigate()
  const { state } = useLocation()
  const phone = state?.phone || ''

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleChange = (index, val) => {
    if (!/^\d?$/.test(val)) return
    const newDigits = [...digits]
    newDigits[index] = val
    setDigits(newDigits)
    if (val && index < 5) inputRefs.current[index + 1]?.focus()
    if (newDigits.every(d => d)) submit(newDigits.join(''))
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const submit = async (code) => {
    setError('')
    setLoading(true)
    try {
      const result = await verifyOTP(code)
      const snap = await getUser(result.user.uid)
      navigate(snap.exists() ? '/home' : '/setup')
    } catch (e) {
      setError('Invalid OTP. Please try again.')
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    if (countdown > 0) return
    await sendOTP('+91' + phone)
    setCountdown(30)
    setDigits(['', '', '', '', '', ''])
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col page-enter">
      <div className="px-4 pt-12">
        <button onClick={() => navigate('/login')} className="flex items-center gap-1 text-text3 hover:text-text1 transition-colors">
          <ChevronLeft size={18} /> Back
        </button>
      </div>
      <div className="flex-1 flex flex-col justify-center px-6 gap-8">
        <div>
          <h2 className="font-display font-bold text-xl text-text1">Enter OTP</h2>
          <p className="text-text3 text-sm mt-1">Sent to +91 {phone}</p>
        </div>
        <div className="flex gap-2 justify-between">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className={`w-12 h-14 bg-surface border rounded-[6px] text-center font-mono text-xl font-bold text-text1 outline-none transition-colors ${d ? 'border-green bg-green-dim' : 'border-border focus:border-green'}`}
            />
          ))}
        </div>
        {error && <p className="text-red text-sm">{error}</p>}
        {loading && (
          <div className="flex justify-center">
            <div className="w-5 h-5 border-2 border-green border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-text3 text-sm">{countdown > 0 ? `Resend in ${countdown}s` : ''}</span>
          <button
            onClick={resend}
            disabled={countdown > 0}
            className="text-green text-sm font-semibold disabled:text-text3 disabled:cursor-not-allowed"
          >
            Resend OTP
          </button>
        </div>
      </div>
    </div>
  )
}
