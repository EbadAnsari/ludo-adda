import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DoubleConfirmButton } from '../../components/admin/DoubleConfirmButton'
import { watchPendingDeposits } from '../../firebase/firestore'
import { onDepositApproved, onDepositRejected } from '../../firebase/functions'
import { formatAmount } from '../../utils/currency'
import { timeAgo } from '../../utils/time'
import { ChevronLeft } from 'lucide-react'

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState([])
  const [preview, setPreview] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    return watchPendingDeposits(snap => setDeposits(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const approve = async (id, amount) => {
    await onDepositApproved({ requestId: id, amount })
  }
  const reject = async (id) => {
    const reason = prompt('Rejection reason (optional):') || ''
    await onDepositRejected({ requestId: id, adminNote: reason })
  }

  return (
    <AdminLayout>
      {preview && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <img src={preview} alt="screenshot" className="max-w-full max-h-full rounded-[8px]" />
        </div>
      )}
      <div className="px-4 pt-4 space-y-4 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="text-text3 text-sm flex items-center gap-1"><ChevronLeft size={14} />Back</button>
          <h1 className="font-display font-bold text-lg text-text1">Pending Deposits</h1>
        </div>
        {deposits.length === 0 ? (
          <p className="text-text3 text-sm text-center py-8">No pending deposits</p>
        ) : deposits.map(dep => (
          <div key={dep.id} className="bg-surface border border-border rounded-[8px] p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display font-bold text-sm text-text1">{dep.username}</p>
                <p className="text-text3 text-xs">{dep.phone}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xl font-bold text-gold">{formatAmount(dep.amount)}</p>
                <p className="text-text3 text-xs">{timeAgo(dep.createdAt)}</p>
              </div>
            </div>

            {dep.screenshotUrl && (
              <img src={dep.screenshotUrl} alt="proof" onClick={() => setPreview(dep.screenshotUrl)} className="w-16 h-16 object-cover rounded-[6px] cursor-pointer border border-border hover:border-border2 transition-colors" />
            )}
            <div className="flex gap-2">
              <DoubleConfirmButton variant="primary" className="flex-1 text-xs" onConfirm={() => approve(dep.id, dep.amount)}>
                Approve {formatAmount(dep.amount)}
              </DoubleConfirmButton>
              <DoubleConfirmButton variant="danger" className="flex-1 text-xs" onConfirm={() => reject(dep.id)}>
                Reject
              </DoubleConfirmButton>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}
