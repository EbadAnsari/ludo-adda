import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { formatAmount } from '../../utils/currency'
import { ChevronLeft, Search } from 'lucide-react'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    return onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100)), snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const filtered = search
    ? users.filter(u => u.username?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search))
    : users

  return (
    <AdminLayout>
      <div className="px-4 pt-4 space-y-4 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="text-text3 text-sm flex items-center gap-1"><ChevronLeft size={14} />Back</button>
          <h1 className="font-display font-bold text-lg text-text1">Users</h1>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
          <input
            type="text"
            placeholder="Search username or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface border border-border rounded-[6px] pl-8 pr-4 py-3 text-text1 text-sm outline-none focus:border-border2 transition-colors placeholder:text-text3 font-display"
          />
        </div>
        <div className="bg-surface border border-border rounded-[8px] divide-y divide-border">
          {filtered.map(u => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-display font-semibold text-sm text-text1">{u.username}</p>
                <p className="text-[11px] text-text3">{u.phone}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm text-text1">{formatAmount(u.walletBalance ?? 0)}</p>
                <p className="text-[11px] text-green">{u.winRate ?? 0}% WR</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
