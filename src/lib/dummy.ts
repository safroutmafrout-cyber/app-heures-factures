import { saveProfile, setOnboarded, saveClients, saveEntries } from './store';
import { isQuebecHoliday } from './holidays';
import type { Client, TimeEntry } from './types';
import { generateId } from './utils';

export function loadDummyData() {
  localStorage.clear();

  saveProfile({
    companyName: '1234-5678 Québec Inc.',
    tps: '123456789 RT 0001',
    tvq: '1234567890 TVQ0001',
    fullName: 'Jean Tremblay',
    address: '123 Rue Principale',
    city: 'Montréal, H2X 1Y4 QC',
    phone: '514-555-0123'
  });

  const client1: Client = {
    id: generateId(),
    name: 'Transport Express Inc.',
    address: '456 Boul Industriel',
    city: 'Laval QC',
    hourlyRate: 31,
    overtimeThreshold: 60,
    overtimeMultiplier: 1.5
  };

  const client2: Client = {
    id: generateId(),
    name: 'Transport ABC',
    address: '100 Rue Exemple',
    city: 'Montréal QC',
    hourlyRate: 28,
    overtimeThreshold: 50,
    overtimeMultiplier: 1.5
  };

  saveClients([client1, client2]);
  setOnboarded();

  const entries: TimeEntry[] = [];
  const startDate = new Date('2025-06-01T12:00:00');
  const endDate = new Date(); // today

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    if (dayOfWeek === 0) continue; // Off on Sundays

    const dateStr = d.toISOString().split('T')[0];
    const isHoliday = !!isQuebecHoliday(dateStr);
    
    // Determine schedule based on some randomness
    // Alternate weeks heavy and light so some weeks have overtime and others don't
    const weekNum = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000));
    const isHeavyWeek = weekNum % 2 === 0;

    let start = '14:00';
    let end = '';
    let hours = 0;
    
    if (isHeavyWeek) {
      end = '02:00'; // 12h day -> 72h/week (overtime!)
      hours = 12;
    } else {
      end = '23:30'; // 9.5h day -> 47.5h/week (no overtime)
      hours = 9.5;
      if (dayOfWeek === 6) continue; // Off on Saturdays on light weeks
    }

    // Sometimes work for client 2 (20% of the time)
    const cId = (Math.random() > 0.8) ? client2.id : client1.id;

    entries.push({
      id: generateId(),
      date: dateStr,
      start,
      end,
      hours,
      clientId: cId,
      isHoliday,
      notes: isHoliday ? 'Jour férié' : ''
    });
  }

  saveEntries(entries);
}
