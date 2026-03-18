import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { collection, query, where, onSnapshot, getCountFromServer } from 'firebase/firestore'
import { db } from '../../firebase/config'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ deposits: 0, withdrawals: 0, disputes: 0 })

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'depositRequests'), where('status', '==', 'pending')), s => setStats(p => ({ ...p, deposits: s.size })))
    const u2 = onSnapshot(query(collection(db, 'withdrawRequests'), where('status', '==', 'pending')), s => setStats(p => ({ ...p, withdrawals: s.size })))
    const u3 = onSnapshot(query(collection(db, 'battles'), where('status', '==', 'disputed')), s => setStats(p => ({ ...p, disputes: s.size })))
    return () => { u1(); u2(); u3() }
  }, [])

  const tabs = [
    { label: 'Deposits', count: stats.deposits, path: '/admin/deposits', color: 'text-green' },
    { label: 'Withdrawals', count: stats.withdrawals, path: '/admin/withdrawals', color: 'text-amber' },
    { label: 'Disputes', count: stats.disputes, path: '/admin/disputes', color: 'text-red' },
    { label: 'Battles', count: null, path: '/admin/battles', color: 'text-blue' },
    { label: 'Users', count: null, path: '/admin/users', color: 'text-text2' },
  ]

  return (
    <AdminLayout>
      <div className="px-4 pt-4 space-y-5 pb-6">
        <h1 className="font-display font-bold text-xl text-text1">Dashboard</h1>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {tabs.map(({ label, count, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="btn-press bg-surface border border-border rounded-[6px] px-4 py-3 min-w-[90px] text-left shrink-0 hover:border-border2 transition-colors"
            >
              {count !== null && <p className={`font-mono text-lg font-bold ${color}`}>{count}</p>}
              <p className="text-[10px] uppercase tracking-widest text-text3 font-semibold mt-0.5">{label}</p>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2">
          {tabs.map(({ label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="w-full bg-surface border border-border rounded-[8px] px-4 py-3 flex items-center justify-between hover:border-border2 transition-colors"
            >
              <span className="font-display font-medium text-sm text-text1">{label}</span>
              <span className="text-text3 text-xs">→</span>
            </button>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
