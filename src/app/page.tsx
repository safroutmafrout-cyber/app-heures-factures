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
    if (pullAttempted.current) return;
    pullAttempted.current = true;

    async function tryPullFromCloud() {
      setAppState('syncing');
      console.log('[Zairi] Starting auto-pull from cloud...');

      // Retry up to 3 times with increasing delay
      // (session cookie might not be ready immediately after OAuth redirect)
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // Wait before retrying (0ms first, 1s second, 2s third)
          if (attempt > 1) {
            console.log(`[Zairi] Retry attempt ${attempt}... waiting ${attempt}s`);
            await new Promise(r => setTimeout(r, attempt * 1000));
          }

          const res = await fetch('/api/sheets/pull');
          console.log(`[Zairi] Pull response: ${res.status}`);

          if (res.status === 401) {
            // Session not ready yet, retry
            console.log('[Zairi] 401 - session not ready, will retry...');
            continue;
          }

          if (res.status === 404) {
            // No spreadsheet found → new user
            console.log('[Zairi] 404 - no spreadsheet found, new user');
            break;
          }

          if (res.ok) {
            const result = await res.json();
            const data = result.data;
            console.log('[Zairi] Pull data received:', {
              hasProfile: !!data?.profile?.companyName,
              clientsCount: data?.clients?.length || 0,
              entriesCount: data?.entries?.length || 0,
              invoiceNum: data?.invoiceNum,
            });

            // Check if the Sheet had any real data
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

              console.log('[Zairi] ✅ Data restored from cloud!');
              setAppState('app');
              return;
            } else {
              console.log('[Zairi] Sheet found but empty data');
              break;
            }
          }
        } catch (err) {
          console.warn(`[Zairi] Pull attempt ${attempt} error:`, err);
          if (attempt === 3) break;
        }
      }

      // No Sheet found or empty → show onboarding
      console.log('[Zairi] → Showing onboarding');
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

  // Landing page
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

  // Onboarding
  if (appState === 'onboarding') {
    return <Onboarding onComplete={() => setAppState('app')} />;
  }

  // Main app
  return <AppShell />;
}
