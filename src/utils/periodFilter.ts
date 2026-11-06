/**
 * Period Filter Utility for S.I.S.D.I.C.
 * Handles calculation of date ranges (semana, mes, año, personalizado)
 * and filtering/purging/restoring of records.
 */

import { SgpBackupData, Expediente, FolioRegistro, Personal, PersonaInvestigada, Recargo, Charla, Reparacion, Licencia } from '../types/sgp';

export type PeriodType = 'semana' | 'mes' | 'anio' | 'personalizado';

export interface PeriodDateRange {
  type: PeriodType;
  startDate: Date;
  endDate: Date;
  startStr: string; // YYYY-MM-DD
  endStr: string;   // YYYY-MM-DD
  label: string;
}

export interface EntitySelection {
  expedientes: boolean;
  foliosNumerario: boolean;
  personas: boolean;
  licencias: boolean;
  recargos: boolean;
  reparaciones: boolean;
  charlas: boolean;
}

export const DEFAULT_ENTITY_SELECTION: EntitySelection = {
  expedientes: true,
  foliosNumerario: true,
  personas: true,
  licencias: true,
  recargos: true,
  reparaciones: true,
  charlas: true
};

/**
 * Normalizes any string or number representation of a date to a comparable timestamp.
 * Handles 'YYYY-MM-DD', 'DD/MM/YYYY', ISO timestamps, and 4-digit years.
 */
export function parseDateToTime(val?: string | number | null): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') {
    if (val >= 1970 && val <= 2100) {
      return new Date(val, 0, 1).getTime();
    }
    return val;
  }
  const str = String(val).trim();
  if (!str) return null;

  // DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(str)) {
    const sep = str.includes('/') ? '/' : '-';
    const [d, m, y] = str.split(sep);
    const parsed = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  // YYYY-MM-DD
  if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(str)) {
    const sep = str.includes('/') ? '/' : '-';
    const parts = str.split('T')[0].split(sep);
    const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  const timestamp = Date.parse(str);
  return isNaN(timestamp) ? null : timestamp;
}

/**
 * Formats a Date object as 'YYYY-MM-DD' for HTML date inputs.
 */
export function toInputDateFormat(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the start and end dates for a chosen period.
 */
export function calculatePeriodRange(
  period: PeriodType,
  customStart?: string,
  customEnd?: string
): PeriodDateRange {
  const now = new Date();

  if (period === 'semana') {
    // Current week: last 7 days through end of today
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    return {
      type: 'semana',
      startDate: start,
      endDate: end,
      startStr: toInputDateFormat(start),
      endStr: toInputDateFormat(end),
      label: 'Última Semana (Últimos 7 días)'
    };
  }

  if (period === 'mes') {
    // Current month: 1st day of current month through today
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return {
      type: 'mes',
      startDate: start,
      endDate: end,
      startStr: toInputDateFormat(start),
      endStr: toInputDateFormat(end),
      label: `Mes Actual (${monthNames[now.getMonth()]} ${now.getFullYear()})`
    };
  }

  if (period === 'anio') {
    // Current calendar year: Jan 1 through Dec 31
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    return {
      type: 'anio',
      startDate: start,
      endDate: end,
      startStr: toInputDateFormat(start),
      endStr: toInputDateFormat(end),
      label: `Año Actual (${now.getFullYear()})`
    };
  }

  // Personalizado
  const sDate = customStart ? new Date(customStart + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), 1);
  const eDate = customEnd ? new Date(customEnd + 'T23:59:59.999') : new Date(now);

  return {
    type: 'personalizado',
    startDate: sDate,
    endDate: eDate,
    startStr: toInputDateFormat(sDate),
    endStr: toInputDateFormat(eDate),
    label: `Rango Personalizado (${toInputDateFormat(sDate)} al ${toInputDateFormat(eDate)})`
  };
}

/**
 * Checks if a record's date falls within [startTime, endTime].
 */
export function isTimestampInPeriod(time: number | null, startTime: number, endTime: number): boolean {
  if (time === null) return false;
  return time >= startTime && time <= endTime;
}

export interface PeriodCounts {
  expedientes: number;
  foliosNumerario: number;
  personas: number;
  licencias: number;
  recargos: number;
  reparaciones: number;
  charlas: number;
  total: number;
}

/**
 * Computes how many records match the period range in the provided data.
 */
export function countRecordsInPeriod(
  data: Partial<SgpBackupData>,
  range: PeriodDateRange,
  entities: EntitySelection = DEFAULT_ENTITY_SELECTION
): PeriodCounts {
  const startTime = range.startDate.getTime();
  const endTime = range.endDate.getTime();

  let expCount = 0;
  if (entities.expedientes && data.expedientes) {
    expCount = data.expedientes.filter((e) => {
      const t = parseDateToTime(e.fechaIngreso);
      return isTimestampInPeriod(t, startTime, endTime);
    }).length;
  }

  let foliosCount = 0;
  if (entities.foliosNumerario && data.foliosNumerario) {
    foliosCount = data.foliosNumerario.filter((f) => {
      const t = parseDateToTime(f.fecha || f.fechaAsignacion) || (f.anio ? parseDateToTime(f.anio) : null);
      return isTimestampInPeriod(t, startTime, endTime);
    }).length;
  }

  let personasCount = 0;
  if (entities.personas && data.personas) {
    personasCount = data.personas.filter((p) => {
      const t = parseDateToTime(p.fechaRegistro);
      return isTimestampInPeriod(t, startTime, endTime);
    }).length;
  }

  let licCount = 0;
  if (entities.licencias && data.licencias) {
    licCount = data.licencias.filter((l) => {
      const t = parseDateToTime(l.fechaSalida) || parseDateToTime(l.fechaIngreso) || (l.anioPeriodo ? parseDateToTime(l.anioPeriodo) : null);
      return isTimestampInPeriod(t, startTime, endTime);
    }).length;
  }

  let recargosCount = 0;
  if (entities.recargos && data.recargos) {
    recargosCount = data.recargos.filter((r) => {
      const t = parseDateToTime(r.fecha);
      return isTimestampInPeriod(t, startTime, endTime);
    }).length;
  }

  let repCount = 0;
  if (entities.reparaciones && data.reparaciones) {
    repCount = data.reparaciones.filter((r) => {
      const t = parseDateToTime(r.fecha);
      return isTimestampInPeriod(t, startTime, endTime);
    }).length;
  }

  let charlasCount = 0;
  if (entities.charlas && data.charlas) {
    charlasCount = data.charlas.filter((c) => {
      const t = parseDateToTime(c.fecha);
      return isTimestampInPeriod(t, startTime, endTime);
    }).length;
  }

  return {
    expedientes: expCount,
    foliosNumerario: foliosCount,
    personas: personasCount,
    licencias: licCount,
    recargos: recargosCount,
    reparaciones: repCount,
    charlas: charlasCount,
    total: expCount + foliosCount + personasCount + licCount + recargosCount + repCount + charlasCount
  };
}

/**
 * Filters the backup dataset, returning only records that match the period.
 */
export function extractPeriodBackup(
  data: SgpBackupData,
  range: PeriodDateRange,
  entities: EntitySelection = DEFAULT_ENTITY_SELECTION
): Partial<SgpBackupData> & { periodMeta: PeriodDateRange; timestamp?: string } {
  const startTime = range.startDate.getTime();
  const endTime = range.endDate.getTime();

  return {
    periodMeta: range,
    version: data.version,
    timestamp: new Date().toISOString(),
    institutionalConfig: data.institutionalConfig,
    delegacionId: data.delegacionId,
    personal: data.personal, // Personnel records are catalog-like, preserved for integrity
    dynamicCatalogs: data.dynamicCatalogs,
    moviles: data.moviles,
    expedientes: entities.expedientes
      ? (data.expedientes || []).filter((e) => isTimestampInPeriod(parseDateToTime(e.fechaIngreso), startTime, endTime))
      : [],
    foliosNumerario: entities.foliosNumerario
      ? (data.foliosNumerario || []).filter((f) => isTimestampInPeriod(parseDateToTime(f.fecha || f.fechaAsignacion) || (f.anio ? parseDateToTime(f.anio) : null), startTime, endTime))
      : [],
    personas: entities.personas
      ? (data.personas || []).filter((p) => isTimestampInPeriod(parseDateToTime(p.fechaRegistro), startTime, endTime))
      : [],
    licencias: entities.licencias
      ? (data.licencias || []).filter((l) => isTimestampInPeriod(parseDateToTime(l.fechaSalida) || parseDateToTime(l.fechaIngreso) || (l.anioPeriodo ? parseDateToTime(l.anioPeriodo) : null), startTime, endTime))
      : [],
    recargos: entities.recargos
      ? (data.recargos || []).filter((r) => isTimestampInPeriod(parseDateToTime(r.fecha), startTime, endTime))
      : [],
    reparaciones: entities.reparaciones
      ? (data.reparaciones || []).filter((r) => isTimestampInPeriod(parseDateToTime(r.fecha), startTime, endTime))
      : [],
    charlas: entities.charlas
      ? (data.charlas || []).filter((c) => isTimestampInPeriod(parseDateToTime(c.fecha), startTime, endTime))
      : []
  };
}
