'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Cloud, CloudOff, RefreshCw, Check, AlertTriangle, Download } from 'lucide-react';
import { onSyncStateChange, pushToCloud, pullFromCloud } from '@/lib/sync';

export default function SyncStatus() {
  const { data: session } = useSession();
  const [syncState, setSyncState] = useState<string>('idle');
  const [message, setMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const unsubscribe = onSyncStateChange((state, msg) => {
      setSyncState(state);
      setMessage(msg || '');
    });
    return unsubscribe;
  }, []);

  if (!session) return null;

  const iconMap: Record<string, React.ReactNode> = {
    idle: <Cloud size={14} className="text-[var(--color-text-muted)]" />,
    syncing: <RefreshCw size={14} className="text-blue-400 animate-spin" />,
    synced: <Check size={14} className="text-emerald-400" />,
    error: <AlertTriangle size={14} className="text-red-400" />,
    offline: <CloudOff size={14} className="text-yellow-400" />,
  };

  const labelMap: Record<string, string> = {
    idle: '',
    syncing: 'Sync...',
    synced: '✅',
    error: '❌',
    offline: '📴',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--color-glass)] border border-[var(--color-glass-border)] hover:bg-[var(--color-glass-hover)] transition-all text-xs"
        title={message || 'Synchronisation Cloud'}
      >
        {iconMap[syncState] || iconMap.idle}
        <span className="hidden sm:inline text-[var(--color-text-muted)]">{labelMap[syncState]}</span>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl bg-[var(--color-card)] border border-[var(--color-glass-border)] shadow-2xl p-2 space-y-1">
            <div className="px-3 py-2 text-xs text-[var(--color-text-muted)] border-b border-[var(--color-glass-border)] mb-1">
              {message || 'Google Sheets Sync'}
            </div>
            <button
              onClick={() => { pushToCloud(); setShowMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white hover:bg-[var(--color-glass-hover)] transition-all"
            >
              <RefreshCw size={14} /> Synchroniser maintenant
            </button>
            <button
              onClick={() => { pullFromCloud().then(() => window.location.reload()); setShowMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white hover:bg-[var(--color-glass-hover)] transition-all"
            >
              <Download size={14} /> Restaurer depuis le cloud
            </button>
          </div>
        </>
      )}
    </div>
  );
}
