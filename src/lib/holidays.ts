import { Holiday } from './types';

// Easter computation (Anonymous Gregorian algorithm)
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Get the nth weekday of a given month
function getNthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const firstDay = new Date(year, month, 1);
  let dayOfWeek = firstDay.getDay();
  let day = 1 + ((weekday - dayOfWeek + 7) % 7) + (n - 1) * 7;
  return new Date(year, month, day);
}

export function getQuebecHolidays(year: number): Holiday[] {
  const easter = getEasterDate(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);

  // Victoria Day / Fête des Patriotes: Monday before May 25
  const may25 = new Date(year, 4, 25);
  const dayOfWeek = may25.getDay();
  const patriotesDay = new Date(year, 4, 25 - ((dayOfWeek + 6) % 7));

  // Labour Day: 1st Monday of September
  const labourDay = getNthWeekday(year, 8, 1, 1);

  // Thanksgiving: 2nd Monday of October
  const thanksgiving = getNthWeekday(year, 9, 1, 2);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  return [
    { date: `${year}-01-01`, name: "Jour de l'An" },
    { date: `${year}-01-02`, name: "Lendemain du Jour de l'An" },
    { date: fmt(goodFriday), name: "Vendredi saint" },
    { date: fmt(easterMonday), name: "Lundi de Pâques" },
    { date: fmt(patriotesDay), name: "Fête des Patriotes" },
    { date: `${year}-06-24`, name: "Fête nationale du Québec" },
    { date: `${year}-07-01`, name: "Fête du Canada" },
    { date: fmt(labourDay), name: "Fête du Travail" },
    { date: fmt(thanksgiving), name: "Action de grâce" },
    { date: `${year}-12-25`, name: "Noël" },
    { date: `${year}-12-26`, name: "Lendemain de Noël" },
  ];
}

export function isQuebecHoliday(dateStr: string): Holiday | null {
  const year = parseInt(dateStr.substring(0, 4));
  const holidays = getQuebecHolidays(year);
  return holidays.find(h => h.date === dateStr) || null;
}
