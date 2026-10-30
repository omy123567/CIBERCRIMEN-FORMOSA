import { Personal, Licencia } from '../types/sgp';

export interface CuatrienioPeriodoInfo {
  anio: number;
  diasAsignados: number;
  diasTomados: number;
  diasDevueltos: number;
  saldoRestante: number;
  estado: 'AUTOMÁTICO' | 'MANUAL' | 'VENCIDA' | 'SIN DÍAS';
}

export interface CuatrienioResumen {
  personalId: number;
  anioReferencia: number;
  anioIngreso: number;
  antiguedadAnios: number;
  escalaDiasBase: number;
  periodos: CuatrienioPeriodoInfo[];
  totalSaldoDisponible: number;
}

/**
 * Antigüedad ÚNICAMENTE en AÑOS CALENDARIO:
 * anioReferencia - anioIngreso (ej. Ingreso 2016 -> en 2026 tiene 10 años).
 * NUNCA mostrar meses.
 */
export function calcularAntiguedadAnios(fechaIngresoStr: string, anioReferencia: number): number {
  if (!fechaIngresoStr) return 0;
  // Parse DD/MM/AAAA or YYYY-MM-DD
  let anioIngreso = 0;
  if (fechaIngresoStr.includes('/')) {
    const parts = fechaIngresoStr.split('/');
    if (parts.length === 3) anioIngreso = parseInt(parts[2], 10);
  } else if (fechaIngresoStr.includes('-')) {
    const parts = fechaIngresoStr.split('-');
    if (parts.length === 3) anioIngreso = parseInt(parts[0], 10);
  }
  if (!anioIngreso || isNaN(anioIngreso)) return 0;
  return Math.max(0, anioReferencia - anioIngreso);
}

/**
 * Escala Oficial de Licencia Anual según Antigüedad:
 * 0 a 5 años: 14 días hábiles
 * 6 a 10 años: 21 días hábiles
 * 11 a 15 años: 28 días hábiles
 * 16 a 20 años: 35 días hábiles
 * 21 a 25 años: 42 días hábiles
 * Más de 25 años: 49 días hábiles
 */
export function calcularEscalaDiasAnuales(antiguedadAnios: number): number {
  if (antiguedadAnios <= 5) return 14;
  if (antiguedadAnios <= 10) return 21;
  if (antiguedadAnios <= 15) return 28;
  if (antiguedadAnios <= 20) return 35;
  if (antiguedadAnios <= 25) return 42;
  return 49;
}

/**
 * Calcula los 4 años del cuatrienio (ej. para año base 2026: 2023, 2024, 2025, 2026)
 * computando días tomados y saldos de cada período.
 */
export function calcularCuatrienioPersonal(
  personal: Personal,
  licenciasDelPersonal: Licencia[],
  anioBase = 2026
): CuatrienioResumen {
  const anioReferencia = anioBase;
  const antiguedad = calcularAntiguedadAnios(personal.fechaIngreso, anioReferencia);
  const escalaBase = calcularEscalaDiasAnuales(antiguedad);

  // Parse customFields for manual adjustments
  let manualPeriods: Record<string, { dias: number; estado: 'AUTOMÁTICO' | 'MANUAL' | 'VENCIDA' | 'SIN DÍAS' }> = {};
  if (personal.customFieldsJson) {
    try {
      const parsed = JSON.parse(personal.customFieldsJson);
      if (parsed.periodosManuales) {
        manualPeriods = parsed.periodosManuales;
      }
    } catch (e) {
      // ignore
    }
  }

  // 4 independent years of the cuatrienio: [anioBase - 3, anioBase - 2, anioBase - 1, anioBase]
  const aniosCuatrienio = [anioBase - 3, anioBase - 2, anioBase - 1, anioBase];

  const periodos: CuatrienioPeriodoInfo[] = aniosCuatrienio.map((anio) => {
    // Check manual override
    const manualConfig = manualPeriods[anio.toString()];
    let estado: 'AUTOMÁTICO' | 'MANUAL' | 'VENCIDA' | 'SIN DÍAS' = manualConfig?.estado || 'AUTOMÁTICO';
    let diasAsignados = manualConfig?.dias !== undefined ? manualConfig.dias : escalaBase;

    // Sum taken days for this period (ONLY from type 'Anual'!)
    let diasTomados = 0;
    let diasDevueltos = 0;

    licenciasDelPersonal.forEach((lic) => {
      if (lic.tipoLicencia === 'Anual') {
        // Check if multi-period JSON exists
        if (lic.periodosDetalleJson) {
          try {
            const detalle = JSON.parse(lic.periodosDetalleJson);
            if (detalle[anio.toString()] !== undefined) {
              diasTomados += Number(detalle[anio.toString()]) || 0;
            }
          } catch {
            if (lic.anioPeriodo === anio) {
              diasTomados += lic.diasHabilesTomados;
            }
          }
        } else if (lic.anioPeriodo === anio) {
          diasTomados += lic.diasHabilesTomados;
        }

        if (lic.fueInterrumpida && lic.anioPeriodo === anio) {
          diasDevueltos += lic.diasRestantesDevueltos || 0;
        }
      }
    });

    let saldo = Math.max(0, diasAsignados - diasTomados + diasDevueltos);

    if (estado === 'VENCIDA') {
      saldo = 0;
      diasAsignados = 0;
    } else if (estado === 'SIN DÍAS' || saldo === 0) {
      saldo = 0;
      if (estado !== 'MANUAL') estado = 'SIN DÍAS';
    }

    return {
      anio,
      diasAsignados,
      diasTomados,
      diasDevueltos,
      saldoRestante: saldo,
      estado
    };
  });

  const totalSaldoDisponible = periodos.reduce((acc, p) => acc + p.saldoRestante, 0);

  // Extract year of entry
  let anioIngreso = 0;
  if (personal.fechaIngreso) {
    const parts = personal.fechaIngreso.split('/');
    if (parts.length === 3) anioIngreso = parseInt(parts[2], 10);
  }

  return {
    personalId: personal.id || 0,
    anioReferencia,
    anioIngreso,
    antiguedadAnios: antiguedad,
    escalaDiasBase: escalaBase,
    periodos,
    totalSaldoDisponible
  };
}
