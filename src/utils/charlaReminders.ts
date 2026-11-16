import { Charla } from '../types/sgp';

export type CharlaReminderStatus = 'today' | 'tomorrow' | 'upcoming' | 'past';

export interface CharlaReminderItem {
  charla: Charla;
  key: string;
  eventDate: Date;
  eventTime: number;
  daysUntil: number;
  status: CharlaReminderStatus;
  label: string;
  isUrgent: boolean;
}

/**
 * Formats today's date (or a given Date) strictly as DD/MM/AAAA.
 */
export function formatDateDDMMYYYY(date: Date = new Date()): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Parses DD/MM/AAAA (or fallback YYYY-MM-DD) into a local midnight Date.
 */
export function parseCharlaDate(fecha?: string): Date | null {
  if (!fecha || typeof fecha !== 'string') return null;
  const clean = fecha.trim();
  if (!clean) return null;

  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900) {
        const dt = new Date(year, month, day, 0, 0, 0, 0);
        if (!isNaN(dt.getTime())) return dt;
      }
    }
  }

  if (clean.includes('-')) {
    const parts = clean.split('T')[0].split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dt = new Date(year, month, day, 0, 0, 0, 0);
        if (!isNaN(dt.getTime())) return dt;
      } else {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const dt = new Date(year, month, day, 0, 0, 0, 0);
        if (!isNaN(dt.getTime())) return dt;
      }
    }
  }

  return null;
}

/**
 * Combines fecha (DD/MM/AAAA) and hora (HH:mm) into a timestamp for sorting.
 */
export function parseCharlaDateTime(fecha?: string, hora?: string): Date | null {
  const base = parseCharlaDate(fecha);
  if (!base) return null;
  if (hora && /^\d{1,2}:\d{2}/.test(hora.trim())) {
    const [hh, mm] = hora.trim().split(':').map((n) => parseInt(n, 10));
    if (!isNaN(hh) && !isNaN(mm)) {
      base.setHours(hh, mm, 0, 0);
    }
  }
  return base;
}

export function buildCharlaReminderKey(ch: Charla): string {
  return `${ch.id || 'tmp'}-${ch.fecha || ''}-${ch.hora || ''}-${ch.temaTratado || ''}`;
}

export function getCharlaReminderInfo(ch: Charla, now: Date = new Date()): CharlaReminderItem | null {
  const dateOnly = parseCharlaDate(ch.fecha);
  if (!dateOnly) return null;

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const diffMs = dateOnly.getTime() - todayMidnight.getTime();
  const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const fullDateTime = parseCharlaDateTime(ch.fecha, ch.hora) || dateOnly;

  let status: CharlaReminderStatus = 'past';
  let label = 'Finalizada';
  let isUrgent = false;

  if (daysUntil === 0) {
    status = 'today';
    label = ch.hora ? `HOY • ${ch.hora} hs` : 'HOY';
    isUrgent = true;
  } else if (daysUntil === 1) {
    status = 'tomorrow';
    label = ch.hora ? `MAÑANA • ${ch.hora} hs` : 'MAÑANA';
    isUrgent = true;
  } else if (daysUntil > 1) {
    status = 'upcoming';
    label = `En ${daysUntil} días`;
    isUrgent = daysUntil <= 3;
  }

  return {
    charla: ch,
    key: buildCharlaReminderKey(ch),
    eventDate: fullDateTime,
    eventTime: fullDateTime.getTime(),
    daysUntil,
    status,
    label,
    isUrgent
  };
}

/**
 * Returns upcoming (including today) charlas within maxDays, sorted chronologically.
 */
export function getUpcomingCharlasReminders(
  charlas: Charla[],
  maxDays: number = 14,
  now: Date = new Date()
): CharlaReminderItem[] {
  if (!Array.isArray(charlas)) return [];

  const items: CharlaReminderItem[] = [];
  for (const ch of charlas) {
    const info = getCharlaReminderInfo(ch, now);
    if (!info) continue;
    if (info.daysUntil >= 0 && info.daysUntil <= maxDays) {
      items.push(info);
    }
  }

  return items.sort((a, b) => a.eventTime - b.eventTime);
}
