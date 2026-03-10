import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useWalletStore } from '../store/walletStore'
import { watchTransactions, createDepositRequest, createWithdrawRequest } from '../firebase/firestore'
import { uploadScreenshot } from '../firebase/storage'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { UploadZone } from '../components/ui/UploadZone'
import { formatAmount, formatDateTime } from '../utils/currency'
import { timeAgo } from '../utils/time'
import { ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react'

export default function Wallet() {
  const { user, profile } = useAuthStore()
  const { transactions, setTransactions } = useWalletStore()
  const [sheet, setSheet] = useState(null) // 'add' | 'withdraw'
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  // Add money state
  const [addAmount, setAddAmount] = useState('')
  const [utr, setUtr] = useState('')
  const [screenshot, setScreenshot] = useState(null)

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [upiId, setUpiId] = useState('')
  const [upiName, setUpiName] = useState('')

  useEffect(() => {
    const unsub = watchTransactions(user?.uid, snap => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return unsub
  }, [user?.uid])

  const submitDeposit = async () => {
    if (!addAmount || !utr || !screenshot) return
    setLoading(true)
    try {
      const url = await uploadScreenshot('deposits', user.uid, screenshot)
      await createDepositRequest({
        uid: user.uid, username: profile.username, phone: profile.phone,
        amount: Number(addAmount), utrNumber: utr, screenshotUrl: url, status: 'pending', adminNote: null, resolvedAt: null
      })
      setSuccess('Deposit request submitted! Admin will verify within a few hours.')
      setSheet(null)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const submitWithdraw = async () => {
    if (!withdrawAmount || !upiId || !upiName) return
    if (Number(withdrawAmount) < 100) return
    if (Number(withdrawAmount) > (profile?.walletBalance || 0)) return
    setLoading(true)
    try {
      await createWithdrawRequest({
        uid: user.uid, amount: Number(withdrawAmount), upiId, upiName, status: 'pending', adminNote: null, resolvedAt: null
      })
      setSuccess('Withdrawal request submitted! Will be processed within 24 hours.')
      setSheet(null)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <PageWrapper>
      <div className="px-4 pt-4 space-y-5 pb-6">
        {success && (
          <div className="bg-green-dim border border-green/30 rounded-[8px] px-4 py-3 text-green text-sm">{success}</div>
        )}

        {/* Balance Card */}
        <div className="bg-surface border border-border rounded-[8px] p-5 space-y-4">
          <p className="text-[11px] uppercase tracking-widest text-text3 font-semibold">Total Balance</p>
          <p className="font-mono text-[38px] font-bold text-text1">{formatAmount(profile?.walletBalance ?? 0)}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={() => setSheet('add')}>Add Money</Button>
            <Button variant="outline" onClick={() => setSheet('withdraw')}>Withdraw</Button>
          </div>
        </div>

        {/* Add Money Sheet */}
        {sheet === 'add' && (
          <div className="bg-surface border border-border rounded-[8px] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-display font-semibold text-text1">Add Money</p>
              <button onClick={() => setSheet(null)} className="text-text3 text-xs">Cancel</button>
            </div>
            <div className="bg-surface2 border border-border rounded-[6px] p-3 space-y-1">
              <p className="text-[11px] uppercase tracking-widest text-text3 font-semibold">Pay via UPI</p>
              <p className="font-mono text-green text-sm">{import.meta.env.VITE_ADMIN_UPI_ID}</p>
            </div>
            {import.meta.env.VITE_ADMIN_UPI_QR_URL && (
              <img src={import.meta.env.VITE_ADMIN_UPI_QR_URL} alt="QR" className="w-32 h-32 mx-auto rounded-[6px]" />
            )}
            <Input label="Amount Paid (₹)" type="number" placeholder="Enter amount" value={addAmount} onChange={e => setAddAmount(e.target.value)} inputMode="numeric" />
            <Input label="UTR / Transaction ID" placeholder="12-22 digit UTR number" value={utr} onChange={e => setUtr(e.target.value)} />
            <div>
              <p className="text-[11px] uppercase tracking-widest text-text3 font-semibold mb-2">Payment Screenshot</p>
              <UploadZone onFile={setScreenshot} />
            </div>
            <Button variant="primary" className="w-full" disabled={!addAmount || !utr || !screenshot} loading={loading} onClick={submitDeposit}>
              Submit Request
            </Button>
          </div>
        )}

        {/* Withdraw Sheet */}
        {sheet === 'withdraw' && (
          <div className="bg-surface border border-border rounded-[8px] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-display font-semibold text-text1">Withdraw</p>
              <button onClick={() => setSheet(null)} className="text-text3 text-xs">Cancel</button>
            </div>
            <div className="bg-surface2 rounded-[6px] px-3 py-2">
              <span className="text-text3 text-xs">Available: </span>
              <span className="font-mono text-sm text-text1">{formatAmount(profile?.walletBalance ?? 0)}</span>
            </div>
            <div className="relative">
              <Input label="Amount (₹)" type="number" placeholder="Min ₹100" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} inputMode="numeric" />
              <button onClick={() => setWithdrawAmount(String(profile?.walletBalance || 0))} className="absolute right-3 bottom-3 text-green text-xs font-bold">MAX</button>
            </div>
            <Input label="UPI ID" placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)} />
            <Input label="UPI Name" placeholder="Account holder name" value={upiName} onChange={e => setUpiName(e.target.value)} />
            <Button variant="primary" className="w-full" disabled={!withdrawAmount || !upiId || !upiName} loading={loading} onClick={submitWithdraw}>
              Request Withdrawal
            </Button>
            <p className="text-center text-[11px] text-text3">Minimum ₹100 · Processed within 24 hours</p>
          </div>
        )}

        {/* Transactions */}
        <div>
          <p className="text-[11px] uppercase tracking-widest text-text3 font-semibold mb-3">Transaction History</p>
          {transactions.length === 0 ? (
            <div className="bg-surface border border-border rounded-[8px] p-6 text-center">
              <p className="text-text3 text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-[8px] divide-y divide-border">
              {transactions.map(txn => (
                <div key={txn.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${txn.type === 'credit' || txn.type === 'bonus' ? 'bg-green-dim' : 'bg-red-dim'}`}>
                    {txn.type === 'credit' || txn.type === 'bonus'
                      ? <ArrowDownLeft size={14} className="text-green" />
                      : <ArrowUpRight size={14} className="text-red" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm text-text1 truncate">{txn.description}</p>
                    <p className="text-[11px] text-text3">{timeAgo(txn.timestamp)}</p>
                  </div>
                  <p className={`font-mono text-sm font-semibold shrink-0 ${txn.type === 'credit' || txn.type === 'bonus' ? 'text-green' : 'text-red'}`}>
                    {txn.type === 'credit' || txn.type === 'bonus' ? '+' : '-'}{formatAmount(txn.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
