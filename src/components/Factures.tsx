'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { getEntries, getClients, getProfile, getNextInvoiceNumber, incrementInvoiceNumber, saveGeneratedInvoice, getGeneratedInvoices, getInvoiceForWeek } from '@/lib/store';
import type { InvoiceRecord } from '@/lib/store';
import { getWeekKey, getWeekRange, money } from '@/lib/utils';
import { FileText, Printer, Mail, Download, CheckCircle2, XCircle, BookOpen, Send, X, Loader2 } from 'lucide-react';
import type { TimeEntry, Client, UserProfile } from '@/lib/types';
import { generateInvoicePDF, downloadPDF, getInvoiceHTML } from '@/lib/pdf';
import Toast from './Toast';

export default function Factures() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [invNumber, setInvNumber] = useState<string | number>(1001);
  const [desc, setDesc] = useState('Service Transport');
  const [generated, setGenerated] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [invoiceRecords, setInvoiceRecords] = useState<Record<string, InvoiceRecord>>({});
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEntries(getEntries());
    const c = getClients();
    setClients(c);
    setProfileState(getProfile());
    setInvNumber(getNextInvoiceNumber());
    setInvoiceRecords(getGeneratedInvoices());
    if (c.length > 0) setSelectedClient(c[0].id);
  }, []);

  // Available weeks (newest first)
  const weeks = useMemo(() => {
    const weekSet = new Set(entries.map(e => getWeekKey(e.date)));
    return Array.from(weekSet).sort().reverse();
  }, [entries]);

  const activeClient = clients.find(c => c.id === selectedClient);

  // Invoice data
  const invoiceData = useMemo(() => {
    if (!selectedWeek || !activeClient) return null;

    const weekEntries = entries
      .filter(e => getWeekKey(e.date) === selectedWeek && e.clientId === selectedClient)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (weekEntries.length === 0) return null;

    const rate = activeClient.hourlyRate;
    const threshold = activeClient.overtimeThreshold;
    const otMul = activeClient.overtimeMultiplier;

    const totalHours = weekEntries.reduce((s, e) => s + e.hours, 0);
    const holidayHours = weekEntries.filter(e => e.isHoliday).reduce((s, e) => s + e.hours, 0);
    const regularHours = totalHours - holidayHours;
    const normalHours = Math.min(regularHours, threshold);
    const overtimeHours = Math.max(0, regularHours - threshold);

    const subtotal = normalHours * rate + overtimeHours * rate * otMul + holidayHours * rate * otMul;
    const tps = +(subtotal * 0.05).toFixed(2);
    const tvq = +(subtotal * 0.09975).toFixed(2);
    const total = subtotal + tps + tvq;

    return {
      entries: weekEntries,
      totalHours,
      normalHours,
      overtimeHours,
      holidayHours,
      subtotal,
      tps,
      tvq,
      total,
      rate,
      otMul,
    };
  }, [selectedWeek, selectedClient, entries, activeClient]);

  // Check if invoice number is already used
  function isInvoiceNumberUsed(num: string | number): boolean {
    return Object.values(invoiceRecords).some(r => String(r.invoiceNumber) === String(num));
  }

  function handleGenerate() {
    if (!invoiceData) {
      setToast({ msg: 'Sélectionnez une semaine avec des entrées', type: 'error' });
      return;
    }
    if (isInvoiceNumberUsed(invNumber)) {
      setToast({ msg: `❌ Le numéro de facture #${invNumber} est déjà utilisé ! Choisissez un autre numéro.`, type: 'error' });
      return;
    }
    setGenerated(true);
    setToast({ msg: 'Facture générée ✓', type: 'success' });
  }

  function handlePrint() {
    if (invoiceData && selectedWeek && selectedClient) {
      saveGeneratedInvoice({
        invoiceNumber: invNumber,
        weekKey: selectedWeek,
        clientId: selectedClient,
        total: invoiceData.total,
        generatedAt: new Date().toISOString(),
      });
      setInvoiceRecords(getGeneratedInvoices());
    }
    incrementInvoiceNumber();
    setInvNumber(getNextInvoiceNumber());
    window.print();
  }

  // Check if selected week is already invoiced
  const existingInvoice = selectedWeek && selectedClient
    ? getInvoiceForWeek(selectedWeek, selectedClient)
    : null;

  // Sorted list of all generated invoices (newest first)
  const invoiceList = useMemo(() =>
    Object.values(invoiceRecords).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
    [invoiceRecords]
  );

  function handleReprint(record: InvoiceRecord) {
    setSelectedWeek(record.weekKey);
    setSelectedClient(record.clientId);
    setInvNumber(record.invoiceNumber);
    setGenerated(true);
    setTimeout(() => window.print(), 400);
  }

  return (
    <div className="space-y-5">
      {/* Config */}
      <div className="glass-card p-5 no-print">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText size={18} className="text-[var(--color-accent-3)]" /> Générer une facture</h2>

        {/* Already invoiced banner */}
        {existingInvoice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <span className="text-emerald-400 font-semibold text-sm flex items-center gap-1"><CheckCircle2 size={14} /> Facture #{existingInvoice.invoiceNumber}</span>
              <span className="text-[var(--color-text-muted)] text-xs ml-2">générée le {new Date(existingInvoice.generatedAt).toLocaleDateString('fr-CA')}</span>
            </div>
            <span className="text-emerald-400 font-bold text-sm">{money(existingInvoice.total)}</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">Semaine</label>
            <select
              value={selectedWeek}
              onChange={e => { setSelectedWeek(e.target.value); setGenerated(false); }}
              className="w-full px-3 py-2.5 bg-[var(--color-input)] border border-[var(--color-glass-border)] rounded-lg text-white text-sm outline-none"
            >
              <option value="">— Choisir —</option>
              {weeks.map(wk => {
                const inv = invoiceRecords[`${wk}__${selectedClient}`];
                return (
                  <option key={wk} value={wk}>
                    {getWeekRange(wk)}{inv ? ` ✅ #${inv.invoiceNumber}` : ''}
                  </option>
                );
              })}
            </select>
          </div>
          {clients.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">Client</label>
              <select
                value={selectedClient}
                onChange={e => { setSelectedClient(e.target.value); setGenerated(false); }}
                className="w-full px-3 py-2.5 bg-[var(--color-input)] border border-[var(--color-glass-border)] rounded-lg text-white text-sm outline-none"
              >
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">N° facture</label>
            <input
              type="text"
              value={invNumber}
              onChange={e => setInvNumber(e.target.value)}
              className="w-full px-3 py-2.5 bg-[var(--color-input)] border border-[var(--color-glass-border)] rounded-lg text-white text-sm outline-none"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">Description</label>
          <input
            type="text"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="w-full px-3 py-2.5 bg-[var(--color-input)] border border-[var(--color-glass-border)] rounded-lg text-white text-sm outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleGenerate} className="btn-gradient px-6 py-2.5 rounded-xl flex items-center gap-1.5"><FileText size={16} /> Générer</button>
          {generated && (
            <>
              <button onClick={handlePrint} className="px-6 py-2.5 rounded-xl font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-all flex items-center gap-1.5"><Printer size={16} /> Imprimer</button>
              <button
                onClick={async () => {
                  if (!invoiceData || !profile || !activeClient) return;
                  setPdfGenerating(true);
                  try {
                    const blob = await generateInvoicePDF({
                      companyName: profile.companyName,
                      tps: profile.tps,
                      tvq: profile.tvq,
                      fullName: profile.fullName,
                      address: profile.address,
                      city: profile.city,
                      phone: profile.phone,
                      clientName: activeClient.name,
                      clientAddress: activeClient.address,
                      clientCity: activeClient.city,
                      invoiceNumber: invNumber,
                      weekRange: getWeekRange(selectedWeek),
                      description: desc,
                      date: new Date().toISOString().split('T')[0],
                      entries: invoiceData.entries.map(e => ({
                        date: e.date,
                        description: e.isHoliday ? `${desc} (Férié)` : desc,
                        hours: e.hours,
                      })),
                      totalHours: invoiceData.totalHours,
                      normalHours: invoiceData.normalHours,
                      overtimeHours: invoiceData.overtimeHours,
                      holidayHours: invoiceData.holidayHours,
                      rate: invoiceData.rate,
                      otMul: invoiceData.otMul,
                      subtotal: invoiceData.subtotal,
                      tpsAmount: invoiceData.tps,
                      tvqAmount: invoiceData.tvq,
                      total: invoiceData.total,
                    });
                    downloadPDF(blob, `facture_${invNumber}.pdf`);
                    setToast({ msg: 'PDF téléchargé ✓', type: 'success' });
                  } catch (err) {
                    console.error('PDF error:', err);
                    setToast({ msg: 'Erreur lors de la génération du PDF', type: 'error' });
                  }
                  setPdfGenerating(false);
                }}
                disabled={pdfGenerating}
                className="px-6 py-2.5 rounded-xl font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/20 hover:bg-violet-500/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {pdfGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {pdfGenerating ? 'Génération...' : 'Télécharger PDF'}
              </button>
              {invoiceData && activeClient && (
                <button
                  onClick={() => {
                    setEmailTo(activeClient.email || '');
                    setEmailMsg(`Bonjour,\n\nVeuillez trouver ci-dessous la facture #${invNumber} pour la semaine du ${getWeekRange(selectedWeek)}.\n\nTotal: ${money(invoiceData.total)}\n\nCordialement,\n${profile?.fullName || ''}\n${profile?.companyName || ''}\n${profile?.phone || ''}`);
                    setShowEmailDialog(true);
                  }}
                  className="px-6 py-2.5 rounded-xl font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 transition-all flex items-center gap-1.5"
                >
                  <Mail size={16} /> Envoyer par email
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Email Dialog */}
      {showEmailDialog && (
        <div className="glass-card p-5 no-print border-blue-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2"><Mail size={16} className="text-blue-400" /> Envoyer la facture par email</h3>
            <button onClick={() => setShowEmailDialog(false)} className="p-1 rounded-lg hover:bg-[var(--color-glass-hover)] text-[var(--color-text-muted)]"><X size={16} /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">Destinataire</label>
              <input
                type="email"
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
                placeholder="client@example.com"
                className="w-full px-3 py-2.5 bg-[var(--color-input)] border border-[var(--color-glass-border)] rounded-lg text-white text-sm outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">Message</label>
              <textarea
                value={emailMsg}
                onChange={e => setEmailMsg(e.target.value)}
                rows={5}
                className="w-full px-3 py-2.5 bg-[var(--color-input)] border border-[var(--color-glass-border)] rounded-lg text-white text-sm outline-none focus:border-blue-500/50 resize-none"
              />
            </div>
            <button
              onClick={async () => {
                if (!emailTo) { setToast({ msg: 'Entrez un email destinataire', type: 'error' }); return; }
                setEmailSending(true);
                try {
                  const invoiceHtml = invoiceRef.current?.querySelector('.invoice-container')?.innerHTML || '';
                  const res = await fetch('/api/email/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      to: emailTo,
                      subject: `Facture #${invNumber} — ${getWeekRange(selectedWeek)}`,
                      message: emailMsg,
                      invoiceHtml,
                    }),
                  });
                  if (res.ok) {
                    setToast({ msg: `✅ Email envoyé à ${emailTo}`, type: 'success' });
                    setShowEmailDialog(false);
                  } else {
                    const err = await res.json();
                    setToast({ msg: `❌ ${err.error || 'Erreur d\'envoi'}`, type: 'error' });
                  }
                } catch (err) {
                  setToast({ msg: '❌ Erreur réseau', type: 'error' });
                }
                setEmailSending(false);
              }}
              disabled={emailSending}
              className="btn-gradient px-6 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-50"
            >
              {emailSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {emailSending ? 'Envoi en cours...' : 'Envoyer'}
            </button>
          </div>
        </div>
      )}

      {/* Invoice Preview */}
      {generated && invoiceData && profile && activeClient && (
        <div className="glass-card print-show p-4 md:p-6" ref={invoiceRef}>
          <h3 className="font-bold mb-4 no-print flex items-center gap-2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[var(--color-accent-3)]"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg> Aperçu</h3>
          <div className="invoice-container bg-white text-gray-900 rounded-2xl p-4 sm:p-6 md:p-10 max-w-3xl mx-auto shadow-2xl text-sm overflow-x-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div className="flex justify-between mb-8 pb-5 border-b-[3px] border-indigo-500">
              <div>
                <div className="text-lg font-bold text-indigo-600">{profile.companyName}</div>
                <div className="text-xs text-gray-500 mt-1">TPS {profile.tps}</div>
                <div className="text-xs text-gray-500">TVQ {profile.tvq}</div>
                <div className="mt-3 text-xs">{profile.fullName}</div>
                <div className="text-xs">{profile.address}</div>
                <div className="text-xs">{profile.city}</div>
                <div className="text-xs">{profile.phone}</div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-extrabold text-indigo-600">FACTURE</h2>
                <div className="text-sm text-gray-500 mt-1">N° {invNumber}</div>
                <div className="text-xs text-gray-400 mt-1">semaine {getWeekRange(selectedWeek)}</div>
              </div>
            </div>

            {/* Client info */}
            <div className="flex justify-between mb-6">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Facturé à</div>
                <div className="font-bold">{activeClient.name}</div>
                <div className="text-xs">{activeClient.address}</div>
                <div className="text-xs">{activeClient.city}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Date</div>
                <div className="text-xs">{new Date().toISOString().split('T')[0]}</div>
              </div>
            </div>

            {/* Detail Table */}
            <div className="overflow-x-auto">
            <table className="w-full mb-2" style={{ minWidth: '400px' }}>
              <thead>
                <tr className="bg-indigo-600 text-white">
                  <th className="px-2 sm:px-3 py-2 text-left text-xs uppercase">Date</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-xs uppercase">Description</th>
                  <th className="px-2 sm:px-3 py-2 text-right text-xs uppercase whitespace-nowrap">Heures</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.entries.map(entry => (
                  <tr key={entry.id} className="border-b border-gray-100 even:bg-gray-50">
                    <td className="px-2 sm:px-3 py-1.5 text-xs whitespace-nowrap">{entry.date}</td>
                    <td className="px-2 sm:px-3 py-1.5 text-xs">{entry.isHoliday ? `${desc} (Férié)` : desc}</td>
                    <td className="px-2 sm:px-3 py-1.5 text-right text-xs font-medium whitespace-nowrap">{entry.hours.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td className="px-3 py-2 text-xs" colSpan={2}>Total heures</td>
                  <td className="px-3 py-2 text-right text-xs">{invoiceData.totalHours.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            </div>

            {/* Billing Summary */}
            <div className="mt-4 mb-2">
              <div className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Calcul de la facturation</div>
              <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: '380px' }}>
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-2 sm:px-3 py-1.5 text-left text-xs text-gray-500 uppercase">Type</th>
                    <th className="px-2 sm:px-3 py-1.5 text-right text-xs text-gray-500 uppercase whitespace-nowrap">Heures</th>
                    <th className="px-2 sm:px-3 py-1.5 text-right text-xs text-gray-500 uppercase whitespace-nowrap">Taux</th>
                    <th className="px-2 sm:px-3 py-1.5 text-right text-xs text-gray-500 uppercase whitespace-nowrap">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.normalHours > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="px-3 py-1.5 text-xs">Heures normales</td>
                      <td className="px-3 py-1.5 text-right text-xs">{invoiceData.normalHours.toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-right text-xs">{money(invoiceData.rate)}</td>
                      <td className="px-3 py-1.5 text-right text-xs font-medium">{money(invoiceData.normalHours * invoiceData.rate)}</td>
                    </tr>
                  )}
                  {invoiceData.overtimeHours > 0 && (
                    <tr className="border-b border-gray-100 bg-orange-50">
                      <td className="px-3 py-1.5 text-xs font-semibold text-orange-600">Overtime ({invoiceData.otMul}x)</td>
                      <td className="px-3 py-1.5 text-right text-xs font-semibold text-orange-600">{invoiceData.overtimeHours.toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-right text-xs text-orange-600">{money(invoiceData.rate * invoiceData.otMul)}</td>
                      <td className="px-3 py-1.5 text-right text-xs font-bold text-orange-600">{money(invoiceData.overtimeHours * invoiceData.rate * invoiceData.otMul)}</td>
                    </tr>
                  )}
                  {invoiceData.holidayHours > 0 && (
                    <tr className="border-b border-gray-100 bg-purple-50">
                      <td className="px-3 py-1.5 text-xs font-semibold text-purple-600">Jours fériés ({invoiceData.otMul}x)</td>
                      <td className="px-3 py-1.5 text-right text-xs font-semibold text-purple-600">{invoiceData.holidayHours.toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-right text-xs text-purple-600">{money(invoiceData.rate * invoiceData.otMul)}</td>
                      <td className="px-3 py-1.5 text-right text-xs font-bold text-purple-600">{money(invoiceData.holidayHours * invoiceData.rate * invoiceData.otMul)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end mt-4">
              <table className="w-full sm:w-72 ml-auto">
                <tbody>
                  <tr><td className="px-3 py-1.5 text-xs">Sous-total</td><td className="px-3 py-1.5 text-right text-xs">{money(invoiceData.subtotal)}</td></tr>
                  <tr><td className="px-3 py-1.5 text-xs">TPS (5%)</td><td className="px-3 py-1.5 text-right text-xs">{money(invoiceData.tps)}</td></tr>
                  <tr><td className="px-3 py-1.5 text-xs">TVQ (9,975%)</td><td className="px-3 py-1.5 text-right text-xs">{money(invoiceData.tvq)}</td></tr>
                  <tr className="border-t-2 border-indigo-600"><td className="px-3 py-2 font-extrabold text-indigo-600">Total</td><td className="px-3 py-2 text-right font-extrabold text-indigo-600 text-base">{money(invoiceData.total)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Generated Invoices History */}
      {invoiceList.length > 0 && (
        <div className="glass-card p-5 no-print">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><BookOpen size={18} className="text-[var(--color-accent-3)]" /> Factures générées</h2>
          <div className="overflow-x-auto rounded-xl border border-[var(--color-glass-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-accent)]/10">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">N°</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Semaine</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Client</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Total</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Date</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoiceList.map(rec => {
                  const client = clients.find(c => c.id === rec.clientId);
                  return (
                    <tr key={`${rec.weekKey}-${rec.clientId}`} className="border-t border-[var(--color-glass-border)] hover:bg-[var(--color-glass-hover)]">
                      <td className="px-3 py-2.5 font-bold text-[var(--color-accent-3)]">#{rec.invoiceNumber}</td>
                      <td className="px-3 py-2.5">{getWeekRange(rec.weekKey)}</td>
                      <td className="px-3 py-2.5 text-[var(--color-text-secondary)]">{client?.name || '—'}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-[var(--color-success)]">{money(rec.total)}</td>
                      <td className="px-3 py-2.5 text-right text-[var(--color-text-muted)] text-xs">{new Date(rec.generatedAt).toLocaleDateString('fr-CA')}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => handleReprint(rec)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 transition-all"
                        ><Download size={14} /> Télécharger</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
