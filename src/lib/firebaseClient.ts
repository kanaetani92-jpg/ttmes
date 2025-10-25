import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let firebaseApp: FirebaseApp | null = null;

function ensureFirebaseConfig(): void {
  if (!firebaseConfig.apiKey) {
    throw new Error(
      'Firebase client SDK is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables.',
    );
  }
}

export function getFirebaseApp(): FirebaseApp {
  if (typeof window === 'undefined') {
    throw new Error('getFirebaseApp can only be called in a browser environment.');
  }

  if (firebaseApp) {
    return firebaseApp;
  }

  ensureFirebaseConfig();

  firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return firebaseApp;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}
