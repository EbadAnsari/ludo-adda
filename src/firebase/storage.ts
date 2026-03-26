import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './config'

export async function uploadScreenshot(battleId: string, uid: string, file: File): Promise<string> {
  const timestamp = Date.now()
  // Path matches storage rule: uid is extractable from filename
  const path = `screenshots/${battleId}/${uid}_${timestamp}.jpg`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export async function uploadDepositScreenshot(uid: string, file: File): Promise<string> {
  const timestamp = Date.now()
  const path = `screenshots/deposits/${uid}/${timestamp}.jpg`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}
