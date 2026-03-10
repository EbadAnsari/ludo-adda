import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DoubleConfirmButton } from '../../components/admin/DoubleConfirmButton'
import { watchPendingWithdrawals } from '../../firebase/firestore'
import { onWithdrawalApproved, onWithdrawalRejected } from '../../firebase/functions'
import { formatAmount } from '../../utils/currency'
import { timeAgo } from '../../utils/time'
import { Copy, ChevronLeft } from 'lucide-react'

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    return watchPendingWithdrawals(snap => setWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  return (
    <AdminLayout>
      <div className="px-4 pt-4 space-y-4 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="text-text3 text-sm flex items-center gap-1"><ChevronLeft size={14} />Back</button>
          <h1 className="font-display font-bold text-lg text-text1">Pending Withdrawals</h1>
        </div>
        {withdrawals.length === 0 ? (
          <p className="text-text3 text-sm text-center py-8">No pending withdrawals</p>
        ) : withdrawals.map(w => (
          <div key={w.id} className="bg-surface border border-border rounded-[8px] p-4 space-y-3">
            <div className="flex items-start justify-between">
              <p className="font-display font-bold text-sm text-text1">{w.upiName}</p>
              <div className="text-right">
                <p className="font-mono text-xl font-bold text-gold">{formatAmount(w.amount)}</p>
                <p className="text-text3 text-xs">{timeAgo(w.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between bg-surface2 rounded-[6px] px-3 py-2">
              <span className="text-text3 text-xs">UPI ID</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-blue text-sm">{w.upiId}</span>
                <button onClick={() => navigator.clipboard.writeText(w.upiId)} className="text-text3 hover:text-text1 transition-colors"><Copy size={12} /></button>
              </div>
            </div>
            <div className="flex gap-2">
              <DoubleConfirmButton variant="primary" className="flex-1 text-xs" onConfirm={() => onWithdrawalApproved({ requestId: w.id })}>
                Mark Paid & Approve
              </DoubleConfirmButton>
              <DoubleConfirmButton variant="danger" className="flex-1 text-xs" onConfirm={() => onWithdrawalRejected({ requestId: w.id, adminNote: '' })}>
                Reject
              </DoubleConfirmButton>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}
