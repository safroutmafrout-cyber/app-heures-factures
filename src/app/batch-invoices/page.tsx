'use client';

import { useState, useEffect } from 'react';
import { getEntries, getClients, getNextInvoiceNumber, incrementInvoiceNumber, saveGeneratedInvoice, getInvoiceForWeek } from '@/lib/store';
import { getWeekKey } from '@/lib/utils';
import type { TimeEntry } from '@/lib/types';

export default function BatchGenerate() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);

  const addLog = (msg: string) => setLogs(p => [...p, msg]);

  useEffect(() => {
    // Only run once
    if (isDone) return;
    setIsDone(true);

    const entries = getEntries();
    const clients = getClients();
    
    if (!clients.length) {
      addLog("Erreur: Aucun client trouvé.");
      return;
    }
    
    const client = clients[0];
    const clientId = client.id;

    // Group all entries by week
    const weekGroups: Record<string, TimeEntry[]> = {};
    for (const e of entries) {
      // Only process entries on or before Feb 28, 2026
      if (e.date <= '2026-02-28') {
        const wk = getWeekKey(e.date);
        if (!weekGroups[wk]) weekGroups[wk] = [];
        weekGroups[wk].push(e);
      }
    }

    addLog(`Trouvé ${Object.keys(weekGroups).length} semaines à traiter avant le 2026-02-28.`);

    const run = async () => {
      // Clear existing generated invoices to start fresh from 1001
      localStorage.setItem('hf_invoice_num', '1001');
      localStorage.setItem('hf_generated_invoices', '{}');
    
      // Sort weeks chronologically
      const sortedWeeks = Object.keys(weekGroups).sort();
      let count = 0;
      let skipped = 0;
      
      for (const wk of sortedWeeks) {
        try {
          // We removed the condition checking if invoice existed since we wiped them
          const wkEntries = weekGroups[wk];
          const hours = wkEntries.reduce((acc, curr) => acc + curr.hours, 0);
          const holidayH = wkEntries.filter(e => e.isHoliday).reduce((acc, curr) => acc + curr.hours, 0);
          const regularH = hours - holidayH;
          
          const normalH = Math.min(regularH, client.overtimeThreshold);
          const otH = Math.max(0, regularH - client.overtimeThreshold);
          
          const subtotal = (normalH * client.hourlyRate) + 
                           (otH * client.hourlyRate * client.overtimeMultiplier) + 
                           (holidayH * client.hourlyRate * client.overtimeMultiplier);
          
          const tps = subtotal * 0.05;
          const tvq = subtotal * 0.09975;
          const total = subtotal + tps + tvq;

          let invNum: string | number = getNextInvoiceNumber();
          let shouldIncrement = true;

          // Fusion des deux premières semaines pour la facture 1001
          if (wk === '2025-08-31') {
            invNum = '1001';
            shouldIncrement = false;
          } else if (wk === '2025-09-07') {
            invNum = '1001';
            shouldIncrement = true; 
          } else if (wk === '2026-02-08') {
            // Le client a utilisé 1022 deux fois manuellement, on note la 2ème 1022(2)
            invNum = '1022(2)';
            shouldIncrement = false; // On ne monte pas le compteur, la prochaine sera 1023!
          }
          
          saveGeneratedInvoice({
            invoiceNumber: invNum,
            weekKey: wk,
            clientId: clientId,
            total,
            generatedAt: new Date().toISOString()
          });
          
          if (shouldIncrement) {
            incrementInvoiceNumber();
          }
          
          addLog(`✅ Facture générée pour la semaine: ${wk} (Facture #${invNum}, Total: ${total.toFixed(2)}$)`);
          count++;
          
        } catch (err: any) {
          addLog(`❌ Erreur pour la semaine ${wk}: ${err.message}`);
        }
      }
      addLog(`Terminé! ${count} factures générées, ${skipped} sautées.`);
    };

    run();

  }, [isDone]);

  return (
    <div className="p-10 font-mono text-sm space-y-2 text-white/80 h-screen bg-slate-950 overflow-auto">
      <h1 className="text-xl font-bold mb-4 text-white">Génération des factures historiques...</h1>
      {logs.map((L, i) => (
        <div key={i}>{L}</div>
      ))}
      <a href="/factures" className="mt-8 inline-block px-4 py-2 bg-purple-600 font-sans font-bold text-white rounded-lg hover:bg-purple-500">
        Retour aux Factures
      </a>
    </div>
  );
}
