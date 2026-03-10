import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useBattleStore } from '../store/battleStore'
import { watchOpenBattles, watchMyBattles, updateBattle } from '../firebase/firestore'
import { PageWrapper } from '../components/layout/PageWrapper'
import { StatusDot, StatusChip } from '../components/ui/StatusDot'
import { Button } from '../components/ui/Button'
import { formatAmount } from '../utils/currency'
import { serverTimestamp } from 'firebase/firestore'
import { Users, Zap } from 'lucide-react'

const FEES = [50, 100, 200, 500, 1000]

export default function Home() {
  const { user, profile } = useAuthStore()
  const { openBattles, myBattles, setOpenBattles, setMyBattles } = useBattleStore()
  const [activeFee, setActiveFee] = useState(null)
  const [joiningId, setJoiningId] = useState(null)
  const navigate = useNavigate()

  const filtered = activeFee ? openBattles.filter(b => b.entryFee === activeFee && b.creatorId !== user?.uid) : openBattles.filter(b => b.creatorId !== user?.uid)

  useEffect(() => {
    const u1 = watchOpenBattles(snap => setOpenBattles(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = watchMyBattles(user?.uid, docs => setMyBattles(docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { u1(); u2() }
  }, [user?.uid])

  const joinBattle = async (battle) => {
    if (!profile || profile.walletBalance < battle.entryFee) return alert('Insufficient balance')
    setJoiningId(battle.id)
    await updateBattle(battle.id, { joinerId: user.uid, joinerName: profile.username })
    navigate(`/battle/${battle.id}/room`)
    setJoiningId(null)
  }

  return (
    <PageWrapper showTicker>
      <div className="px-4 pt-4 space-y-5 pb-6">
        {/* Hero Card */}
        <div className="bg-surface border border-border rounded-[8px] p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-3xl font-bold text-text1">{openBattles.length}</p>
              <p className="text-[11px] uppercase tracking-widest text-text3 font-semibold mt-0.5">Open Battles</p>
              <div className="flex items-center gap-1.5 mt-2">
                <StatusDot status="open" />
                <span className="text-text3 text-[11px]">Live</span>
              </div>
            </div>
            <Button variant="primary" onClick={() => navigate('/battle/create')}>Create Battle</Button>
          </div>
          <div className="border-t border-border mt-4 pt-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveFee(null)}
                className={`btn-press shrink-0 px-3 py-1.5 rounded-[4px] border text-sm font-display font-semibold transition-colors ${!activeFee ? 'border-green text-green bg-green-dim' : 'border-border text-text3 bg-surface2'}`}
              >
                All
              </button>
              {FEES.map(fee => (
                <button
                  key={fee}
                  onClick={() => setActiveFee(activeFee === fee ? null : fee)}
                  className={`btn-press shrink-0 px-3 py-1.5 rounded-[4px] border text-sm font-display font-semibold transition-colors ${activeFee === fee ? 'border-green text-green bg-green-dim' : 'border-border text-text3 bg-surface2'}`}
                >
                  ₹{fee}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Open Battles */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[11px] uppercase tracking-widest text-text3 font-semibold">Open Battles</p>
            {filtered.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-red flex items-center justify-center text-[10px] font-bold text-white">{filtered.length}</span>
            )}
          </div>
          {filtered.length === 0 ? (
            <div className="bg-surface border border-border rounded-[8px] p-6 text-center">
              <p className="text-text3 text-sm">No open battles right now</p>
              <Button variant="outline" className="mt-3" onClick={() => navigate('/battle/create')}>Create one</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(battle => (
                <div key={battle.id} className="bg-surface border-l-2 border-l-green border border-border rounded-[8px] p-3 flex items-center justify-between">
                  <div>
                    <p className="font-display font-semibold text-sm text-text1">{battle.creatorName}</p>
                    <p className="text-[11px] text-text3 mt-0.5">Waiting for opponent</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="font-mono text-lg font-bold text-gold">{formatAmount(battle.prizePool)}</p>
                    <p className="text-[10px] text-text3">Entry ₹{battle.entryFee}</p>
                    <Button
                      variant="primary"
                      className="h-8 text-xs px-3"
                      loading={joiningId === battle.id}
                      onClick={() => joinBattle(battle)}
                    >
                      Join ₹{battle.entryFee}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Active Battles */}
        {myBattles.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-widest text-text3 font-semibold mb-3">My Active Battles</p>
            <div className="space-y-2">
              {myBattles.map(battle => (
                <div
                  key={battle.id}
                  onClick={() => navigate(`/battle/${battle.id}/room`)}
                  className="bg-surface border border-border rounded-[8px] p-3 flex items-center justify-between cursor-pointer hover:border-border2 transition-colors"
                >
                  <div>
                    <p className="font-display font-semibold text-sm text-text1">
                      vs {battle.creatorId === user?.uid ? (battle.joinerName || 'Waiting...') : battle.creatorName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusDot status={battle.status} />
                      <p className="text-[11px] text-text3 capitalize">{battle.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-base font-bold text-gold">{formatAmount(battle.prizePool)}</p>
                    <StatusChip status={battle.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
