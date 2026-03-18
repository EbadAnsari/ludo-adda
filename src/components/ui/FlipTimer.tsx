import { useState, useEffect } from 'react'

export function FlipTimer({ deadline }) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const calc = () => {
      if (!deadline) return
      const d = deadline?.toDate ? deadline.toDate() : new Date(deadline)
      setRemaining(Math.max(0, Math.floor((d - Date.now()) / 1000)))
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  const urgency = remaining < 60 ? 'border-red text-red' : remaining < 90 ? 'border-amber text-amber' : 'border-border text-text1'

  return (
    <div className="flex gap-2 items-center justify-center">
      {[String(mins).padStart(2,'0'), String(secs).padStart(2,'0')].map((chunk, ci) => (
        <div key={ci} className="flex gap-1">
          {chunk.split('').map((digit, i) => (
            <div key={i} className={`w-11 h-14 bg-surface2 border ${urgency} rounded-[6px] flex items-center justify-center font-mono text-3xl font-bold transition-colors`}>
              {digit}
            </div>
          ))}
          {ci === 0 && <span className="text-text3 font-mono text-2xl self-center">:</span>}
        </div>
      ))}
    </div>
  )
}
