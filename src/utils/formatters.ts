import { Vehicle, LeaveRecord } from '../types/police';

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(amount);
}

export function sanitizeDNI(value: string): string {
  // Exclusively numeric characters
  return value.replace(/\D/g, '');
}

export function formatDNI(dni: string): string {
  const clean = sanitizeDNI(dni);
  if (!clean) return '';
  return new Intl.NumberFormat('es-AR').format(parseInt(clean, 10));
}

export interface LeaveStatusInfo {
  status: 'Vigente' | 'Vencida' | 'Próxima';
  daysRemaining: number;
  totalDays: number;
}

export function calculateLeaveStatus(leave: LeaveRecord): LeaveStatusInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(leave.startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(leave.endDate);
  end.setHours(0, 0, 0, 0);

  const totalTime = end.getTime() - start.getTime();
  const totalDays = Math.max(1, Math.ceil(totalTime / (1000 * 60 * 60 * 24)) + 1);

  const remainingTime = end.getTime() - today.getTime();
  const daysRemaining = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));

  if (today > end) {
    return { status: 'Vencida', daysRemaining: 0, totalDays };
  } else if (today < start) {
    return { status: 'Próxima', daysRemaining, totalDays };
  } else {
    return { status: 'Vigente', daysRemaining: Math.max(0, daysRemaining), totalDays };
  }
}

export interface ExpiryStatus {
  status: 'Vigente' | 'Por Vencer' | 'Vencido';
  daysDifference: number;
  label: string;
  badgeClass: string;
}

export function checkDateExpiry(dateString?: string, warningDaysThreshold = 15): ExpiryStatus {
  if (!dateString) {
    return {
      status: 'Vencido',
      daysDifference: -999,
      label: 'Sin Registrar',
      badgeClass: 'text-rose-700 bg-rose-50 border-rose-200'
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return {
      status: 'Vencido',
      daysDifference: days,
      label: `Vencido (${Math.abs(days)}d)`,
      badgeClass: 'text-rose-700 bg-rose-50 border-rose-200'
    };
  } else if (days <= warningDaysThreshold) {
    return {
      status: 'Por Vencer',
      daysDifference: days,
      label: `Por vencer (${days}d)`,
      badgeClass: 'text-amber-700 bg-amber-50 border-amber-200'
    };
  } else {
    return {
      status: 'Vigente',
      daysDifference: days,
      label: 'Vigente',
      badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200'
    };
  }
}

export interface ServiceStatus {
  status: 'Al Día' | 'Próximo a Service' | 'Service Excedido';
  kmRemaining: number;
  badgeClass: string;
}

export function checkVehicleService(vehicle: Vehicle): ServiceStatus {
  const kmRemaining = vehicle.nextServiceMileage - vehicle.currentMileage;

  if (kmRemaining <= 0) {
    return {
      status: 'Service Excedido',
      kmRemaining,
      badgeClass: 'text-rose-700 bg-rose-50 border-rose-200'
    };
  } else if (kmRemaining <= 800) {
    return {
      status: 'Próximo a Service',
      kmRemaining,
      badgeClass: 'text-amber-700 bg-amber-50 border-amber-200'
    };
  } else {
    return {
      status: 'Al Día',
      kmRemaining,
      badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200'
    };
  }
}

export type TimePeriodFilter = 'today' | 'week' | 'month' | 'year' | 'custom' | 'all';

export function isDateInPeriod(
  dateString: string,
  period: TimePeriodFilter,
  customRange?: { start: string; end: string }
): boolean {
  if (period === 'all') return true;
  if (!dateString) return false;

  const target = new Date(dateString);
  const now = new Date();

  // Reset hours for pure date comparison
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === 'today') {
    return targetMidnight.getTime() === nowMidnight.getTime();
  }

  if (period === 'week') {
    const dayOfWeek = nowMidnight.getDay(); // 0 is Sunday
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(nowMidnight);
    startOfWeek.setDate(nowMidnight.getDate() - distanceToMonday);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return targetMidnight >= startOfWeek && targetMidnight <= endOfWeek;
  }

  if (period === 'month') {
    return target.getMonth() === now.getMonth() && target.getFullYear() === now.getFullYear();
  }

  if (period === 'year') {
    return target.getFullYear() === now.getFullYear();
  }

  if (period === 'custom' && customRange?.start && customRange?.end) {
    const start = new Date(customRange.start);
    const end = new Date(customRange.end);
    end.setHours(23, 59, 59, 999);
    return target >= start && target <= end;
  }

  return true;
}
