import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const apiKey = (import.meta as any).env.VITE_FIREBASE_API_KEY

let app: FirebaseApp | null = null
let auth: Auth | null = null
let messaging: ReturnType<typeof getMessaging> | null = null
let googleProvider: GoogleAuthProvider | null = null

if (apiKey) {
  const firebaseConfig = {
    apiKey,
    authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: (import.meta as any).env.VITE_FIREBASE_APP_ID,
  }
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  auth = getAuth(app)
  googleProvider = new GoogleAuthProvider()
  try {
    messaging = getMessaging(app)
  } catch {
    // FCM not supported in this environment
  }
}

export { auth, googleProvider, messaging }

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
