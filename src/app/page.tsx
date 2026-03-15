'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { isOnboarded, saveProfile, saveClients, saveEntries, setInvoiceNumber, saveAllGeneratedInvoices, setOnboarded } from '@/lib/store';
import Onboarding from '@/components/Onboarding';
import AppShell from '@/components/AppShell';
import LandingPage from '@/components/LandingPage';

type AppState = 'loading' | 'landing' | 'syncing' | 'onboarding' | 'app';

export default function Home() {
  const { data: session, status: authStatus } = useSession();
  const [appState, setAppState] = useState<AppState>('loading');
  const pullAttempted = useRef(false);

  useEffect(() => {
    if (authStatus === 'loading') return;

    // Already onboarded locally? Always go to app
    if (isOnboarded()) {
      setAppState('app');
      return;
    }

    // Not authenticated → show landing page
    if (authStatus === 'unauthenticated') {
      setAppState('landing');
      return;
    }

    // Authenticated but no local data → try pulling from Google Sheet
    // Only attempt once per session to avoid loops
    if (pullAttempted.current) return;
    pullAttempted.current = true;

    async function tryPullFromCloud() {
      setAppState('syncing');

      try {
        const res = await fetch('/api/sheets/pull');

        if (res.ok) {
          const result = await res.json();
          const data = result.data;

          // Check if the Sheet had any real data (profile, clients, or entries)
          const hasProfile = data?.profile && data.profile.companyName;
          const hasClients = data?.clients?.length > 0;
          const hasEntries = data?.entries?.length > 0;

          if (hasProfile || hasClients || hasEntries) {
            // Restore all data to localStorage
            if (data.profile) saveProfile(data.profile);
            if (hasClients) saveClients(data.clients);
            if (hasEntries) saveEntries(data.entries);
            if (data.invoiceNum) setInvoiceNumber(data.invoiceNum);
            if (data.invoices && Object.keys(data.invoices).length > 0) {
              saveAllGeneratedInvoices(data.invoices);
            }
            setOnboarded();

            setAppState('app');
            return;
          }
        }

        // If pull returned 404 or empty profile → onboarding
        console.log('No existing Sheet found or empty profile, showing onboarding');
      } catch (err) {
        console.warn('Auto-pull failed:', err);
      }

      setAppState('onboarding');
    }

    tryPullFromCloud();
  }, [authStatus, session]);

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
