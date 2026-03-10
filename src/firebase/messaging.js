import { getToken, onMessage } from 'firebase/messaging'
import { messaging } from './config'
import { updateUser } from './firestore'

export async function requestFCMPermission(uid) {
  try {
    const msg = await messaging
    if (!msg) return null
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null
    const token = await getToken(msg, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY })
    if (token) await updateUser(uid, { fcmToken: token })
    return token
  } catch (err) {
    console.error('FCM error:', err)
    return null
  }
}

export async function onForegroundMessage(callback) {
  const msg = await messaging
  if (!msg) return () => {}
  return onMessage(msg, callback)
}
