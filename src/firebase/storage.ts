import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './config'

export async function uploadScreenshot(battleId, uid, file) {
  const timestamp = Date.now()
  const path = `screenshots/${battleId}/${uid}_${timestamp}.jpg`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}
