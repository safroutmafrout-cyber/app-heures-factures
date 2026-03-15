'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

interface Props {
  value: string;  // YYYY-MM-DD
  onChange: (v: string) => void;
  label?: string;
}

export default function DatePicker({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = value ? new Date(value + 'T12:00:00') : new Date();
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Update view when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T12:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // Convert to Mon=0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  function selectDay(day: number) {
    const y = viewYear;
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setOpen(false);
  }

  function formatDisplay(v: string) {
    if (!v) return '—';
    const d = new Date(v + 'T12:00:00');
    const dayName = DAYS_FR[(d.getDay() + 6) % 7];
    return `${dayName} ${d.getDate()} ${MONTHS_FR[d.getMonth()].substring(0, 3)}. ${d.getFullYear()}`;
  }

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
        <Calendar size={14} className="text-[var(--color-accent)] shrink-0" />
        <span>{formatDisplay(value)}</span>
      </button>

      {open && (
        <div className="absolute z-[9999] bottom-full mb-2 left-0 w-72 glass-card p-4 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[var(--color-glass-hover)] transition-all">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold">
              {MONTHS_FR[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[var(--color-glass-hover)] transition-all">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS_FR.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = dateStr === value;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-200
                    ${isSelected
                      ? 'btn-gradient text-white shadow-lg'
                      : isToday
                        ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                        : 'hover:bg-[var(--color-glass-hover)] text-[var(--color-text-secondary)]'
                    }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick select today */}
          <button
            type="button"
            onClick={() => { onChange(todayStr); setOpen(false); }}
            className="w-full mt-3 py-1.5 text-xs font-semibold text-[var(--color-accent)] hover:bg-[var(--color-glass-hover)] rounded-lg transition-all"
          >
            Aujourd&apos;hui
          </button>
        </div>
      )}
    </div>
  );
}
