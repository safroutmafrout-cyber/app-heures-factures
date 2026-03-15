'use client';

import { useState } from 'react';
import { saveProfile, addClient, setOnboarded } from '@/lib/store';
import { Building2, Factory, ChevronRight, ChevronLeft, Rocket } from 'lucide-react';
import type { UserProfile } from '@/lib/types';

interface Props {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(1);

  // Profile state
  const [companyName, setCompanyName] = useState('');
  const [tps, setTps] = useState('');
  const [tvq, setTvq] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');

  // Client state
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [hourlyRate, setHourlyRate] = useState('31');
  const [otThreshold, setOtThreshold] = useState('60');
  const [otMultiplier, setOtMultiplier] = useState('1.5');

  function handleStep1() {
    if (!companyName || !fullName) return;
    const profile: UserProfile = { companyName, tps, tvq, fullName, address, city, phone };
    saveProfile(profile);
    setStep(2);
  }

  function handleStep2() {
    if (!clientName) return;
    addClient({
      name: clientName,
      address: clientAddress,
      city: clientCity,
      hourlyRate: parseFloat(hourlyRate) || 31,
      overtimeThreshold: parseFloat(otThreshold) || 60,
      overtimeMultiplier: parseFloat(otMultiplier) || 1.5,
    });
    setOnboarded();
    onComplete();
  }

  return (
    <div className="relative z-1 min-h-screen flex items-center justify-center px-4 py-8">
      <div className="glass-card max-w-lg w-full p-6 md:p-8">
        {/* Progress */}
        <div className="flex gap-2 mb-6">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)]' : 'bg-[var(--color-glass)]'}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)]' : 'bg-[var(--color-glass)]'}`} />
        </div>

        {step === 1 && (
          <>
            <h2 className="text-xl font-bold gradient-text mb-1 flex items-center gap-2"><Building2 size={20} /> Votre entreprise</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Ces informations apparaîtront sur vos factures.
            </p>

            <div className="space-y-3">
              <Input label="Nom de la compagnie *" value={companyName} onChange={setCompanyName} placeholder="Ex: 1234-5678 Québec Inc." />
              <Input label="Votre nom complet *" value={fullName} onChange={setFullName} placeholder="Ex: Jean Tremblay" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Numéro TPS" value={tps} onChange={setTps} placeholder="123456789 RT 0001" />
                <Input label="Numéro TVQ" value={tvq} onChange={setTvq} placeholder="1234567890 TVQ0001" />
              </div>
              <Input label="Adresse" value={address} onChange={setAddress} placeholder="123 Rue Principale" />
              <Input label="Ville, Province, Code postal" value={city} onChange={setCity} placeholder="Montréal, H2X 1Y4 QC" />
              <Input label="Téléphone" value={phone} onChange={setPhone} placeholder="514-555-0123" />
            </div>

            <button onClick={handleStep1} className="btn-gradient w-full py-3 mt-6 text-base rounded-xl flex items-center justify-center gap-1.5">
              Suivant <ChevronRight size={16} />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-bold gradient-text mb-1 flex items-center gap-2"><Factory size={20} /> Votre premier client</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              La compagnie à qui vous facturez vos heures. Vous pourrez en ajouter d&apos;autres plus tard.
            </p>

            <div className="space-y-3">
              <Input label="Nom de la compagnie client *" value={clientName} onChange={setClientName} placeholder="Ex: Transport Express Inc." />
              <Input label="Adresse du client" value={clientAddress} onChange={setClientAddress} placeholder="456 Boul Industriel" />
              <Input label="Ville du client" value={clientCity} onChange={setClientCity} placeholder="Laval QC" />
              <div className="grid grid-cols-3 gap-3">
                <Input label="Taux horaire ($)" value={hourlyRate} onChange={setHourlyRate} type="number" />
                <Input label="Seuil overtime (h)" value={otThreshold} onChange={setOtThreshold} type="number" />
                <Input label="Taux OT (x)" value={otMultiplier} onChange={setOtMultiplier} type="number" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl font-semibold bg-[var(--color-glass)] border border-[var(--color-glass-border)] text-white hover:bg-[var(--color-glass-hover)] transition-all flex items-center justify-center gap-1.5">
                <ChevronLeft size={16} /> Retour
              </button>
              <button onClick={handleStep2} className="flex-1 btn-gradient py-3 text-base rounded-xl flex items-center justify-center gap-1.5">
                <Rocket size={16} /> Commencer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">
        {label}
      </label>
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
