import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from './config'

export function setupRecaptcha(containerId) {
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear()
  }
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {},
  })
  return window.recaptchaVerifier
}

export async function sendOTP(phoneNumber) {
  const verifier = setupRecaptcha('recaptcha-container')
  const result = await signInWithPhoneNumber(auth, phoneNumber, verifier)
  window.confirmationResult = result
  return result
}

export async function verifyOTP(code) {
  if (!window.confirmationResult) throw new Error('No OTP sent')
  return await window.confirmationResult.confirm(code)
}

export function signOut() {
  return firebaseSignOut(auth)
}
