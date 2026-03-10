import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendOTP } from '../firebase/auth'
import { isValidPhone } from '../utils/validators'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Login() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSend = async () => {
    setError('')
    if (!isValidPhone(phone)) { setError('Enter a valid 10-digit mobile number'); return }
    setLoading(true)
    try {
      await sendOTP('+91' + phone)
      navigate('/otp', { state: { phone } })
    } catch (e) {
      setError(e.message || 'Failed to send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col page-enter">
      <div id="recaptcha-container" />
      <div className="flex-1 flex flex-col justify-center px-6 gap-8">
        <div>
          <h1 className="font-display font-black text-[28px] text-text1">
            Ludo<span className="text-green">Battle</span>
          </h1>
          <p className="text-text3 text-[11px] tracking-widest uppercase mt-1">Real money 1v1 battles</p>
        </div>
        <div className="space-y-4">
          <h2 className="font-display font-bold text-xl text-text1">Enter your mobile number</h2>
          <Input
            type="tel"
            prefix="+91"
            placeholder="10-digit mobile number"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            error={error}
            maxLength={10}
            inputMode="numeric"
          />
          <Button variant="primary" className="w-full" loading={loading} onClick={handleSend}>
            Send OTP
          </Button>
          <p className="text-center text-[11px] text-text3">
            By continuing you agree to our Terms & Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
