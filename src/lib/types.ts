// ── Core Types for the App ──────────────────────────

export interface UserProfile {
  companyName: string;
  tps: string;
  tvq: string;
  fullName: string;
  address: string;
  city: string;
  phone: string;
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  address: string;
  city: string;
  hourlyRate: number;
  overtimeThreshold: number; // hours per week
  overtimeMultiplier: number; // e.g. 1.5
}

export interface TimeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string; // HH:mm
  hours: number; // decimal hours
  clientId: string;
  isHoliday: boolean;
  notes: string;
}

export interface Invoice {
  id: string;
  number: number;
  weekOf: string; // YYYY-MM-DD (Monday)
  clientId: string;
  entries: TimeEntry[];
  normalHours: number;
  overtimeHours: number;
  holidayHours: number;
  subtotal: number;
  tps: number;
  tvq: number;
  total: number;
  createdAt: string;
}

export interface WeekSummary {
  weekKey: string;
  weekLabel: string;
  totalHours: number;
  normalHours: number;
  overtimeHours: number;
  holidayHours: number;
  entries: TimeEntry[];
  earnings: number;
}

export interface DashboardMetrics {
  currentWeekHours: number;
  currentWeekEarnings: number;
  overtimeThreshold: number;
  overtimeProgress: number; // 0-1
  monthHours: number;
  monthEarnings: number;
  totalHoursAllTime: number;
  totalEarningsAllTime: number;
  totalWeeks: number;
  pastWeeksCount: number;
  avgHoursPerWeek: number;
  maxWeekHours: number;
  minWeekHours: number | null;
  entriesThisWeek: TimeEntry[];
}

// Quebec statutory holidays
export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}
