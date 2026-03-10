import {
  doc, setDoc, getDoc, updateDoc, collection,
  addDoc, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, getDocs,
} from 'firebase/firestore'
import { db } from './config'

// Users
export const getUser = (uid) => getDoc(doc(db, 'users', uid))
export const createUser = (uid, data) => setDoc(doc(db, 'users', uid), { ...data, createdAt: serverTimestamp() })
export const updateUser = (uid, data) => updateDoc(doc(db, 'users', uid), data)

// Battles
export const createBattle = (data) => addDoc(collection(db, 'battles'), { ...data, createdAt: serverTimestamp() })
export const getBattle = (id) => getDoc(doc(db, 'battles', id))
export const updateBattle = (id, data) => updateDoc(doc(db, 'battles', id), data)
export const watchBattle = (id, cb) => onSnapshot(doc(db, 'battles', id), cb)

export const watchOpenBattles = (cb) => onSnapshot(
  query(collection(db, 'battles'), where('status', '==', 'open'), orderBy('createdAt', 'desc'), limit(50)),
  cb
)

export const watchMyBattles = (uid, cb) => onSnapshot(
  query(collection(db, 'battles'),
    where('status', 'in', ['open', 'running', 'disputed']),
    orderBy('createdAt', 'desc')
  ),
  (snap) => cb(snap.docs.filter(d => d.data().creatorId === uid || d.data().joinerId === uid))
)

// Transactions
export const watchTransactions = (uid, cb) => onSnapshot(
  query(collection(db, 'transactions'), where('uid', '==', uid), orderBy('timestamp', 'desc'), limit(20)),
  cb
)

// Deposits
export const createDepositRequest = (data) => addDoc(collection(db, 'depositRequests'), { ...data, createdAt: serverTimestamp() })
export const watchPendingDeposits = (cb) => onSnapshot(
  query(collection(db, 'depositRequests'), where('status', '==', 'pending'), orderBy('createdAt', 'desc')),
  cb
)

// Withdrawals
export const createWithdrawRequest = (data) => addDoc(collection(db, 'withdrawRequests'), { ...data, createdAt: serverTimestamp() })
export const watchPendingWithdrawals = (cb) => onSnapshot(
  query(collection(db, 'withdrawRequests'), where('status', '==', 'pending'), orderBy('createdAt', 'desc')),
  cb
)
