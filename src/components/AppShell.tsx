'use client';

import { useState, useCallback } from 'react';
import { LayoutDashboard, ClipboardList, FileText, Settings } from 'lucide-react';
import Dashboard from './Dashboard';
import Historique from './Historique';
import Factures from './Factures';
import Parametres from './Parametres';
import AuthButton from './AuthButton';
import SyncStatus from './SyncStatus';
import Reminders from './Reminders';

const TABS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'historique', icon: ClipboardList, label: 'Historique' },
  { id: 'factures', icon: FileText, label: 'Factures' },
  { id: 'parametres', icon: Settings, label: 'Réglages' },
];

export default function AppShell() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <div className="relative z-1 min-h-screen pb-20 md:pb-8">
      {/* Header */}
      <header className="pt-6 pb-4 px-4 no-print relative">
        <div className="absolute right-4 top-6 flex items-center gap-2">
          <SyncStatus />
          <AuthButton />
        </div>
        <div className="flex items-center gap-2.5 pl-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-white font-extrabold text-sm">Z</span>
          </div>
          <div>
            <h1 className="text-lg font-extrabold gradient-text leading-tight">Zairi</h1>
            <p className="text-[10px] text-[var(--color-text-muted)] font-medium tracking-wider uppercase">Heures & Factures</p>
          </div>
        </div>
      </header>

      {/* Reminders */}
      <Reminders />

      {/* Desktop Tab Nav */}
      <nav className="hidden md:flex max-w-xl mx-auto mb-6 p-1 rounded-2xl bg-[var(--color-glass)] border border-[var(--color-glass-border)] backdrop-blur-xl no-print">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-300
                ${activeTab === tab.id
                  ? 'btn-gradient'
                  : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-glass-hover)]'
                }`}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4">
        {activeTab === 'dashboard' && <Dashboard key={refreshKey} onRefresh={refresh} />}
        {activeTab === 'historique' && <Historique key={refreshKey} onRefresh={refresh} />}
        {activeTab === 'factures' && <Factures key={refreshKey} />}
        {activeTab === 'parametres' && <Parametres onRefresh={refresh} />}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav md:hidden flex justify-around py-2">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-[10px] font-semibold transition-all min-w-0
                ${activeTab === tab.id
                  ? 'text-[var(--color-accent-3)]'
                  : 'text-[var(--color-text-muted)]'
                }`}
            >
              <Icon size={18} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
