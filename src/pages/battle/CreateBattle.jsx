import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { createBattle } from '../../firebase/firestore'
import { Button } from '../../components/ui/Button'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { formatAmount, calcPrize, calcPlatformFee } from '../../utils/currency'
import { ChevronLeft } from 'lucide-react'
import { serverTimestamp } from 'firebase/firestore'

const AMOUNTS = [50, 100, 200, 500, 1000]

export default function CreateBattle() {
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()

  const handleCreate = async () => {
    if (!selected) return
    if (profile.walletBalance < selected) { setError('Insufficient wallet balance'); return }
    setLoading(true)
    setError('')
    try {
      const ref = await createBattle({
        creatorId: user.uid,
        creatorName: profile.username,
        joinerId: null,
        joinerName: null,
        entryFee: selected,
        prizePool: calcPrize(selected),
        platformFee: calcPlatformFee(selected),
        status: 'open',
        roomCode: null,
        roomCodeSetBy: null,
        roomCodeSetAt: null,
        roomJoinDeadline: null,
        joinerJoined: false,
        winnerId: null,
        winnerScreenshot: null,
        creatorResult: null,
        joinerResult: null,
        result: null,
        adminVerified: false,
        startedAt: null,
        completedAt: null,
      })
      navigate(`/battle/${ref.id}/room`)
    } catch (e) {
      setError('Failed to create battle. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper>
      <div className="px-4 pt-4 space-y-6 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 bg-surface border border-border rounded-[6px] flex items-center justify-center text-text2 hover:text-text1 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h1 className="font-display font-bold text-xl text-text1">New Battle</h1>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-widest text-text3 font-semibold mb-3">Select Entry Fee</p>
          <div className="grid grid-cols-5 gap-2">
            {AMOUNTS.map(amt => (
              <button
                key={amt}
                onClick={() => { setSelected(amt); setError('') }}
                className={`btn-press h-14 rounded-[6px] border flex flex-col items-center justify-center gap-0.5 transition-colors ${selected === amt ? 'border-green bg-green-dim text-green' : 'border-border bg-surface text-text2'}`}
              >
                <span className="font-mono font-bold text-sm">₹{amt}</span>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <div className="bg-surface border border-border rounded-[8px] p-4">
            <div className="grid grid-cols-3 divide-x divide-border text-center">
              <div className="pr-3">
                <p className="text-[11px] uppercase tracking-widest text-text3 font-semibold">Entry</p>
                <p className="font-mono font-bold text-text1 mt-1">{formatAmount(selected)}</p>
              </div>
              <div className="px-3">
                <p className="text-[11px] uppercase tracking-widest text-text3 font-semibold">Prize Pool</p>
                <p className="font-mono font-bold text-gold mt-1">{formatAmount(calcPrize(selected))}</p>
              </div>
              <div className="pl-3">
                <p className="text-[11px] uppercase tracking-widest text-text3 font-semibold">Platform Fee</p>
                <p className="font-mono font-bold text-text2 mt-1">{formatAmount(calcPlatformFee(selected))}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-surface2 rounded-[6px] px-3 py-2">
          <span className="text-text3 text-xs">Your balance: </span>
          <span className="font-mono text-sm text-text1">{formatAmount(profile?.walletBalance ?? 0)}</span>
        </div>

        {error && <p className="text-red text-sm">{error}</p>}

        <Button variant="primary" className="w-full" disabled={!selected} loading={loading} onClick={handleCreate}>
          Create Battle
        </Button>
      </div>
    </PageWrapper>
  )
}
