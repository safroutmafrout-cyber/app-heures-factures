const JOURS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const JOURS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function calcHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  let [eh, em] = end.split(':').map(Number);
  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 24 * 60;
  let hours = Math.round(((endMin - startMin) / 60) * 100) / 100;

  // Fix likely AM/PM confusion: if hours > 16 and start is afternoon,
  // and end hour is 12, the user likely meant 00:XX instead of 12:XX
  if (hours > 16 && sh >= 12 && eh === 12) {
    endMin = em; // treat 12:XX as 00:XX
    if (endMin <= startMin) endMin += 24 * 60;
    hours = Math.round(((endMin - startMin) / 60) * 100) / 100;
  }

  return hours;
}

export function getDayName(dateStr: string, short = false): string {
  const d = new Date(dateStr + 'T12:00:00');
  return short ? JOURS_FR[d.getDay()] : JOURS_FULL[d.getDay()];
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateShort(dateStr: string): string {
  return dateStr; // YYYY-MM-DD
}

export function getWeekKey(dateStr: string): string {
  if (!dateStr) return getCurrentWeekKey();
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return getCurrentWeekKey();
  const day = d.getDay(); // 0=Sun, 6=Sat
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day); // go back to Sunday
  return sunday.toISOString().split('T')[0];
}

export function getWeekRange(weekKey: string): string {
  const sun = new Date(weekKey + 'T12:00:00');
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  const dSun = sun.getDate();
  const dSat = sat.getDate();
  const mSun = MOIS_FR[sun.getMonth()];
  const mSat = MOIS_FR[sat.getMonth()];
  if (mSun === mSat) {
    return `${dSun} au ${dSat} ${mSun}`;
  }
  return `${dSun} ${mSun} au ${dSat} ${mSat}`;
}

export function getCurrentWeekKey(): string {
  return getWeekKey(new Date().toISOString().split('T')[0]);
}

export function getWeekDates(weekKey: string): string[] {
  const dates: string[] = [];
  const sun = new Date(weekKey + 'T12:00:00');
  for (let i = 0; i < 7; i++) {
    const d = new Date(sun);
    d.setDate(sun.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export function money(n: number): string {
  return n.toLocaleString('fr-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' $';
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
