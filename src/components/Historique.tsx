'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getEntries, getClients, deleteEntry, getGeneratedInvoices } from '@/lib/store';
import type { InvoiceRecord } from '@/lib/store';
import { getWeekKey, getWeekRange, getDayName, money } from '@/lib/utils';
import { ClipboardList, CalendarDays, Package, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import type { TimeEntry, Client } from '@/lib/types';
import Toast from './Toast';

interface Props {
  onRefresh: () => void;
}

export default function Historique({ onRefresh }: Props) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [filterClient, setFilterClient] = useState('all');
  const [invoiceRecords, setInvoiceRecords] = useState<Record<string, InvoiceRecord>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // entry ID to confirm

  useEffect(() => {
    setEntries(getEntries());
    setClients(getClients());
    setInvoiceRecords(getGeneratedInvoices());
  }, []);

  const filtered = useMemo(() => {
    let list = entries;
    if (filterClient !== 'all') list = list.filter(e => e.clientId === filterClient);
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, filterClient]);

  const grouped = useMemo(() => {
    const weeks: Record<string, TimeEntry[]> = {};
    for (const entry of filtered) {
      const wk = getWeekKey(entry.date);
      if (!weeks[wk]) weeks[wk] = [];
      weeks[wk].push(entry);
    }
    return Object.entries(weeks).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const totalHours = filtered.reduce((s, e) => s + e.hours, 0);

  const doDelete = useCallback((id: string) => {
    deleteEntry(id);
    setEntries(getEntries());
    setConfirmDelete(null);
    setToast({ msg: 'Entrée supprimée', type: 'info' });
    onRefresh();
  }, [onRefresh]);

  const clearToast = useCallback(() => setToast(null), []);

  return (
    <div className="space-y-5">
      {/* Header + filter */}
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2"><ClipboardList size={18} className="text-[var(--color-accent-3)]" /> Historique complet</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">{filtered.length} entrées — {totalHours.toFixed(1)}h total</p>
          </div>
          {clients.length > 1 && (
            <select
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              className="px-3 py-2 bg-[var(--color-input)] border border-[var(--color-glass-border)] rounded-lg text-white text-sm outline-none"
            >
              <option value="all">Tous les clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Grouped by week */}
      {grouped.length === 0 ? (
        <div className="glass-card p-8 text-center text-[var(--color-text-muted)]">
          <div className="flex justify-center mb-2 opacity-50"><Package size={32} /></div>
          <p>Aucune entrée trouvée.</p>
        </div>
      ) : (
        grouped.map(([weekKey, weekEntries]) => {
          const weekHours = weekEntries.reduce((s, e) => s + e.hours, 0);
          // Check if any client has an invoice for this week
          const weekInvoices = weekEntries
            .map(e => e.clientId)
            .filter((v, i, a) => a.indexOf(v) === i)
            .map(cId => invoiceRecords[`${weekKey}__${cId}`])
            .filter(Boolean) as InvoiceRecord[];
          const firstInv = weekInvoices[0];
          const isLocked = !!firstInv;

          // Calculate week earnings
          const activeClient = clients.find(c => weekEntries.some(e => e.clientId === c.id));
          const rate = activeClient?.hourlyRate || 31;
          const threshold = activeClient?.overtimeThreshold || 60;
          const otMul = activeClient?.overtimeMultiplier || 1.5;
          const holidayH = weekEntries.filter(e => e.isHoliday).reduce((s, e) => s + e.hours, 0);
          const regularH = weekHours - holidayH;
          const normalH = Math.min(regularH, threshold);
          const overtimeH = Math.max(0, regularH - threshold);
          const weekEarnings = normalH * rate + overtimeH * rate * otMul + holidayH * rate * otMul;

          return (
            <div key={weekKey} className="glass-card p-4">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3 px-1">
                <h3 className="font-semibold text-sm text-[var(--color-accent-3)] flex items-center gap-1.5">
                  <CalendarDays size={14} /> Semaine du {getWeekRange(weekKey)}
                </h3>
                <div className="flex items-center gap-3">
                  {firstInv && (
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Facture #{firstInv.invoiceNumber}
                    </span>
                  )}
                  <span className="text-sm font-bold gradient-text">{weekHours.toFixed(2)}h</span>
                  <span className="text-sm font-bold text-[var(--color-success)]">{money(weekEarnings)}</span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[var(--color-glass-border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--color-accent)]/10">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Jour</th>
                      <th className="px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Début</th>
                      <th className="px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Fin</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Durée</th>
                      {!isLocked && (
                        <th className="px-3 py-2 w-10"></th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {weekEntries.sort((a, b) => a.date.localeCompare(b.date)).map(entry => (
                      <tr key={entry.id} className="border-t border-[var(--color-glass-border)] hover:bg-[var(--color-glass-hover)]">
                        <td className="px-3 py-2">{entry.date.substring(5)}</td>
                        <td className="px-3 py-2 text-[var(--color-text-secondary)]">{getDayName(entry.date, true)}</td>
                        <td className="px-3 py-2 text-center">{entry.start}</td>
                        <td className="px-3 py-2 text-center">{entry.end}</td>
                        <td className="px-3 py-2 text-right font-semibold">{entry.hours.toFixed(2)}h</td>
                        {!isLocked && (
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => setConfirmDelete(entry.id)}
                              className="w-7 h-7 rounded-lg bg-[var(--color-glass)] hover:bg-red-500/20 text-[var(--color-text-muted)] hover:text-red-400 transition-all flex items-center justify-center"
                            ><Trash2 size={13} /></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-red-400">
              <AlertTriangle size={24} />
              <h3 className="font-bold text-lg">Confirmer la suppression</h3>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Êtes-vous sûr de vouloir supprimer cette entrée ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-[var(--color-glass)] border border-[var(--color-glass-border)] hover:bg-[var(--color-glass-hover)] transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => doDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={clearToast} />}
    </div>
  );
}
