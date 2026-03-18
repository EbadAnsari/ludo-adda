import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DoubleConfirmButton } from '../../components/admin/DoubleConfirmButton'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { onDisputeResolved } from '../../firebase/functions'
import { formatAmount } from '../../utils/currency'
import { timeAgo } from '../../utils/time'
import { ChevronLeft } from 'lucide-react'

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'battles'), where('status', '==', 'disputed')),
      snap => setDisputes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  return (
    <AdminLayout>
      <div className="px-4 pt-4 space-y-4 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="text-text3 text-sm flex items-center gap-1"><ChevronLeft size={14} />Back</button>
          <h1 className="font-display font-bold text-lg text-text1">Disputes</h1>
        </div>
        {disputes.length === 0 ? (
          <p className="text-text3 text-sm text-center py-8">No active disputes</p>
        ) : disputes.map(b => (
          <div key={b.id} className="bg-surface border border-border rounded-[8px] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-text3">{b.id.slice(0, 8)}...</p>
              <p className="font-mono text-base font-bold text-gold">{formatAmount(b.prizePool)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface2 rounded-[6px] p-2 text-center">
                <p className="font-display font-semibold text-sm text-text1">{b.creatorName}</p>
                <p className="text-[10px] text-text3">Claims: {b.creatorResult || '—'}</p>
              </div>
              <div className="bg-surface2 rounded-[6px] p-2 text-center">
                <p className="font-display font-semibold text-sm text-text1">{b.joinerName}</p>
                <p className="text-[10px] text-text3">Claims: {b.joinerResult || '—'}</p>
              </div>
            </div>
            {b.winnerScreenshot && (
              <img src={b.winnerScreenshot} alt="screenshot" className="w-16 h-16 object-cover rounded-[6px] border border-border" />
            )}
            <div className="flex gap-2">
              <DoubleConfirmButton variant="primary" className="flex-1 text-[11px] px-2" onConfirm={() => onDisputeResolved({ battleId: b.id, decision: 'player1_wins' })}>
                P1 Won
              </DoubleConfirmButton>
              <DoubleConfirmButton variant="primary" className="flex-1 text-[11px] px-2" onConfirm={() => onDisputeResolved({ battleId: b.id, decision: 'player2_wins' })}>
                P2 Won
              </DoubleConfirmButton>
              <DoubleConfirmButton variant="outline" className="flex-1 text-[11px] px-2" onConfirm={() => onDisputeResolved({ battleId: b.id, decision: 'refund_both' })}>
                Refund
              </DoubleConfirmButton>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}
