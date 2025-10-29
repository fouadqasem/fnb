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

    let anonymousUnsupported = false;

    const handleAnonymousError = (error: unknown) => {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';

      if (code === 'auth/configuration-not-found') {
        anonymousUnsupported = true;
        console.warn('Anonymous auth is not enabled. Continuing without authentication.');
        setLoading(false);
        return;
      }

      console.error('Anonymous sign-in failed', error);
    };

    const signInIfSupported = async () => {
      if (anonymousUnsupported) {
        setLoading(false);
        return;
      }

      try {
        await signInAnonymously(authInstance);
      } catch (error) {
        handleAnonymousError(error);
      }
    };

    const unsub = onAuthStateChanged(authInstance, (current) => {
      if (current) {
        setUser(current);
        setLoading(false);
        return;
      }

      if (anonymousUnsupported) {
        setUser(null);
        setLoading(false);
        return;
      }

      void signInIfSupported();
    });

    if (!authInstance.currentUser) {
      void signInIfSupported();
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
