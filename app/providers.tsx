'use client';

import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/lib/auth';
import { ensurePersistence } from '@/lib/firebase';
import { useEffect } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensurePersistence().catch((error) => {
      console.warn('Failed to enable Firestore persistence', error);
    });
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
