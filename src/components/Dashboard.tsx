'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getEntries, getClients, getProfile, addEntry, deleteEntry, getGeneratedInvoices, getInvoiceForWeek } from '@/lib/store';
import { calcHours, getCurrentWeekKey, getWeekKey, getWeekRange, getDayName, money, generateId } from '@/lib/utils';
import { isQuebecHoliday } from '@/lib/holidays';
import { Clock, DollarSign, Zap, Trophy, TrendingUp, Target, Receipt, CalendarDays, Plus, BarChart3, Bell, Package, Trash2, Lock, AlertTriangle, Landmark } from 'lucide-react';
import type { TimeEntry, Client, UserProfile } from '@/lib/types';
import Toast from './Toast';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';

interface Props {
  onRefresh: () => void;
}

type Period = 'week' | 'month' | 'year' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Cette semaine',
  month: 'Ce mois',
  year: 'Cette année',
  all: 'Tout',
};




export default function Dashboard({ onRefresh }: Props) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [period, setPeriod] = useState<Period>('month');

  // Quick add form state
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [start, setStart] = useState('14:00');
  const [end, setEnd] = useState('');
  const [manualHours, setManualHours] = useState('');
  const [clientId, setClientId] = useState('');
  const [holidayAlert, setHolidayAlert] = useState<string | null>(null);
  const [holidayIsOT, setHolidayIsOT] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setEntries(getEntries());
    setProfile(getProfile());
    const c = getClients();
    setClients(c);
    if (c.length > 0 && !clientId) setClientId(c[0].id);
  }, [clientId]);

  useEffect(() => {
    const holiday = isQuebecHoliday(date);
    setHolidayAlert(holiday ? holiday.name : null);
    setHolidayIsOT(true); // default to OT, but user can toggle
  }, [date]);

  const activeClient = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);

  // Current week entries (always shown)
  const currentWeekKey = getCurrentWeekKey();
  const weekEntries = useMemo(() =>
    entries.filter(e => getWeekKey(e.date) === currentWeekKey).sort((a, b) => a.date.localeCompare(b.date)),
    [entries, currentWeekKey]
  );

  // Filtered entries by period
  const periodEntries = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYear = `${now.getFullYear()}`;

    switch (period) {
      case 'week': return entries.filter(e => getWeekKey(e.date) === currentWeekKey);
      case 'month': return entries.filter(e => e.date.startsWith(currentMonth));
      case 'year': return entries.filter(e => e.date.startsWith(currentYear));
      case 'all': return entries;
    }
  }, [entries, period, currentWeekKey]);

  // Metrics
  const metrics = useMemo(() => {
    const threshold = activeClient?.overtimeThreshold || 60;
    const rate = activeClient?.hourlyRate || 31;
    const otMultiplier = activeClient?.overtimeMultiplier || 1.5;

    // Current week
    const weekHours = weekEntries.reduce((s, e) => s + e.hours, 0);
    const normalH = Math.min(weekHours, threshold);
    const overtimeH = Math.max(0, weekHours - threshold);
    const weekEarnings = normalH * rate + overtimeH * rate * otMultiplier;

    // Period
    const periodHours = periodEntries.reduce((s, e) => s + e.hours, 0);
    const periodHolidayH = periodEntries.filter(e => e.isHoliday).reduce((s, e) => s + e.hours, 0);

    // Calculate period earnings properly per-week
    const weekGroups: Record<string, TimeEntry[]> = {};
    for (const e of periodEntries) {
      const wk = getWeekKey(e.date);
      if (!weekGroups[wk]) weekGroups[wk] = [];
      weekGroups[wk].push(e);
    }
    let periodEarnings = 0;
    let periodOvertimeH = 0;
    const weekHoursList: {wk: string, hours: number}[] = [];
    for (const [wk, wkEntries] of Object.entries(weekGroups)) {
      const wkHours = wkEntries.reduce((s, e) => s + e.hours, 0);
      weekHoursList.push({ wk, hours: wkHours });
      const wkHolidayH = wkEntries.filter(e => e.isHoliday).reduce((s, e) => s + e.hours, 0);
      const wkRegular = wkHours - wkHolidayH;
      const wkNormal = Math.min(wkRegular, threshold);
      const wkOT = Math.max(0, wkRegular - threshold);
      periodOvertimeH += wkOT;
      periodEarnings += wkNormal * rate + wkOT * rate * otMultiplier + wkHolidayH * rate * otMultiplier;
    }

    const totalWeeks = weekHoursList.length;
    const avgPerWeek = totalWeeks > 0 ? periodHours / totalWeeks : 0;
    const maxWeek = weekHoursList.length > 0 ? Math.max(...weekHoursList.map(w => w.hours)) : 0;
    
    // For minWeek, exclude the current week because it's usually incomplete
    // Additionally, exclude the first 2 chronological weeks (training period)
    const sortedPastWeeks = [...weekHoursList]
      .filter(w => w.wk !== currentWeekKey)
      .sort((a, b) => a.wk.localeCompare(b.wk)); // Ensure chronological order
      
    const effectivePastWeeks = sortedPastWeeks.slice(2); // Drop the first 2 weeks
    
    // Only show min week if we have at least 1 valid week left to analyze 
    // (meaning they have been working for at least 4 weeks including current)
    const minWeek = effectivePastWeeks.length > 0 ? Math.min(...effectivePastWeeks.map(w => w.hours)) : null;

    // Invoice count vs ALL-TIME total weeks (not filtered by period)
    const invoiceRecords = getGeneratedInvoices();
    const invoiceCount = Object.keys(invoiceRecords).length;
    const allTimeWeekSet = new Set(entries.map(e => getWeekKey(e.date)));
    const allTimeWeeks = allTimeWeekSet.size;
    const missingInvoices = Math.max(0, allTimeWeeks - invoiceCount);

    const periodTps = periodEarnings * 0.05;
    const periodTvq = periodEarnings * 0.09975;
    const periodTotalWithTaxes = periodEarnings + periodTps + periodTvq;

    return {
      weekHours, weekEarnings, threshold, normalH, overtimeH,
      progress: Math.min(weekHours / threshold, 1.5),
      periodHours, periodEarnings, periodOvertimeH, periodHolidayH,
      totalWeeks, pastWeeksCount: sortedPastWeeks.length, avgPerWeek, maxWeek, minWeek, invoiceCount, missingInvoices, allTimeWeeks,
      rate, periodTps, periodTvq, periodTotalWithTaxes
    };
  }, [entries, weekEntries, periodEntries, activeClient]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return;

    // Determine hours: from start/end or manual
    const hasStartEnd = start && end;
    const manualH = parseFloat(manualHours);
    const hasManual = !isNaN(manualH) && manualH > 0;

    if (!hasStartEnd && !hasManual) {
      setToast({ msg: 'Entrez les heures de début/fin ou la durée manuellement.', type: 'error' });
      return;
    }

    // Check if the date's week has an invoice
    const targetWeek = getWeekKey(date);
    const invoiceForWeek = getInvoiceForWeek(targetWeek, clientId);
    if (invoiceForWeek) {
      setToast({ msg: `Cette semaine a déjà une facture (#${invoiceForWeek.invoiceNumber}). Impossible d'ajouter.`, type: 'error' });
      return;
    }

    const hours = hasStartEnd ? calcHours(start, end) : manualH;
    const isHoliday = !!holidayAlert && holidayIsOT;
    addEntry({
      date,
      start: hasStartEnd ? start : '',
      end: hasStartEnd ? end : '',
      hours,
      clientId,
      isHoliday,
      notes: holidayAlert && !holidayIsOT ? `${holidayAlert} (taux normal)` : '',
    });
    setEntries(getEntries());
    setToast({ msg: `✅ ${hours.toFixed(2)}h ajoutées${isHoliday ? ' (Férié)' : ''}`, type: 'success' });
    setEnd('');
    setManualHours('');
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split('T')[0]);
    onRefresh();
  }

  const duration = end ? calcHours(start, end) : (parseFloat(manualHours) || null);

  function getBarColor(progress: number) {
    if (progress >= 1) return 'bg-gradient-to-r from-red-500 to-orange-500';
    if (progress >= 0.8) return 'bg-gradient-to-r from-yellow-500 to-orange-400';
    return 'bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)]';
  }

  // Check if current week is invoiced
  const currentWeekInvoiced = clientId ? getInvoiceForWeek(currentWeekKey, clientId) : null;

  function handleDelete(id: string) {
    deleteEntry(id);
    setEntries(getEntries());
    setConfirmDelete(null);
    setToast({ msg: 'Entrée supprimée', type: 'info' });
    onRefresh();
  }

  const clearToast = useCallback(() => setToast(null), []);

  return (
    <div className="space-y-5">
      {/* User Header */}
      {profile && (
        <div className="flex items-center gap-3 px-1 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {(profile.companyName || profile.fullName).charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">{profile.companyName || profile.fullName}</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {profile.fullName} {activeClient ? `• Client: ${activeClient.name}` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Overtime Progress — always current week */}
      <div className="glass-card p-5">
        <div className="flex justify-between items-baseline mb-2">
          <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-2">
            <CalendarDays size={16} className="text-[var(--color-accent-3)]" /> Semaine du {getWeekRange(currentWeekKey)}
          </h2>
          <span className="text-lg font-extrabold gradient-text">
            {metrics.weekHours.toFixed(1)}h / {metrics.threshold}h
          </span>
        </div>
        <div className="overtime-bar-track">
          <div
            className={`overtime-bar-fill ${getBarColor(metrics.progress)}`}
            style={{ width: `${Math.min(metrics.progress * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-[var(--color-text-muted)]">
          <span>{metrics.normalH.toFixed(1)}h normales</span>
          {metrics.overtimeH > 0 && (
            <span className="text-orange-400 font-semibold">
              <Zap size={14} className="inline" /> {metrics.overtimeH.toFixed(1)}h overtime (1.5x)
            </span>
          )}
          <span className="font-semibold text-[var(--color-success)]">{money(metrics.weekEarnings)}</span>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-1.5 p-1 rounded-2xl bg-[var(--color-glass)] border border-[var(--color-glass-border)]">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-300
              ${period === p
                ? 'btn-gradient'
                : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-glass-hover)]'
              }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Clock size={20} />} label="Heures" value={`${metrics.periodHours.toFixed(1)}h`} sub={`${metrics.totalWeeks} semaine${metrics.totalWeeks > 1 ? 's' : ''}`} color="text-blue-400" />
        <StatCard icon={<DollarSign size={20} />} label="Revenus" value={money(metrics.periodEarnings)} sub={`à ${money(metrics.rate)}/h`} color="text-emerald-400" />
        <StatCard icon={<Landmark size={20} />} label="TPS + TVQ" value={money(metrics.periodTps + metrics.periodTvq)} sub={`TPS ${money(metrics.periodTps)} · TVQ ${money(metrics.periodTvq)}`} color="text-indigo-400" />
        <StatCard icon={<Target size={20} />} label="Total + Taxes" value={money(metrics.periodTotalWithTaxes)} sub="Revenus nets" color="text-[#b19cd9]" />
        
        <StatCard icon={<Zap size={20} />} label="Overtime" value={`${metrics.periodOvertimeH.toFixed(1)}h`} sub={money(metrics.periodOvertimeH * metrics.rate * 1.5)} color="text-orange-400" />
        <StatCard icon={<Trophy size={20} />} label="Max semaine" value={`${metrics.maxWeek.toFixed(1)}h`} sub={metrics.totalWeeks > 0 ? (metrics.maxWeek > metrics.threshold ? 'Overtime' : 'Normal') : '-'} color="text-yellow-400" />
        <StatCard icon={<BarChart3 size={20} />} label="Min semaine" value={metrics.minWeek !== null ? `${metrics.minWeek.toFixed(1)}h` : 'N/A'} sub={metrics.minWeek !== null ? 'Moins actif' : 'Pas assez de recul'} color="text-red-400" />
        <StatCard icon={<TrendingUp size={20} />} label="Moy/semaine" value={`${metrics.avgPerWeek.toFixed(1)}h`} sub={money(metrics.avgPerWeek * metrics.rate)} color="text-purple-400" />
        
        <StatCard icon={<Receipt size={20} />} label="Factures" value={`${metrics.invoiceCount}/${metrics.allTimeWeeks}`} sub={metrics.missingInvoices > 0 ? `${metrics.missingInvoices} manquante${metrics.missingInvoices > 1 ? 's' : ''}` : 'À jour ✅'} color="text-cyan-400" />
        <StatCard icon={<CalendarDays size={20} />} label="Jours fériés" value={`${metrics.periodHolidayH.toFixed(1)}h`} sub={money(metrics.periodHolidayH * metrics.rate * 1.5)} color="text-pink-400" />
      </div>

      {/* Quick Add Form */}
      <div className="glass-card p-5 relative z-50" style={{ overflow: 'visible' }}>
        <h3 className="font-bold flex items-center gap-2 mb-4">
          <Plus size={18} className="text-[var(--color-accent-3)]" /> Ajouter des heures
        </h3>

        {holidayAlert && (
          <div className="mb-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="text-yellow-300 text-sm mb-3 flex items-center gap-2">
              <Bell size={16} /> <strong>{date}</strong> est <strong>{holidayAlert}</strong>.
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">Compter en overtime (1.5x) ?</span>
              <button
                type="button"
                onClick={() => setHolidayIsOT(!holidayIsOT)}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                  holidayIsOT ? 'bg-orange-500' : 'bg-[var(--color-glass-border)]'
                }`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${
                  holidayIsOT ? 'left-6' : 'left-0.5'
                }`} />
              </button>
            </div>
            <div className="text-xs mt-2">
              {holidayIsOT
                ? <span className="text-orange-400 font-semibold flex items-center gap-1"><Zap size={12} /> Ces heures seront facturées à 1.5x le taux normal</span>
                : <span className="text-[var(--color-text-muted)]">✔ Ces heures seront facturées au taux normal</span>
              }
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DatePicker label="Date" value={date} onChange={setDate} />
            <TimePicker label="Début" value={start} onChange={setStart} />
            <TimePicker label="Fin" value={end} onChange={setEnd} placeholder="Choisir" />
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">Durée (h)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder={end ? (duration?.toFixed(2) || '—') : 'Ex: 9.5'}
                value={end ? (duration?.toFixed(2) || '') : manualHours}
                onChange={e => !end && setManualHours(e.target.value)}
                readOnly={!!end}
                className={`w-full px-3.5 py-2.5 bg-[var(--color-input)] border border-[var(--color-glass-border)] rounded-lg text-sm font-semibold outline-none focus:border-[var(--color-accent)] transition-all ${
                  end ? 'text-[var(--color-accent-3)]' : 'text-white'
                }`}
              />
            </div>
          </div>

          {clients.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">Client</label>
              <select
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--color-input)] border border-[var(--color-glass-border)] rounded-lg text-white text-sm outline-none focus:border-[var(--color-accent)] transition-all"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({money(c.hourlyRate)}/h)</option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className="btn-gradient w-full py-3 text-base rounded-xl">
            ➕ Ajouter
          </button>
        </form>
      </div>

      {/* This Week Table */}
      <div className="glass-card p-5">
        <h3 className="font-bold flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-[var(--color-accent-3)]" /> Cette semaine
        </h3>

        {weekEntries.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-muted)]">
            <div className="text-3xl mb-2 opacity-50"><Package size={32} /></div>
            <p>Aucune entrée cette semaine.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--color-glass-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-accent)]/10">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Jour</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Début</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Fin</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Durée</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase">$</th>
                  {!currentWeekInvoiced && (
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-[var(--color-text-secondary)] uppercase w-10"></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {weekEntries.map(entry => {
                  const client = clients.find(c => c.id === entry.clientId);
                  const rate = client?.hourlyRate || 31;
                  return (
                    <tr key={entry.id} className="border-t border-[var(--color-glass-border)] hover:bg-[var(--color-glass-hover)]">
                      <td className="px-3 py-2.5">
                        <span className="font-medium">{getDayName(entry.date, true)}</span>
                        <span className="text-[var(--color-text-muted)] ml-1 text-xs">{entry.date.substring(5)}</span>
                        {entry.isHoliday && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">Férié</span>}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--color-text-secondary)]">{entry.start}</td>
                      <td className="px-3 py-2.5 text-[var(--color-text-secondary)]">{entry.end}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">{entry.hours.toFixed(2)}h</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-[var(--color-success)]">{money(entry.hours * rate)}</td>
                      {!currentWeekInvoiced && (
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => setConfirmDelete(entry.id)}
                            className="w-7 h-7 rounded-lg bg-[var(--color-glass)] hover:bg-red-500/20 text-[var(--color-text-muted)] hover:text-red-400 transition-all flex items-center justify-center"
                          ><Trash2 size={13} /></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                onClick={() => handleDelete(confirmDelete)}
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

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="glass-card p-4 relative overflow-hidden stat-card-hover group">
      <div className="stat-bar" />
      <div className="flex items-center gap-2 mb-2">
        <span className={`${color} opacity-70 group-hover:opacity-100 transition-opacity`}>{icon}</span>
        <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl md:text-2xl font-extrabold gradient-text leading-tight">{value}</div>
      <div className="text-xs text-[var(--color-text-secondary)] mt-1">{sub}</div>
    </div>
  );
}

function FormField({ label, type, value, onChange }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 bg-[var(--color-input)] border border-[var(--color-glass-border)] rounded-lg text-white text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all"
      />
    </div>
  );
}
