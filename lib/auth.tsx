'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  type User,
  type Auth
} from 'firebase/auth';
import { getFirebaseServices } from './firebase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  auth: Auth | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { auth: authInstance } = getFirebaseServices();
    setAuth(authInstance);

    let unsub = () => {};
    unsub = onAuthStateChanged(authInstance, async (current) => {
      if (!current) {
        try {
          await signInAnonymously(authInstance);
        } catch (error) {
          console.error('Anonymous sign-in failed', error);
        }
        return;
      }

      setUser(current);
      setLoading(false);
    });

    if (!authInstance.currentUser) {
      signInAnonymously(authInstance).catch((error) => {
        console.error('Anonymous sign-in failed', error);
      });
    }

    return () => {
      unsub();
    };
  }, []);

  const value = useMemo(() => ({ user, loading, auth }), [user, loading, auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthUser() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthUser must be used within AuthProvider');
  }
  return ctx;
}
