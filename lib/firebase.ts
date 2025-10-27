'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  enableIndexedDbPersistence,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore
} from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

type FirebaseServices = {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
};

let services: FirebaseServices | null = null;
let persistencePromise: Promise<void> | null = null;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

function createApp(): FirebaseApp {
  if (!firebaseConfig.apiKey) {
    throw new Error('Missing Firebase configuration. Check environment variables.');
  }

  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }

  return getApps()[0]!;
}

export function getFirebaseServices(): FirebaseServices {
  if (services) {
    return services;
  }

  const app = createApp();
  // Initialize Firestore with persistent cache when on the client.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  const auth = getAuth(app);

  if (typeof window !== 'undefined' && !persistencePromise) {
    persistencePromise = enableIndexedDbPersistence(db).catch(() => {
      // Ignore persistence errors (likely already enabled in another tab).
    });
  }

  services = { app, db, auth };
  return services;
}

export async function ensurePersistence() {
  const current = getFirebaseServices();
  if (persistencePromise) {
    await persistencePromise.catch(() => undefined);
  }
  return current;
}
