'use client';

import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  value: string;  // HH:MM
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
}

export default function TimePicker({ value, onChange, label, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [hour, setHour] = useState(14);
  const [minute, setMinute] = useState(0);

  // Sync picker state with value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      if (!isNaN(h)) setHour(h);
      if (!isNaN(m)) setMinute(m);
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function incHour() { setHour(h => (h + 1) % 24); }
  function decHour() { setHour(h => (h - 1 + 24) % 24); }
  function incMin() { setMinute(m => (m + 1) % 60); }
  function decMin() { setMinute(m => (m - 1 + 60) % 60); }

  function confirm() {
    const h = String(hour).padStart(2, '0');
    const m = String(minute).padStart(2, '0');
    onChange(`${h}:${m}`);
    setOpen(false);
  }

  const QUICK_HOURS = [14, 15, 16, 17, 18, 20, 22, 0, 1, 2, 3, 4];

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3.5 py-2.5 bg-[var(--color-input)] border border-[var(--color-glass-border)] rounded-lg text-white text-sm outline-none focus:border-[var(--color-accent)] transition-all text-left flex items-center gap-2"
      >
        <Clock size={14} className="text-[var(--color-accent)] shrink-0" />
        <span>{value || placeholder || '—'}</span>
      </button>

      {open && (
        <div className="absolute z-[9999] bottom-full mb-2 left-0 w-56 glass-card p-4 shadow-2xl">
          {/* Spinners */}
          <div className="flex items-center justify-center gap-4 mb-4">
            {/* Hour spinner */}
            <div className="flex flex-col items-center">
              <button type="button" onClick={incHour} className="p-1 rounded-lg hover:bg-[var(--color-glass-hover)] transition-all">
                <ChevronUp size={18} />
              </button>
              <div className="w-14 h-12 flex items-center justify-center text-2xl font-extrabold gradient-text">
                {String(hour).padStart(2, '0')}
              </div>
              <button type="button" onClick={decHour} className="p-1 rounded-lg hover:bg-[var(--color-glass-hover)] transition-all">
                <ChevronDown size={18} />
              </button>
              <span className="text-[9px] text-[var(--color-text-muted)] font-semibold mt-0.5">HEURE</span>
            </div>

            <span className="text-2xl font-bold text-[var(--color-text-muted)] mt-[-1rem]">:</span>

            {/* Minute spinner */}
            <div className="flex flex-col items-center">
              <button type="button" onClick={incMin} className="p-1 rounded-lg hover:bg-[var(--color-glass-hover)] transition-all">
                <ChevronUp size={18} />
              </button>
              <div className="w-14 h-12 flex items-center justify-center text-2xl font-extrabold gradient-text">
                {String(minute).padStart(2, '0')}
              </div>
              <button type="button" onClick={decMin} className="p-1 rounded-lg hover:bg-[var(--color-glass-hover)] transition-all">
                <ChevronDown size={18} />
              </button>
              <span className="text-[9px] text-[var(--color-text-muted)] font-semibold mt-0.5">MINUTE</span>
            </div>
          </div>

          {/* Quick select hours */}
          <div className="mb-3">
            <div className="text-[9px] font-semibold text-[var(--color-text-muted)] uppercase mb-1.5">Raccourcis</div>
            <div className="grid grid-cols-6 gap-1">
              {QUICK_HOURS.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => { setHour(h); setMinute(0); }}
                  className={`py-1 rounded text-[11px] font-semibold transition-all
                    ${hour === h && minute === 0
                      ? 'btn-gradient text-white'
                      : 'hover:bg-[var(--color-glass-hover)] text-[var(--color-text-secondary)]'
                    }`}
                >
                  {String(h).padStart(2, '0')}h
                </button>
              ))}
            </div>
          </div>

          {/* Confirm */}
          <button
            type="button"
            onClick={confirm}
            className="w-full py-2 btn-gradient rounded-xl text-sm font-semibold"
          >
            ✓ {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
          </button>
        </div>
      )}
    </div>
  );
}
