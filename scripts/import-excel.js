/**
 * Import script: reads the Excel file and generates JSON data
 * compatible with the V2 app's localStorage format.
 * 
 * Run: node scripts/import-excel.js
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const FILE = path.resolve(__dirname, '..', '..', 'Brouillon factures.xlsx');
const wb = XLSX.readFile(FILE, { cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, dateNF: 'yyyy-mm-dd' });

// Client ID (will match the one in the app)
const CLIENT_ID = 'theriault';

// Parse entries
const entries = [];
let idCounter = 1;

for (const row of data) {
  const dateStr = String(row[0] || '').trim();
  if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) continue;

  const startStr = String(row[1] || '').trim();
  const endStr = String(row[2] || '').trim();
  const hoursStr = String(row[6] || '').trim();

  // Skip days with no hours (days off)
  if (!startStr || !endStr || !hoursStr || hoursStr === '0.00' || hoursStr === '0') continue;

  const hours = parseFloat(hoursStr);
  if (isNaN(hours) || hours <= 0) continue;

  entries.push({
    id: `imp_${idCounter++}`,
    date: dateStr,
    start: startStr,
    end: endStr,
    hours: Math.round(hours * 100) / 100,
    clientId: CLIENT_ID,
    isHoliday: false,
    notes: '',
  });
}

console.log(`✅ Parsed ${entries.length} time entries from ${entries[0]?.date} to ${entries[entries.length-1]?.date}`);

// Group entries by week to generate invoices
function getWeekKey(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

const weekMap = {};
for (const entry of entries) {
  const wk = getWeekKey(entry.date);
  if (!weekMap[wk]) weekMap[wk] = [];
  weekMap[wk].push(entry);
}

const sortedWeeks = Object.keys(weekMap).sort();
console.log(`📅 ${sortedWeeks.length} weeks found`);

// Current week key (don't invoice the current incomplete week)
const now = new Date();
const currentWk = getWeekKey(now.toISOString().split('T')[0]);

// Generate invoices for all completed weeks (not the current one)
const invoiceRecords = {};
let invoiceNumber = 1001;

const completedWeeks = sortedWeeks.filter(wk => wk < currentWk);
console.log(`📝 ${completedWeeks.length} completed weeks will get invoices (#1001 - #${1001 + completedWeeks.length - 1})`);

for (const wk of completedWeeks) {
  const weekEntries = weekMap[wk];
  const weekHours = weekEntries.reduce((s, e) => s + e.hours, 0);
  const rate = 31;
  const threshold = 60;
  const otMul = 1.5;
  const normalH = Math.min(weekHours, threshold);
  const overtimeH = Math.max(0, weekHours - threshold);
  const subtotal = normalH * rate + overtimeH * rate * otMul;
  const tps = subtotal * 0.05;
  const tvq = subtotal * 0.09975;
  const total = subtotal + tps + tvq;

  const key = `${wk}__${CLIENT_ID}`;
  invoiceRecords[key] = {
    weekKey: wk,
    clientId: CLIENT_ID,
    invoiceNumber: invoiceNumber++,
    generatedAt: new Date(wk + 'T12:00:00').toISOString(),
    subtotal: Math.round(subtotal * 100) / 100,
    tps: Math.round(tps * 100) / 100,
    tvq: Math.round(tvq * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// Output the data as a JS file that can be loaded in the browser console
const output = `
// ============================================
// IMPORT SCRIPT — Paste this in the browser console at localhost:3000
// ============================================

(function() {
  // 1. Set entries
  const entries = ${JSON.stringify(entries, null, 2)};
  localStorage.setItem('timeEntries', JSON.stringify(entries));
  console.log('✅ ' + entries.length + ' entries imported');

  // 2. Set invoice records
  const invoices = ${JSON.stringify(invoiceRecords, null, 2)};
  localStorage.setItem('generatedInvoices', JSON.stringify(invoices));
  console.log('✅ ' + Object.keys(invoices).length + ' invoices imported');

  // 3. Set next invoice number
  localStorage.setItem('nextInvoiceNumber', '${invoiceNumber}');
  console.log('✅ Next invoice number set to ${invoiceNumber}');

  // 4. Reload
  console.log('🔄 Reloading...');
  window.location.reload();
})();
`;

const outPath = path.resolve(__dirname, 'import-data.js');
fs.writeFileSync(outPath, output, 'utf-8');
console.log(`\n✅ Import script written to: ${outPath}`);
console.log(`\n📋 Instructions:`);
console.log(`   1. Open http://localhost:3000 in Chrome`);
console.log(`   2. Press F12 → Console`);
console.log(`   3. Paste the contents of import-data.js`);
console.log(`   4. Press Enter — data will be imported and page will reload`);
