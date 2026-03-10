import { useState, useRef } from 'react'
import { Button } from '../ui/Button'

export function DoubleConfirmButton({ children, onConfirm, variant = 'primary', className = '', disabled }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef()

  const handleClick = async () => {
    if (!confirming) {
      setConfirming(true)
      timerRef.current = setTimeout(() => setConfirming(false), 2500)
    } else {
      clearTimeout(timerRef.current)
      setConfirming(false)
      setLoading(true)
      try { await onConfirm() } finally { setLoading(false) }
    }
  }

  return (
    <Button
      variant={confirming ? 'danger' : variant}
      className={className}
      disabled={disabled || loading}
      loading={loading}
      onClick={handleClick}
    >
      {confirming ? 'Tap again to confirm' : children}
    </Button>
  )
}
