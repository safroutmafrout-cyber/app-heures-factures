'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { isOnboarded, saveProfile, saveClients, saveEntries, setInvoiceNumber, saveAllGeneratedInvoices } from '@/lib/store';
import Onboarding from '@/components/Onboarding';
import AppShell from '@/components/AppShell';
import LandingPage from '@/components/LandingPage';

type AppState = 'loading' | 'landing' | 'syncing' | 'onboarding' | 'app';

export default function Home() {
  const { data: session, status: authStatus } = useSession();
  const [appState, setAppState] = useState<AppState>('loading');

  const tryPullFromCloud = useCallback(async () => {
    // Already onboarded locally? Go straight to app
    if (isOnboarded()) {
      setAppState('app');
      return;
    }

    // Not logged in → landing page
    if (!(session as any)?.accessToken) {
      setAppState('landing');
      return;
    }

    // Logged in but no local data → try pulling from Google Sheet
    setAppState('syncing');

    try {
      const res = await fetch('/api/sheets/pull');

      if (res.ok) {
        const result = await res.json();
        const data = result.data;

        // Check if the Sheet had real data
        if (data?.profile && data.profile.companyName) {
          // Restore all data to localStorage
          saveProfile(data.profile);
          if (data.clients?.length > 0) saveClients(data.clients);
          if (data.entries?.length > 0) saveEntries(data.entries);
          if (data.invoiceNum) setInvoiceNumber(data.invoiceNum);
          if (data.invoices && Object.keys(data.invoices).length > 0) {
            saveAllGeneratedInvoices(data.invoices);
          }
          // Mark as onboarded since we successfully restored from cloud
          const { setOnboarded } = await import('@/lib/store');
          setOnboarded();

          setAppState('app');
          return;
        }
      }
    } catch (err) {
      console.warn('Auto-pull failed, showing onboarding:', err);
    }

    // No Sheet found or empty → show onboarding
    setAppState('onboarding');
  }, [session]);

  useEffect(() => {
    if (authStatus === 'loading') return;

    if (authStatus === 'unauthenticated') {
      // Not logged in — show landing if no local data, app if has local data
      if (isOnboarded()) {
        setAppState('app');
      } else {
        setAppState('landing');
      }
      return;
    }

    // Authenticated → try cloud pull
    tryPullFromCloud();
  }, [authStatus, tryPullFromCloud]);

  // Loading state
  if (appState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="landing-logo mx-auto mb-4">
            <span className="landing-logo-letter">Z</span>
          </div>
          <p className="text-sm text-[var(--color-text-muted)] animate-pulse">Chargement...</p>
        </div>
      </div>
    );
  }

  // Landing page (not logged in, no local data)
  if (appState === 'landing') {
    return <LandingPage />;
  }

  // Syncing from Cloud
  if (appState === 'syncing') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="landing-logo mx-auto mb-6 animate-pulse">
            <span className="landing-logo-letter">Z</span>
          </div>
          <p className="text-white font-semibold mb-2">Récupération de vos données...</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Recherche de votre sauvegarde Google Sheets
          </p>
          <div className="mt-4 w-48 mx-auto h-1 rounded-full bg-[var(--color-glass)] overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 animate-[shimmer_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  // Onboarding (new user)
  if (appState === 'onboarding') {
    return <Onboarding onComplete={() => setAppState('app')} />;
  }

  // Main app
  return <AppShell />;
}
