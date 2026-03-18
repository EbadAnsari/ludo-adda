import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { StatusChip } from '../../components/ui/StatusDot'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { formatAmount } from '../../utils/currency'
import { timeAgo } from '../../utils/time'
import { ChevronLeft } from 'lucide-react'

const STATUSES = ['all', 'open', 'running', 'completed', 'disputed', 'cancelled']

export default function AdminBattles() {
  const [battles, setBattles] = useState([])
  const [filter, setFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'battles'), orderBy('createdAt', 'desc'), limit(100)),
      snap => setBattles(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  const filtered = filter === 'all' ? battles : battles.filter(b => b.status === filter)

  return (
    <AdminLayout>
      <div className="px-4 pt-4 space-y-4 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="text-text3 text-sm flex items-center gap-1"><ChevronLeft size={14} />Back</button>
          <h1 className="font-display font-bold text-lg text-text1">All Battles</h1>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`btn-press shrink-0 px-3 py-1.5 rounded-[4px] border text-xs font-display font-semibold capitalize transition-colors ${filter === s ? 'border-green text-green bg-green-dim' : 'border-border text-text3'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {filtered.map(b => (
            <div key={b.id} className="bg-surface border border-border rounded-[8px] p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[11px] text-text3">{b.id.slice(0, 10)}...</p>
                <StatusChip status={b.status} />
              </div>
              <div className="flex items-center justify-between">
                <p className="font-display text-sm text-text1">{b.creatorName} vs {b.joinerName || '—'}</p>
                <p className="font-mono text-sm text-gold">{formatAmount(b.prizePool)}</p>
              </div>
              <p className="text-[11px] text-text3">{timeAgo(b.createdAt)}</p>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
