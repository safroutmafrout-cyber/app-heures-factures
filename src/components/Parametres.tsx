'use client';

import { useState, useEffect, useCallback } from 'react';
import { getProfile, saveProfile, getClients, addClient, updateClient, deleteClient as removeClient } from '@/lib/store';
import { loadDummyData } from '@/lib/dummy';
import { Building2, Factory, UserPlus, Trash2, Save, AlertTriangle, FlaskConical, X } from 'lucide-react';
import type { UserProfile, Client } from '@/lib/types';
import Toast from './Toast';

interface Props {
  onRefresh: () => void;
}

export default function Parametres({ onRefresh }: Props) {
  const [profile, setProfileData] = useState<UserProfile>({
    companyName: '', tps: '', tvq: '', fullName: '', address: '', city: '', phone: '',
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ msg: string; action: () => void } | null>(null);

  // New client form
  const [showNewClient, setShowNewClient] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddr, setNewAddr] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newRate, setNewRate] = useState('31');
  const [newOT, setNewOT] = useState('60');
  const [newOTMul, setNewOTMul] = useState('1.5');

  useEffect(() => {
    const p = getProfile();
    if (p) setProfileData(p);
    setClients(getClients());
  }, []);

  function handleSaveProfile() {
    saveProfile(profile);
    setToast({ msg: '✅ Profil sauvegardé', type: 'success' });
    onRefresh();
  }

  function handleAddClient() {
    if (!newName) return;
    addClient({
      name: newName, address: newAddr, city: newCity,
      hourlyRate: parseFloat(newRate) || 31,
      overtimeThreshold: parseFloat(newOT) || 60,
      overtimeMultiplier: parseFloat(newOTMul) || 1.5,
    });
    setClients(getClients());
    setShowNewClient(false);
    setNewName(''); setNewAddr(''); setNewCity('');
    setToast({ msg: '✅ Client ajouté', type: 'success' });
    onRefresh();
  }

  function handleDeleteClient(id: string) {
    setConfirmAction({
      msg: 'Supprimer ce client ?',
      action: () => {
        removeClient(id);
        setClients(getClients());
        setConfirmAction(null);
        setToast({ msg: 'Client supprimé', type: 'info' });
        onRefresh();
      }
    });
  }

  function handleUpdateClientRate(id: string, field: string, value: string) {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    updateClient(id, { [field]: num });
    setClients(getClients());
  }

  function handleClearAll() {
    setConfirmAction({
      msg: 'Effacer TOUTES les données ? Cette action est irréversible.',
      action: () => {
        localStorage.clear();
        window.location.reload();
      }
    });
  }

  const clearToast = useCallback(() => setToast(null), []);

  function handleLoadDummy() {
    loadDummyData();
    window.location.reload();
  }

  return (
    <div className="space-y-5">
      {/* Profile */}
      <div className="glass-card p-5">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Building2 size={18} className="text-[var(--color-accent-3)]" /> Votre entreprise</h2>
        <div className="space-y-3">
          <Field label="Nom de la compagnie" value={profile.companyName} onChange={v => setProfileData({ ...profile, companyName: v })} />
          <Field label="Nom complet" value={profile.fullName} onChange={v => setProfileData({ ...profile, fullName: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="TPS" value={profile.tps} onChange={v => setProfileData({ ...profile, tps: v })} />
            <Field label="TVQ" value={profile.tvq} onChange={v => setProfileData({ ...profile, tvq: v })} />
          </div>
          <Field label="Adresse" value={profile.address} onChange={v => setProfileData({ ...profile, address: v })} />
          <Field label="Ville" value={profile.city} onChange={v => setProfileData({ ...profile, city: v })} />
          <Field label="Téléphone" value={profile.phone} onChange={v => setProfileData({ ...profile, phone: v })} />
        </div>
        <button onClick={handleSaveProfile} className="btn-gradient w-full py-2.5 mt-4 rounded-xl flex items-center justify-center gap-1.5">
          <Save size={16} /> Sauvegarder le profil
        </button>
      </div>

      {/* Clients */}
      <div className="glass-card p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg flex items-center gap-2"><Factory size={18} className="text-[var(--color-accent-3)]" /> Clients</h2>
          <button
            onClick={() => setShowNewClient(!showNewClient)}
            className="text-sm font-semibold text-[var(--color-accent-3)] hover:text-white transition-all"
          >
            {showNewClient ? 'Annuler' : <><UserPlus size={14} /> Nouveau client</>}
          </button>
        </div>

        {/* New client form */}
        {showNewClient && (
          <div className="mb-4 p-4 rounded-xl bg-[var(--color-glass)] border border-[var(--color-glass-border)]">
            <div className="space-y-3">
              <Field label="Nom de la compagnie" value={newName} onChange={setNewName} placeholder="Ex: Transport ABC" />
              <Field label="Adresse" value={newAddr} onChange={setNewAddr} />
              <Field label="Ville" value={newCity} onChange={setNewCity} />
              <div className="grid grid-cols-3 gap-3">
                <Field label="Taux $/h" value={newRate} onChange={setNewRate} type="number" />
                <Field label="Seuil OT (h)" value={newOT} onChange={setNewOT} type="number" />
                <Field label="Mult. OT" value={newOTMul} onChange={setNewOTMul} type="number" />
              </div>
            </div>
            <button onClick={handleAddClient} className="btn-gradient w-full py-2.5 mt-3 rounded-xl flex items-center justify-center gap-1.5">
              <UserPlus size={16} /> Ajouter ce client
            </button>
          </div>
        )}

        {/* Client list */}
        <div className="space-y-3">
          {clients.map(client => (
            <div key={client.id} className="p-4 rounded-xl bg-[var(--color-glass)] border border-[var(--color-glass-border)]">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold">{client.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{client.address}, {client.city}</div>
                </div>
                <button
                  onClick={() => handleDeleteClient(client.id)}
                  className="w-7 h-7 rounded-lg bg-[var(--color-glass)] hover:bg-red-500/20 text-[var(--color-text-muted)] hover:text-red-400 transition-all flex items-center justify-center"
                ><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <label className="block text-[10px] text-[var(--color-text-muted)] uppercase">Taux $/h</label>
                  <input
                    type="number"
                    value={client.hourlyRate}
                    onChange={e => handleUpdateClientRate(client.id, 'hourlyRate', e.target.value)}
                    className="w-full px-2 py-1.5 bg-[var(--color-input)] border border-[var(--color-glass-border)] rounded-lg text-white text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--color-text-muted)] uppercase">Seuil OT</label>
                  <input
                    type="number"
                    value={client.overtimeThreshold}
                    onChange={e => handleUpdateClientRate(client.id, 'overtimeThreshold', e.target.value)}
                    className="w-full px-2 py-1.5 bg-[var(--color-input)] border border-[var(--color-glass-border)] rounded-lg text-white text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--color-text-muted)] uppercase">Mult. OT</label>
                  <input
                    type="number"
                    step="0.1"
                    value={client.overtimeMultiplier}
                    onChange={e => handleUpdateClientRate(client.id, 'overtimeMultiplier', e.target.value)}
                    className="w-full px-2 py-1.5 bg-[var(--color-input)] border border-[var(--color-glass-border)] rounded-lg text-white text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="glass-card p-5 border-red-500/20">
        <h2 className="font-bold text-lg text-red-400 mb-2 flex items-center gap-2"><AlertTriangle size={18} /> Zone dangereuse</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-3">
          Effacer toutes les données ou charger des données fictives.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleClearAll}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-all"
          >
            <Trash2 size={14} /> Effacer tout
          </button>
          <button
            onClick={handleLoadDummy}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 transition-all"
          >
            <FlaskConical size={14} /> Mode Démo
          </button>
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-red-400">
              <AlertTriangle size={24} />
              <h3 className="font-bold text-lg">Confirmer</h3>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">{confirmAction.msg}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-[var(--color-glass)] border border-[var(--color-glass-border)] hover:bg-[var(--color-glass-hover)] transition-all"
              >Annuler</button>
              <button
                onClick={confirmAction.action}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all flex items-center justify-center gap-1.5"
              ><Trash2 size={14} /> Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={clearToast} />}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 bg-[var(--color-input)] border border-[var(--color-glass-border)] rounded-lg text-white text-sm outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all placeholder:text-[var(--color-text-muted)]"
      />
    </div>
  );
}
