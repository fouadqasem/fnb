'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
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

const globalForFirebase = globalThis as typeof globalThis & {
  __FNB_FIREBASE__?: FirebaseServices;
};

let services: FirebaseServices | null = globalForFirebase.__FNB_FIREBASE__ ?? null;

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

  services = { app, db, auth };
  globalForFirebase.__FNB_FIREBASE__ = services;
  return services;
}

export async function ensurePersistence() {
  return getFirebaseServices();

}
