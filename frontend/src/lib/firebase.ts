import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID,
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

let messaging: ReturnType<typeof getMessaging> | null = null
try {
  messaging = getMessaging(app)
} catch {
  // FCM not available in non-browser environments
}
export { messaging }

export async function requestFcmToken(): Promise<string | null> {
  if (!messaging) return null
  try {
    const token = await getToken(messaging, {
      vapidKey: (import.meta as any).env.VITE_FIREBASE_VAPID_KEY,
    })
    return token || null
  } catch {
    return null
  }
}

export function onForegroundMessage(cb: (payload: unknown) => void) {
  if (!messaging) return () => {}
  return onMessage(messaging, cb)
}
