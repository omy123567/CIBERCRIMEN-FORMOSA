import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Users,
  Car,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Activity,
  Printer,
  ChevronRight,
  Shield
} from 'lucide-react';
import {
  Expediente,
  Personal,
  Movil,
  Reparacion,
  Charla,
  DynamicCatalog,
  InstitutionalConfig
} from '../../types/sgp';
import { db } from '../../db/dexieDb';
import {
  generateSgpDashboardReportDoc,
  exportSgpDashboardReportPDF,
  SgpPaperSize,
  SgpOrientation
} from '../../utils/sgpPdfGenerator';
import { PdfPreviewModal } from '../common/PdfPreviewModal';

interface ExecutiveDashboardProps {
  expedientes: Expediente[];
  personalList: Personal[];
  moviles: Movil[];
  reparaciones: Reparacion[];
  catalogs: DynamicCatalog[];
  institutionalConfig: InstitutionalConfig;
  selectedYear: string;
  onSelectYear: (year: string) => void;
  onNavigate: (module: string) => void;
}

type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'all';

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  expedientes,
  personalList,
  moviles,
  reparaciones,
  catalogs,
  institutionalConfig,
  selectedYear,
  onSelectYear,
  onNavigate
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [charlas, setCharlas] = useState<Charla[]>([]);
  const [pdfPreviewBlob, setPdfPreviewBlob] = useState<{ blob: Blob; title: string; filename: string } | null>(null);

  useEffect(() => {
    db.charlas.toArray().then((c) => setCharlas(c || []));
  }, []);

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add('2026');
    years.add('2025');
    years.add('2024');
    expedientes.forEach((e) => {
      if (e.anio) years.add(e.anio);
    });
    return Array.from(years).sort().reverse();
  }, [expedientes]);

  // Filter expedientes by Selected Year and Period
  const filteredExpedientes = useMemo(() => {
    return expedientes.filter((e) => {
      if (selectedYear && e.anio !== selectedYear) return false;
      if (period === 'all') return true;
      if (!e.fechaIngreso) return true;

      const parts = e.fechaIngreso.split('/');
      if (parts.length !== 3) return true;
      const ingDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (period === 'today') {
        return (
          ingDate.getDate() === today.getDate() &&
          ingDate.getMonth() === today.getMonth() &&
          ingDate.getFullYear() === today.getFullYear()
        );
      }
      if (period === 'week') {
        const diffDays = (today.getTime() - ingDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (period === 'month') {
        return ingDate.getMonth() === today.getMonth() && ingDate.getFullYear() === today.getFullYear();
      }
      if (period === 'year') {
        return ingDate.getFullYear().toString() === selectedYear;
      }

      return true;
    });
  }, [expedientes, selectedYear, period]);

  // Period label for report
  const periodLabel = useMemo(() => {
    const now = new Date();
    if (period === 'today') return `Diario (${now.toLocaleDateString('es-AR')})`;
    if (period === 'week') return `Semanal (Últimos 7 días - ${now.toLocaleDateString('es-AR')})`;
    if (period === 'month') return `Mensual (${now.toLocaleString('es-AR', { month: 'long', year: 'numeric' })})`;
    if (period === 'year') return `Anual (Año ${selectedYear})`;
    return `Histórico Consolidado (${selectedYear})`;
  }, [period, selectedYear]);

  // Filter Charlas by period
  const filteredCharlas = useMemo(() => {
    return charlas.filter((c) => {
      if (!c.fecha) return true;
      if (period === 'all') return true;
      const parts = c.fecha.split('/');
      if (parts.length !== 3) return true;
      const chDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (period === 'week') {
        const diffDays = (today.getTime() - chDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (period === 'month') {
        return chDate.getMonth() === today.getMonth() && chDate.getFullYear() === today.getFullYear();
      }
      if (period === 'year') {
        return chDate.getFullYear().toString() === selectedYear;
      }
      return true;
    });
  }, [charlas, period, selectedYear]);

  // Specific Task breakdown and metrics
  const taskAnalysis = useMemo(() => {
    let escalamientosCount = 0;
    let escalamientosConRecibo = 0;
    let escalamientosSinRecibo = 0;

    let totalPersonasResguardo = 0;
    let totalExpedientesResguardo = 0;

    let descargaFilmicaCount = 0;
    let resguardoConEscalamientoCount = 0;
    let otrasTareasCount = 0;

    let ppiCount = 0;
    let ppiConOficio = 0;
    let ppiSinOficio = 0;

    let faltaOficioCount = 0;
    let conOficioCount = 0;

    filteredExpedientes.forEach((exp) => {
      let custom: any = {};
      try {
        custom = exp.customFieldsJson ? JSON.parse(exp.customFieldsJson) : {};
      } catch {
        // ignore
      }

      const isFO = !!custom.isFaltaOficio;
      if (isFO) faltaOficioCount++;
      else conOficioCount++;

      const isPPI = !!custom.isPPI;
      if (isPPI) {
        ppiCount++;
        if (isFO) ppiSinOficio++;
        else ppiConOficio++;
      }

      const reqLower = (exp.tipoRequerimiento || '').toLowerCase();

      if (reqLower.includes('escalamiento') && !reqLower.includes('resguardo')) {
        escalamientosCount++;
        if (custom.imagenReciboUri || exp.estado === 'Elevado') {
          escalamientosConRecibo++;
        } else {
          escalamientosSinRecibo++;
        }
      } else if (reqLower.includes('resguardo') && reqLower.includes('escalamiento')) {
        resguardoConEscalamientoCount++;
        const pCount = custom.evidencePersons?.length || 1;
        totalPersonasResguardo += pCount;
        totalExpedientesResguardo++;
      } else if (reqLower.includes('resguardo') || reqLower.includes('evidencia')) {
        const pCount = custom.evidencePersons?.length || 1;
        totalPersonasResguardo += pCount;
        totalExpedientesResguardo++;
      } else if (reqLower.includes('film') || reqLower.includes('descarga') || reqLower.includes('camara')) {
        descargaFilmicaCount++;
      } else {
        otrasTareasCount++;
      }
    });

    const totalActividades =
      escalamientosCount +
      totalPersonasResguardo +
      resguardoConEscalamientoCount +
      descargaFilmicaCount +
      otrasTareasCount;

    return {
      escalamientosCount,
      escalamientosConRecibo,
      escalamientosSinRecibo,
      totalPersonasResguardo,
      totalExpedientesResguardo,
      descargaFilmicaCount,
      resguardoConEscalamientoCount,
      otrasTareasCount,
      totalActividades,
      ppiCount,
      ppiConOficio,
      ppiSinOficio,
      faltaOficioCount,
      conOficioCount
    };
  }, [filteredExpedientes]);

  // Section B: Dependencies with greatest intervention matrix
  const dependencyMatrix = useMemo(() => {
    const map: Record<
      string,
      {
        dependencia: string;
        escalam: number;
        resgEvid: number;
        resgCEsc: number;
        descFilm: number;
        otras: number;
        total: number;
      }
    > = {};

    filteredExpedientes.forEach((exp) => {
      const dep = exp.dependenciaSolicitante?.trim() || 'Comisaría Laguna Blanca';
      if (!map[dep]) {
        map[dep] = {
          dependencia: dep,
          escalam: 0,
          resgEvid: 0,
          resgCEsc: 0,
          descFilm: 0,
          otras: 0,
          total: 0
        };
      }

      let custom: any = {};
      try {
        custom = exp.customFieldsJson ? JSON.parse(exp.customFieldsJson) : {};
      } catch {
        // ignore
      }

      const reqLower = (exp.tipoRequerimiento || '').toLowerCase();
      if (reqLower.includes('escalamiento') && !reqLower.includes('resguardo')) {
        map[dep].escalam++;
        map[dep].total++;
      } else if (reqLower.includes('resguardo') && reqLower.includes('escalamiento')) {
        const p = custom.evidencePersons?.length || 1;
        map[dep].resgCEsc += p;
        map[dep].total += p;
      } else if (reqLower.includes('resguardo') || reqLower.includes('evidencia')) {
        const p = custom.evidencePersons?.length || 1;
        map[dep].resgEvid += p;
        map[dep].total += p;
      } else if (reqLower.includes('film') || reqLower.includes('descarga')) {
        map[dep].descFilm++;
        map[dep].total++;
      } else {
        map[dep].otras++;
        map[dep].total++;
      }
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredExpedientes]);

  // Section C: Courts with highest activity matrix
  const courtMatrix = useMemo(() => {
    const map: Record<
      string,
      {
        juzgado: string;
        escalam: number;
        resgEvid: number;
        resgCEsc: number;
        descFilm: number;
        otras: number;
        total: number;
      }
    > = {};

    filteredExpedientes.forEach((exp) => {
      const court = exp.juzgado?.trim() || 'Juzgado Penal 1-Clorinda';
      if (!map[court]) {
        map[court] = {
          juzgado: court,
          escalam: 0,
          resgEvid: 0,
          resgCEsc: 0,
          descFilm: 0,
          otras: 0,
          total: 0
        };
      }

      let custom: any = {};
      try {
        custom = exp.customFieldsJson ? JSON.parse(exp.customFieldsJson) : {};
      } catch {
        // ignore
      }

      const reqLower = (exp.tipoRequerimiento || '').toLowerCase();
      if (reqLower.includes('escalamiento') && !reqLower.includes('resguardo')) {
        map[court].escalam++;
        map[court].total++;
      } else if (reqLower.includes('resguardo') && reqLower.includes('escalamiento')) {
        const p = custom.evidencePersons?.length || 1;
        map[court].resgCEsc += p;
        map[court].total += p;
      } else if (reqLower.includes('resguardo') || reqLower.includes('evidencia')) {
        const p = custom.evidencePersons?.length || 1;
        map[court].resgEvid += p;
        map[court].total += p;
      } else if (reqLower.includes('film') || reqLower.includes('descarga')) {
        map[court].descFilm++;
        map[court].total++;
      } else {
        map[court].otras++;
        map[court].total++;
      }
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredExpedientes]);

  // Section D: Breakdown by requirement type (Con Oficio vs Falta Oficio)
  const reqComparison = useMemo(() => {
    const map: Record<
      string,
      {
        req: string;
        conOficio: number;
        faltaOficio: number;
        totalCasos: number;
        entregados: number;
      }
    > = {};

    filteredExpedientes.forEach((exp) => {
      const req = exp.tipoRequerimiento || 'Otros';
      if (!map[req]) {
        map[req] = { req, conOficio: 0, faltaOficio: 0, totalCasos: 0, entregados: 0 };
      }

      let custom: any = {};
      try {
        custom = exp.customFieldsJson ? JSON.parse(exp.customFieldsJson) : {};
      } catch {
        // ignore
      }

      map[req].totalCasos++;
      if (custom.isFaltaOficio) {
        map[req].faltaOficio++;
      } else {
        map[req].conOficio++;
      }

      if (exp.estado === 'Elevado' || exp.estado === 'Diligenciado') {
        map[req].entregados++;
      }
    });

    return Object.values(map).sort((a, b) => b.totalCasos - a.totalCasos);
  }, [filteredExpedientes]);

  const handlePrint = () => {
    window.print();
  };

  const [dashboardPdfFormat, setDashboardPdfFormat] = useState<{ paperSize: SgpPaperSize; orientation: SgpOrientation }>({
    paperSize: 'a4',
    orientation: 'portrait'
  });

  const buildDashboardDoc = (paperSize: SgpPaperSize, orientation: SgpOrientation) => {
    return generateSgpDashboardReportDoc(
      institutionalConfig,
      selectedYear,
      periodLabel,
      {
        totalExpedientes: filteredExpedientes.length,
        enTramite: filteredExpedientes.filter((e) => e.estado === 'En Trámite').length,
        elevados: filteredExpedientes.filter((e) => e.estado === 'Elevado' || e.estado === 'Diligenciado').length,
        vencidos: 0,
        totalPersonasResguardo: taskAnalysis.totalPersonasResguardo,
        ppiCount: taskAnalysis.ppiCount,
        movilesOperativos: moviles.filter((m) => m.condicion === 'En Servicio').length,
        movilesTaller: moviles.filter((m) => m.condicion === 'Taller').length
      },
      [
        { req: 'Escalamiento de Datos', count: taskAnalysis.escalamientosCount },
        { req: 'Resguardo de Evidencia', count: taskAnalysis.totalPersonasResguardo },
        { req: 'Resguardo C/ Escalamiento', count: taskAnalysis.resguardoConEscalamientoCount },
        { req: 'Descarga de Filmaciones', count: taskAnalysis.descargaFilmicaCount },
        { req: 'Otras Tareas', count: taskAnalysis.otrasTareasCount }
      ],
      courtMatrix.map((c) => ({ court: c.juzgado, count: c.total })),
      { paperSize, orientation }
    );
  };

  const handleExportPDF = () => {
    const doc = buildDashboardDoc(dashboardPdfFormat.paperSize, dashboardPdfFormat.orientation);
    const blob = doc.output('blob');
    setPdfPreviewBlob({
      blob,
      title: `Informe Estadístico de Gestión Operativa - Año ${selectedYear}`,
      filename: `SGP_Informe_Gestion_${selectedYear}_${new Date().toISOString().slice(0, 10)}.pdf`
    });
  };

  const handleChangeDashboardPdfFormat = (size: SgpPaperSize, orient: SgpOrientation) => {
    setDashboardPdfFormat({ paperSize: size, orientation: orient });
    const doc = buildDashboardDoc(size, orient);
    setPdfPreviewBlob((prev) => (prev ? { ...prev, blob: doc.output('blob') } : null));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 print:p-0 print:space-y-4">
      {/* Top Filter and Actions Bar (Hidden during printing) */}
      <div className="print:hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase">
            SGP / SISPOL • D.D.P.C.L.B. LAGUNA BLANCA
          </span>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
            Reporte Ejecutivo y Estadísticas Operativas
          </h1>
          <p className="text-xs text-slate-500">
            Informe oficial con métricas de resguardos por persona, dependencias, juzgados y PPI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-slate-500 ml-1" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Año:</span>
            <select
              value={selectedYear}
              onChange={(e) => onSelectYear(e.target.value)}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-xs px-2.5 py-1 rounded-lg border-0 shadow-xs cursor-pointer focus:outline-none"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Temporal filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['today', 'week', 'month', 'year', 'all'] as PeriodFilter[]).map((p) => {
              const labels: Record<PeriodFilter, string> = {
                today: 'Hoy',
                week: 'Semana',
                month: 'Mes',
                year: 'Año',
                all: 'Histórico'
              };
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    period === p
                      ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Exportar PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          OFFICIAL INSTITUTIONAL REPORT CONTAINER (Styled like image_cc972327.png)
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-7 print:border-none print:shadow-none print:p-0">
        
        {/* Header Document Titles */}
        <div className="text-center space-y-1 pb-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wide uppercase">
            REPORTE OFICIAL RÁPIDO DE GESTIÓN Y ESTADÍSTICA SGP
          </h2>
          <div className="text-xs text-slate-500 font-medium">
            Período de Gestión: <span className="font-semibold text-slate-700 dark:text-slate-300">{periodLabel}</span>
          </div>
        </div>

        {/* Banner: Resumen General Operativo */}
        <div className="space-y-1">
          <h3 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider">
            RESUMEN GENERAL OPERATIVO Y ESTADÍSTICA DE REGISTROS
          </h3>
          <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            PERÍODO: {periodLabel} | EXPEDIENTES REGISTRADOS: {filteredExpedientes.length} (Sin Oficio: {taskAnalysis.faltaOficioCount} | Total: {filteredExpedientes.length}) | PPI: {taskAnalysis.ppiCount} | CHARLAS: {filteredCharlas.length}
          </div>
        </div>

        {/* =========================================================================
            SECTION A. CANTIDADES TOTALES CONSOLIDADAS Y GRÁFICO DE TAREAS OPERATIVAS
           ========================================================================= */}
        <div className="space-y-4">
          <div className="bg-blue-50/80 dark:bg-blue-950/40 px-3 py-1.5 rounded-lg border-l-4 border-blue-600">
            <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase">
              A. CANTIDADES TOTALES CONSOLIDADAS Y GRÁFICO DE TAREAS OPERATIVAS
            </h4>
          </div>

          {/* 5 KPI Cards with Colored Header Stripes */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* 1. ESCALAMIENTOS */}
            <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
              <div className="h-1.5 bg-indigo-600 w-full" />
              <div className="p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                  ESCALAMIENTOS
                </span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 block mt-0.5">
                  {taskAnalysis.escalamientosCount}
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                  {taskAnalysis.escalamientosSinRecibo} S/R | {taskAnalysis.escalamientosConRecibo} C/R
                </span>
              </div>
            </div>

            {/* 2. RESG. EVIDENCIA (STRICT: TOTAL PERSONAS vs TOTAL EXPEDIENTES) */}
            <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
              <div className="h-1.5 bg-teal-600 w-full" />
              <div className="p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                  RESG. EVIDENCIA
                </span>
                <span className="text-2xl font-black text-teal-600 dark:text-teal-400 block mt-0.5">
                  {taskAnalysis.totalPersonasResguardo}
                </span>
                <span className="text-[10px] text-teal-700 dark:text-teal-300 font-mono font-bold mt-0.5 block">
                  {taskAnalysis.totalPersonasResguardo} Pers. | {taskAnalysis.totalExpedientesResguardo} Exp.
                </span>
              </div>
            </div>

            {/* 3. DESCARGA FÍLMICA */}
            <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
              <div className="h-1.5 bg-amber-500 w-full" />
              <div className="p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                  DESCARGA FÍLMICA
                </span>
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block mt-0.5">
                  {taskAnalysis.descargaFilmicaCount}
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                  Filmaciones
                </span>
              </div>
            </div>

            {/* 4. PERS. POLICIAL INVOL. (PPI) */}
            <div
              onClick={() => onNavigate?.('ppi')}
              className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs cursor-pointer hover:border-sky-400 dark:hover:border-sky-600 transition-all hover:scale-[1.02]"
              title="Ver Módulo Especial de Causas PPI"
            >
              <div className="h-1.5 bg-sky-500 w-full" />
              <div className="p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                  PERS. POLICIAL INVOL.
                </span>
                <span className="text-2xl font-black text-sky-600 dark:text-sky-400 block mt-0.5">
                  {taskAnalysis.ppiCount}
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                  {taskAnalysis.ppiConOficio} C/Of | {taskAnalysis.ppiSinOficio} S/Of
                </span>
              </div>
            </div>

            {/* 5. FALTA DE OFICIO */}
            <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
              <div className="h-1.5 bg-orange-600 w-full" />
              <div className="p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                  FALTA DE OFICIO
                </span>
                <span className="text-2xl font-black text-orange-600 dark:text-orange-400 block mt-0.5">
                  {taskAnalysis.faltaOficioCount}
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                  Pendientes
                </span>
              </div>
            </div>
          </div>

          {/* Horizontal Progress Bars + Donut Chart Center */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 items-center">
            {/* Left 2 cols: Progress bars */}
            <div className="md:col-span-2 space-y-3">
              {/* Task 1: Escalamiento */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Escalamiento de Datos</span>
                  <span className="font-mono font-bold text-blue-600">{taskAnalysis.escalamientosCount}</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${taskAnalysis.totalActividades > 0 ? (taskAnalysis.escalamientosCount / taskAnalysis.totalActividades) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>

              {/* Task 2: Resguardo de Evidencia */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Resguardo de Evidencia</span>
                  <span className="font-mono font-bold text-teal-600">{taskAnalysis.totalPersonasResguardo}</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${taskAnalysis.totalActividades > 0 ? (taskAnalysis.totalPersonasResguardo / taskAnalysis.totalActividades) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>

              {/* Task 3: Resguardo de Evidencia C/ Escalamiento */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Resguardo de Evidencia C/ Escalamiento</span>
                  <span className="font-mono font-bold text-indigo-600">{taskAnalysis.resguardoConEscalamientoCount}</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${taskAnalysis.totalActividades > 0 ? (taskAnalysis.resguardoConEscalamientoCount / taskAnalysis.totalActividades) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>

              {/* Task 4: Descarga de Filmaciones */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Descarga de Filmaciones</span>
                  <span className="font-mono font-bold text-purple-600">{taskAnalysis.descargaFilmicaCount}</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${taskAnalysis.totalActividades > 0 ? (taskAnalysis.descargaFilmicaCount / taskAnalysis.totalActividades) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>

              {/* Task 5: Otras Tareas */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Otras Tareas Registradas</span>
                  <span className="font-mono font-bold text-amber-600">{taskAnalysis.otrasTareasCount}</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${taskAnalysis.totalActividades > 0 ? (taskAnalysis.otrasTareasCount / taskAnalysis.totalActividades) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right col: Donut Chart with Total Center */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* SVG Donut Circle */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="16" className="text-slate-200 dark:text-slate-700 fill-none" />
                  {(() => {
                    const total = taskAnalysis.totalActividades || 1;
                    const c = 2 * Math.PI * 40; // ~251.32

                    const pEsc = (taskAnalysis.escalamientosCount / total) * c;
                    const pResg = (taskAnalysis.totalPersonasResguardo / total) * c;
                    const pDesc = (taskAnalysis.descargaFilmicaCount / total) * c;

                    return (
                      <>
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#2563EB"
                          strokeWidth="16"
                          strokeDasharray={`${pEsc} ${c - pEsc}`}
                          strokeDashoffset="0"
                          className="fill-none transition-all"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#0D9488"
                          strokeWidth="16"
                          strokeDasharray={`${pResg} ${c - pResg}`}
                          strokeDashoffset={`-${pEsc}`}
                          className="fill-none transition-all"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#9333EA"
                          strokeWidth="16"
                          strokeDasharray={`${pDesc} ${c - pDesc}`}
                          strokeDashoffset={`-${pEsc + pResg}`}
                          className="fill-none transition-all"
                        />
                      </>
                    );
                  })()}
                </svg>

                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {taskAnalysis.totalActividades}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    TOTAL
                  </span>
                </div>
              </div>

              {/* Mini Legend */}
              <div className="mt-3 space-y-1 text-[10px] text-slate-600 dark:text-slate-400 w-full px-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>Escalamiento de Datos</span>
                  </div>
                  <span className="font-mono font-bold">
                    {taskAnalysis.totalActividades > 0
                      ? `${Math.round((taskAnalysis.escalamientosCount / taskAnalysis.totalActividades) * 100)}%`
                      : '0%'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-600" />
                    <span>Resguardo de Evidencia</span>
                  </div>
                  <span className="font-mono font-bold">
                    {taskAnalysis.totalActividades > 0
                      ? `${Math.round((taskAnalysis.totalPersonasResguardo / taskAnalysis.totalActividades) * 100)}%`
                      : '0%'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                    <span>Descarga de Filmaciones</span>
                  </div>
                  <span className="font-mono font-bold">
                    {taskAnalysis.totalActividades > 0
                      ? `${Math.round((taskAnalysis.descargaFilmicaCount / taskAnalysis.totalActividades) * 100)}%`
                      : '0%'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION B. DISTRIBUCIÓN POR DEPENDENCIA O DESTINO (CON GRÁFICO ESTADÍSTICO)
           ========================================================================= */}
        <div className="space-y-4">
          <div className="bg-blue-50/80 dark:bg-blue-950/40 px-3 py-1.5 rounded-lg border-l-4 border-blue-600">
            <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase">
              B. DISTRIBUCIÓN POR DEPENDENCIA O DESTINO (CON GRÁFICO ESTADÍSTICO)
            </h4>
          </div>

          <div>
            <h5 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
              GRÁFICO: DEPENDENCIAS CON MAYOR INTERVENCIÓN
            </h5>
            <div className="space-y-2">
              {dependencyMatrix.slice(0, 4).map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-44 truncate">
                    {d.dependencia}
                  </span>
                  <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden relative">
                    <div
                      className={`h-full rounded-md flex items-center px-2 text-[10px] font-bold text-white transition-all ${
                        i === 0 ? 'bg-blue-600' : i === 1 ? 'bg-teal-600' : 'bg-indigo-600'
                      }`}
                      style={{
                        width: `${Math.max(12, (d.total / (dependencyMatrix[0]?.total || 1)) * 100)}%`
                      }}
                    >
                      {d.total} casos
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-blue-100/60 dark:bg-blue-950/40 text-[10px] font-bold text-blue-900 dark:text-blue-300 uppercase border-b border-blue-200 dark:border-blue-900">
                  <th className="p-2.5">Dependencia / Unidad</th>
                  <th className="p-2.5 text-center">Escalam.</th>
                  <th className="p-2.5 text-center">Resg. Evid.</th>
                  <th className="p-2.5 text-center">Resg. C/Esc</th>
                  <th className="p-2.5 text-center">Desc. Film</th>
                  <th className="p-2.5 text-center">Otras</th>
                  <th className="p-2.5 text-right font-black">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dependencyMatrix.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">{d.dependencia}</td>
                    <td className="p-2.5 text-center font-mono">{d.escalam}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-teal-600">{d.resgEvid}</td>
                    <td className="p-2.5 text-center font-mono">{d.resgCEsc}</td>
                    <td className="p-2.5 text-center font-mono">{d.descFilm}</td>
                    <td className="p-2.5 text-center font-mono">{d.otras}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-blue-700 dark:text-blue-400">{d.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/80 dark:bg-slate-800/80 font-bold text-xs border-t-2 border-slate-300 dark:border-slate-700">
                  <td className="p-2.5 uppercase text-slate-900 dark:text-white">TOTAL ACUMULADO</td>
                  <td className="p-2.5 text-center font-mono">{taskAnalysis.escalamientosCount}</td>
                  <td className="p-2.5 text-center font-mono text-teal-600">{taskAnalysis.totalPersonasResguardo}</td>
                  <td className="p-2.5 text-center font-mono">{taskAnalysis.resguardoConEscalamientoCount}</td>
                  <td className="p-2.5 text-center font-mono">{taskAnalysis.descargaFilmicaCount}</td>
                  <td className="p-2.5 text-center font-mono">{taskAnalysis.otrasTareasCount}</td>
                  <td className="p-2.5 text-right font-mono font-black text-blue-700 dark:text-blue-300">
                    {taskAnalysis.totalActividades}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* =========================================================================
            SECTION C. INFLUENCIA Y ESTADÍSTICA POR JUZGADOS / ÓRGANOS JUDICIALES
           ========================================================================= */}
        <div className="space-y-4">
          <div className="bg-blue-50/80 dark:bg-blue-950/40 px-3 py-1.5 rounded-lg border-l-4 border-blue-600">
            <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase">
              C. INFLUENCIA Y ESTADÍSTICA POR JUZGADOS / ÓRGANOS JUDICIALES (CON GRÁFICO)
            </h4>
          </div>

          <div>
            <h5 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
              GRÁFICO: JUZGADOS CON MAYOR ACTIVIDAD REGISTRADA
            </h5>
            <div className="space-y-2">
              {courtMatrix.slice(0, 4).map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-44 truncate">
                    {c.juzgado}
                  </span>
                  <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden relative">
                    <div
                      className={`h-full rounded-md flex items-center px-2 text-[10px] font-bold text-white transition-all ${
                        i === 0 ? 'bg-indigo-700' : 'bg-blue-600'
                      }`}
                      style={{
                        width: `${Math.max(12, (c.total / (courtMatrix[0]?.total || 1)) * 100)}%`
                      }}
                    >
                      {c.total} req.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Courts Matrix Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-blue-100/60 dark:bg-blue-950/40 text-[10px] font-bold text-blue-900 dark:text-blue-300 uppercase border-b border-blue-200 dark:border-blue-900">
                  <th className="p-2.5">Juzgado / Unidad judicial</th>
                  <th className="p-2.5 text-center">Escalam.</th>
                  <th className="p-2.5 text-center">Resg. Evid.</th>
                  <th className="p-2.5 text-center">Resg. C/Esc</th>
                  <th className="p-2.5 text-center">Desc. Film</th>
                  <th className="p-2.5 text-center">Otras</th>
                  <th className="p-2.5 text-right font-black">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {courtMatrix.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">{c.juzgado}</td>
                    <td className="p-2.5 text-center font-mono">{c.escalam}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-teal-600">{c.resgEvid}</td>
                    <td className="p-2.5 text-center font-mono">{c.resgCEsc}</td>
                    <td className="p-2.5 text-center font-mono">{c.descFilm}</td>
                    <td className="p-2.5 text-center font-mono">{c.otras}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-blue-700 dark:text-blue-400">{c.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/80 dark:bg-slate-800/80 font-bold text-xs border-t-2 border-slate-300 dark:border-slate-700">
                  <td className="p-2.5 uppercase text-slate-900 dark:text-white">TOTAL ACUMULADO</td>
                  <td className="p-2.5 text-center font-mono">{taskAnalysis.escalamientosCount}</td>
                  <td className="p-2.5 text-center font-mono text-teal-600">{taskAnalysis.totalPersonasResguardo}</td>
                  <td className="p-2.5 text-center font-mono">{taskAnalysis.resguardoConEscalamientoCount}</td>
                  <td className="p-2.5 text-center font-mono">{taskAnalysis.descargaFilmicaCount}</td>
                  <td className="p-2.5 text-center font-mono">{taskAnalysis.otrasTareasCount}</td>
                  <td className="p-2.5 text-right font-mono font-black text-blue-700 dark:text-blue-300">
                    {taskAnalysis.totalActividades}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* =========================================================================
            SECTION D. DISCRIMINADO POR TIPO DE REQUERIMIENTO (CON OFICIO VS FALTA OFICIO)
           ========================================================================= */}
        <div className="space-y-4">
          <div className="bg-blue-50/80 dark:bg-blue-950/40 px-3 py-1.5 rounded-lg border-l-4 border-blue-600">
            <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase">
              D. DISCRIMINADO POR TIPO DE REQUERIMIENTO (CON OFICIO VS. FALTA OFICIO - CON GRÁFICOS)
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Donut of Con Oficio vs Falta Oficio */}
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#E2E8F0" strokeWidth="16" className="fill-none" />
                  {(() => {
                    const total = filteredExpedientes.length || 1;
                    const c = 2 * Math.PI * 40;
                    const pCon = (taskAnalysis.conOficioCount / total) * c;
                    return (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#16A34A"
                        strokeWidth="16"
                        strokeDasharray={`${pCon} ${c - pCon}`}
                        className="fill-none"
                      />
                    );
                  })()}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono font-black text-lg text-slate-800 dark:text-white">
                  {filteredExpedientes.length}
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-emerald-600" />
                  <span className="font-bold text-emerald-800 dark:text-emerald-400">
                    CON OFICIO: {taskAnalysis.conOficioCount} ({filteredExpedientes.length > 0 ? Math.round((taskAnalysis.conOficioCount / filteredExpedientes.length) * 100) : 0}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-orange-600" />
                  <span className="font-bold text-orange-700 dark:text-orange-400">
                    FALTA DE OFICIO: {taskAnalysis.faltaOficioCount} ({filteredExpedientes.length > 0 ? Math.round((taskAnalysis.faltaOficioCount / filteredExpedientes.length) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="md:col-span-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold text-slate-600 uppercase border-b">
                    <th className="p-2">Tipo de Requerimiento</th>
                    <th className="p-2 text-center text-emerald-700">Con Oficio</th>
                    <th className="p-2 text-center text-orange-700">Falta Oficio</th>
                    <th className="p-2 text-center font-bold">Total Casos</th>
                    <th className="p-2 text-center text-blue-700">Entregados</th>
                    <th className="p-2">Gráfico Comparativo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {reqComparison.map((r, i) => (
                    <tr key={i}>
                      <td className="p-2 text-slate-800 dark:text-slate-200">{r.req}</td>
                      <td className="p-2 text-center font-mono text-emerald-700 font-bold">{r.conOficio}</td>
                      <td className="p-2 text-center font-mono text-orange-700 font-bold">{r.faltaOficio}</td>
                      <td className="p-2 text-center font-mono font-bold">{r.totalCasos}</td>
                      <td className="p-2 text-center font-mono text-blue-700">{r.entregados}</td>
                      <td className="p-2 w-32">
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-emerald-600"
                            style={{
                              width: `${(r.conOficio / (r.totalCasos || 1)) * 100}%`
                            }}
                          />
                          <div
                            className="h-full bg-orange-500"
                            style={{
                              width: `${(r.faltaOficio / (r.totalCasos || 1)) * 100}%`
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t">
                    <td className="p-2 uppercase">TOTAL CONSOLIDADO</td>
                    <td className="p-2 text-center font-mono text-emerald-700">{taskAnalysis.conOficioCount}</td>
                    <td className="p-2 text-center font-mono text-orange-700">{taskAnalysis.faltaOficioCount}</td>
                    <td className="p-2 text-center font-mono">{filteredExpedientes.length}</td>
                    <td className="p-2 text-center font-mono text-blue-700">
                      {reqComparison.reduce((acc, curr) => acc + curr.entregados, 0)}
                    </td>
                    <td className="p-2">
                      <div className="h-2 w-full bg-emerald-600 rounded-full" />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION F. ESTADÍSTICA DE CHARLAS OPERATIVAS REALIZADAS
           ========================================================================= */}
        <div className="space-y-3">
          <div className="bg-blue-50/80 dark:bg-blue-950/40 px-3 py-1.5 rounded-lg border-l-4 border-blue-600">
            <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase">
              F. ESTADÍSTICA DE CHARLAS OPERATIVAS REALIZADAS (TOTAL: {filteredCharlas.length} CHARLAS)
            </h4>
          </div>

          {filteredCharlas.length === 0 ? (
            <p className="text-xs text-slate-500 italic pl-3">
              No se registran charlas en el período para ninguna localidad.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
              {filteredCharlas.map((ch) => (
                <div
                  key={ch.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200">{ch.temaTratado}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Fecha: {ch.fecha} • Lugar: {ch.lugarInstitucion} ({ch.localidad})
                  </div>
                  <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1">
                    Asistentes: {ch.cantidadAsistentes} personas • Disertante: {ch.personalDesignado}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION G. APARTADO: CAUSAS CON PERSONAL POLICIAL INVOLUCRADO (PPI)
           ========================================================================= */}
        <div className="space-y-3">
          <div className="bg-sky-50 dark:bg-sky-950/40 px-3 py-1.5 rounded-lg border-l-4 border-sky-500">
            <h4 className="text-xs font-bold text-sky-900 dark:text-sky-200 uppercase">
              G. APARTADO: CAUSAS CON PERSONAL POLICIAL INVOLUCRADO (TOTAL: {taskAnalysis.ppiCount} CASOS)
            </h4>
          </div>

          <div className="text-xs font-mono font-bold text-sky-700 dark:text-sky-400 pl-3">
            RESUMEN PPI: {taskAnalysis.ppiCount} causas identificadas | Con Oficio: {taskAnalysis.ppiConOficio} | Falta Oficio: {taskAnalysis.ppiSinOficio}
          </div>

          {taskAnalysis.ppiCount === 0 ? (
            <p className="text-xs text-slate-500 italic pl-3">
              No se registran causas con personal policial involucrado en el período seleccionado.
            </p>
          ) : (
            <div className="space-y-2 pl-1">
              {filteredExpedientes
                .filter((e) => e.customFieldsJson?.includes('"isPPI":true'))
                .map((exp) => {
                  let c: any = {};
                  try {
                    c = exp.customFieldsJson ? JSON.parse(exp.customFieldsJson) : {};
                  } catch {
                    // ignore
                  }
                  return (
                    <div
                      key={exp.id}
                      onClick={() => onNavigate?.('ppi')}
                      className="p-3 bg-sky-50/50 dark:bg-sky-950/20 rounded-xl border border-sky-200 dark:border-sky-900/60 text-xs flex justify-between items-center cursor-pointer hover:bg-sky-100/60 dark:hover:bg-sky-900/30 transition-colors"
                      title="Haga clic para ver en el Módulo Especial PPI"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold font-mono text-sky-800 dark:text-sky-300">
                            Expte N° {exp.nroExpediente}/{exp.anio}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            • Efectivo: {c.ppiJerarquia || ''} {c.ppiApellidoNombre || 'Sin Asignar'} (Plaza: {c.ppiPlaza || 'S/P'})
                          </span>
                        </div>
                        <span className="text-slate-700 dark:text-slate-300 block mt-0.5">
                          {exp.caratula}
                        </span>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Juzgado: {exp.juzgado} • Instr: {exp.personalAsignado || 'S/D'} • Requerimiento: {exp.tipoRequerimiento}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200 whitespace-nowrap ml-2">
                        {exp.estado}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* PDF Document Preview Modal */}
      {pdfPreviewBlob && (
        <PdfPreviewModal
          isOpen={true}
          pdfBlob={pdfPreviewBlob.blob}
          title={pdfPreviewBlob.title}
          filename={pdfPreviewBlob.filename}
          paperSize={dashboardPdfFormat.paperSize}
          orientation={dashboardPdfFormat.orientation}
          onChangeFormat={handleChangeDashboardPdfFormat}
          onClose={() => setPdfPreviewBlob(null)}
        />
      )}
    </div>
  );
};
