'use client';

// ── Cloud Sync Module ─────────────────────────────────
// Syncs localStorage data to Google Sheets via API routes

type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
type SyncListener = (state: SyncState, message?: string) => void;

const listeners: Set<SyncListener> = new Set();
let currentState: SyncState = 'idle';
let syncTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 3000;

function notifyListeners(state: SyncState, message?: string) {
  currentState = state;
  listeners.forEach(fn => fn(state, message));
}

export function onSyncStateChange(listener: SyncListener): () => void {
  listeners.add(listener);
  // Immediately fire with current state
  listener(currentState);
  return () => listeners.delete(listener);
}

export function getSyncState(): SyncState {
  return currentState;
}

// Gather all localStorage data for sync
function gatherData() {
  return {
    profile: JSON.parse(localStorage.getItem('hf_profile') || 'null'),
    clients: JSON.parse(localStorage.getItem('hf_clients') || '[]'),
    entries: JSON.parse(localStorage.getItem('hf_entries') || '[]'),
    invoices: JSON.parse(localStorage.getItem('hf_generated_invoices') || '{}'),
    invoiceNum: parseInt(localStorage.getItem('hf_invoice_num') || '1001'),
    spreadsheetId: localStorage.getItem('hf_sheet_id') || null,
  };
}

// Push all data to Google Sheets
export async function pushToCloud(): Promise<boolean> {
  try {
    notifyListeners('syncing');

    const data = gatherData();

    const res = await fetch('/api/sheets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      if (res.status === 401) {
        notifyListeners('idle', 'Non connecté');
        return false;
      }
      throw new Error(err.error || 'Erreur sync');
    }

    const result = await res.json();

    // Save the spreadsheet ID for future syncs
    if (result.spreadsheetId) {
      localStorage.setItem('hf_sheet_id', result.spreadsheetId);
    }

    notifyListeners('synced', 'Synchronisé ✅');
    return true;
  } catch (error: any) {
    if (!navigator.onLine) {
      notifyListeners('offline', 'Hors ligne — sauvé localement');
    } else {
      notifyListeners('error', error.message || 'Erreur de synchronisation');
    }
    return false;
  }
}

// Pull data from Google Sheets into localStorage
export async function pullFromCloud(): Promise<boolean> {
  try {
    notifyListeners('syncing');

    const sheetId = localStorage.getItem('hf_sheet_id') || '';
    const url = sheetId ? `/api/sheets/pull?spreadsheetId=${sheetId}` : '/api/sheets/pull';

    const res = await fetch(url);

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erreur de récupération');
    }

    const result = await res.json();
    const data = result.data;

    // Write everything to localStorage
    if (data.profile) {
      localStorage.setItem('hf_profile', JSON.stringify(data.profile));
    }
    if (data.clients) {
      localStorage.setItem('hf_clients', JSON.stringify(data.clients));
    }
    if (data.entries) {
      localStorage.setItem('hf_entries', JSON.stringify(data.entries));
    }
    if (data.invoices) {
      localStorage.setItem('hf_generated_invoices', JSON.stringify(data.invoices));
    }
    if (data.invoiceNum) {
      localStorage.setItem('hf_invoice_num', String(data.invoiceNum));
    }
    if (result.spreadsheetId) {
      localStorage.setItem('hf_sheet_id', result.spreadsheetId);
    }

    notifyListeners('synced', 'Données restaurées depuis le cloud ✅');
    return true;
  } catch (error: any) {
    notifyListeners('error', error.message || 'Erreur de récupération');
    return false;
  }
}

// Debounced auto-sync (call after each write)
export function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    pushToCloud();
  }, DEBOUNCE_MS);
}

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    notifyListeners('idle', 'Connexion rétablie');
    pushToCloud();
  });
  window.addEventListener('offline', () => {
    notifyListeners('offline', 'Hors ligne — sauvé localement');
  });
}
