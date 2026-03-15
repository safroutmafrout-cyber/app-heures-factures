'use client';

import { UserProfile, Client, TimeEntry } from './types';
import { generateId } from './utils';
import { scheduleSync } from './sync';

const KEYS = {
  profile: 'hf_profile',
  clients: 'hf_clients',
  entries: 'hf_entries',
  invoiceNum: 'hf_invoice_num',
  onboarded: 'hf_onboarded',
  generatedInvoices: 'hf_generated_invoices',
};

// ── Profile ───────────────────────────────────────────
export function getProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEYS.profile);
  return raw ? JSON.parse(raw) : null;
}

export function saveProfile(profile: UserProfile) {
  localStorage.setItem(KEYS.profile, JSON.stringify(profile));
  scheduleSync();
}

// ── Clients ───────────────────────────────────────────
export function getClients(): Client[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(KEYS.clients);
  return raw ? JSON.parse(raw) : [];
}

export function saveClients(clients: Client[]) {
  localStorage.setItem(KEYS.clients, JSON.stringify(clients));
  scheduleSync();
}

export function addClient(client: Omit<Client, 'id'>): Client {
  const clients = getClients();
  const newClient = { ...client, id: generateId() };
  clients.push(newClient);
  saveClients(clients);
  return newClient;
}

export function updateClient(id: string, updates: Partial<Client>) {
  const clients = getClients();
  const idx = clients.findIndex(c => c.id === id);
  if (idx !== -1) {
    clients[idx] = { ...clients[idx], ...updates };
    saveClients(clients);
  }
}

export function deleteClient(id: string) {
  const clients = getClients().filter(c => c.id !== id);
  saveClients(clients);
}

// ── Time Entries ──────────────────────────────────────
export function getEntries(): TimeEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(KEYS.entries);
  return raw ? JSON.parse(raw) : [];
}

export function saveEntries(entries: TimeEntry[]) {
  localStorage.setItem(KEYS.entries, JSON.stringify(entries));
  scheduleSync();
}

export function addEntry(entry: Omit<TimeEntry, 'id'>): TimeEntry {
  const entries = getEntries();
  const newEntry = { ...entry, id: generateId() };
  entries.push(newEntry);
  saveEntries(entries);
  return newEntry;
}

export function updateEntry(id: string, updates: Partial<TimeEntry>) {
  const entries = getEntries();
  const idx = entries.findIndex(e => e.id === id);
  if (idx !== -1) {
    entries[idx] = { ...entries[idx], ...updates };
    saveEntries(entries);
  }
}

export function deleteEntry(id: string) {
  const entries = getEntries().filter(e => e.id !== id);
  saveEntries(entries);
}

// ── Invoice Number ────────────────────────────────────
export function getNextInvoiceNumber(): number {
  if (typeof window === 'undefined') return 1001;
  const raw = localStorage.getItem(KEYS.invoiceNum);
  return raw ? parseInt(raw) : 1001;
}

export function incrementInvoiceNumber() {
  const current = getNextInvoiceNumber();
  localStorage.setItem(KEYS.invoiceNum, String(current + 1));
  scheduleSync();
}

// ── Onboarding ────────────────────────────────────────
export function isOnboarded(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEYS.onboarded) === 'true';
}

export function setOnboarded() {
  localStorage.setItem(KEYS.onboarded, 'true');
}

// ── Generated Invoices Tracking ───────────────────────
export interface InvoiceRecord {
  invoiceNumber: string | number;
  weekKey: string;
  clientId: string;
  total: number;
  generatedAt: string; // ISO date
}

function invoiceKey(weekKey: string, clientId: string): string {
  return `${weekKey}__${clientId}`;
}

export function getGeneratedInvoices(): Record<string, InvoiceRecord> {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(KEYS.generatedInvoices);
  return raw ? JSON.parse(raw) : {};
}

export function saveGeneratedInvoice(record: InvoiceRecord) {
  const all = getGeneratedInvoices();
  all[invoiceKey(record.weekKey, record.clientId)] = record;
  localStorage.setItem(KEYS.generatedInvoices, JSON.stringify(all));
  scheduleSync();
}

export function getInvoiceForWeek(weekKey: string, clientId: string): InvoiceRecord | null {
  const all = getGeneratedInvoices();
  return all[invoiceKey(weekKey, clientId)] || null;
}

// Bulk restore invoice number (used by cloud pull)
export function setInvoiceNumber(num: number) {
  localStorage.setItem(KEYS.invoiceNum, String(num));
}

// Bulk restore all generated invoices (used by cloud pull)
export function saveAllGeneratedInvoices(invoices: Record<string, InvoiceRecord>) {
  localStorage.setItem(KEYS.generatedInvoices, JSON.stringify(invoices));
}

