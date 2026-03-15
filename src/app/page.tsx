'use client';

import { useState, useEffect } from 'react';
import { isOnboarded } from '@/lib/store';
import Onboarding from '@/components/Onboarding';
import AppShell from '@/components/AppShell';

export default function Home() {
  const [ready, setReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    setNeedsOnboarding(!isOnboarded());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⏱️</div>
          <p className="text-[var(--color-text-secondary)]">Chargement...</p>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return <Onboarding onComplete={() => setNeedsOnboarding(false)} />;
  }

  return <AppShell />;
}
