import { httpsCallable } from 'firebase/functions'
import { functions } from './config'

export const onDepositApproved   = (data) => httpsCallable(functions, 'onDepositApproved')(data)
export const onDepositRejected   = (data) => httpsCallable(functions, 'onDepositRejected')(data)
export const onWithdrawalApproved = (data) => httpsCallable(functions, 'onWithdrawalApproved')(data)
export const onWithdrawalRejected = (data) => httpsCallable(functions, 'onWithdrawalRejected')(data)
export const onDisputeResolved   = (data) => httpsCallable(functions, 'onDisputeResolved')(data)
export const onRoomDeadline      = (data) => httpsCallable(functions, 'onRoomDeadline')(data)
export const onJoinBattle        = (data) => httpsCallable(functions, 'onJoinBattle')(data)
export const onCancelBattle      = (data) => httpsCallable(functions, 'onCancelBattle')(data)
export const setAdminClaim       = (data) => httpsCallable(functions, 'setAdminClaim')(data)
