import { httpsCallable } from 'firebase/functions'
import { functions } from './config'

export const onDepositApproved   = (data) => httpsCallable(functions, 'onDepositApproved')(data)
export const onDepositRejected   = (data) => httpsCallable(functions, 'onDepositRejected')(data)
export const onWithdrawalApproved = (data) => httpsCallable(functions, 'onWithdrawalApproved')(data)
export const onWithdrawalRejected = (data) => httpsCallable(functions, 'onWithdrawalRejected')(data)
export const onDisputeResolved   = (data) => httpsCallable(functions, 'onDisputeResolved')(data)
export const onRoomDeadline      = (data) => httpsCallable(functions, 'onRoomDeadline')(data)
