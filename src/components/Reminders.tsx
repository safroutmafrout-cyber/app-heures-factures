'use client';

import { useState, useEffect } from 'react';
import { getEntries, getClients } from '@/lib/store';
import { getCurrentWeekKey, getWeekKey } from '@/lib/utils';
import { Bell, X, Clock } from 'lucide-react';

const REMINDER_KEY = 'hf_last_reminder_dismiss';

interface Reminder {
  type: 'friday' | 'sunday' | 'missing';
  message: string;
}

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user dismissed today already
    const lastDismiss = localStorage.getItem(REMINDER_KEY);
    const today = new Date().toISOString().split('T')[0];
    if (lastDismiss === today) {
      setDismissed(true);
      return;
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday, 5=Friday, 6=Saturday
    const currentWeekKey = getCurrentWeekKey();
    const entries = getEntries();
    const clients = getClients();

    const weekEntries = entries.filter(e => getWeekKey(e.date) === currentWeekKey);
    const totalHours = weekEntries.reduce((s, e) => s + e.hours, 0);

    const newReminders: Reminder[] = [];

    // Friday/Saturday reminder
    if ((dayOfWeek === 5 || dayOfWeek === 6) && totalHours === 0) {
      newReminders.push({
        type: 'friday',
        message: '📅 La fin de semaine approche ! N\'oublie pas d\'entrer tes heures.',
      });
    }

    // Sunday reminder
    if (dayOfWeek === 0 && totalHours === 0) {
      newReminders.push({
        type: 'sunday',
        message: '⏰ La semaine se termine aujourd\'hui ! As-tu entré toutes tes heures ?',
      });
    }

    // Missing hours for previous week (Monday check)
    if (dayOfWeek === 1) {
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekKey = getWeekKey(lastWeek.toISOString().split('T')[0]);
      const lastWeekEntries = entries.filter(e => getWeekKey(e.date) === lastWeekKey);
      
      if (lastWeekEntries.length === 0) {
        newReminders.push({
          type: 'missing',
          message: '⚠️ Aucune heure enregistrée la semaine dernière ! Pense à les ajouter.',
        });
      }
    }

    // Multi-client reminder: if has multiple clients but only logging for one
    if (clients.length > 1 && weekEntries.length > 0) {
      const clientsWithEntries = new Set(weekEntries.map(e => e.clientId));
      if (clientsWithEntries.size < clients.length) {
        const missingClients = clients.filter(c => !clientsWithEntries.has(c.id));
        newReminders.push({
          type: 'missing',
          message: `💼 Tu n'as pas d'heures pour ${missingClients.map(c => c.name).join(', ')} cette semaine.`,
        });
      }
    }

    setReminders(newReminders);
  }, []);

  function handleDismiss() {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(REMINDER_KEY, today);
    setDismissed(true);
  }

  if (dismissed || reminders.length === 0) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 mb-4">
      {reminders.map((r, i) => (
        <div
          key={i}
          className="glass-card p-4 mb-2 flex items-center justify-between border-yellow-500/20"
          style={{ animation: `landing-appear 0.5s ease-out ${i * 0.1}s both` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
              <Bell size={16} className="text-yellow-400" />
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">{r.message}</p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:bg-[var(--color-glass-hover)] text-[var(--color-text-muted)] shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
