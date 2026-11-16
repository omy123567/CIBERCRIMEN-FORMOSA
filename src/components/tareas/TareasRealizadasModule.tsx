import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  FileText,
  BookOpen,
  Filter,
  Search,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  User,
  Building,
  CheckCircle2,
  ExternalLink,
  Eye,
  Layers,
  Sparkles,
  Printer,
  X,
  Shield,
  FileSpreadsheet,
  GripVertical,
  SlidersHorizontal,
  CheckSquare,
  Square
} from 'lucide-react';
import {
  Expediente,
  Personal,
  Charla,
  InstitutionalConfig,
  SisPolUser,
  DynamicCatalog
} from '../../types/sgp';
import {
  generateTareasRealizadasReportDoc,
  exportTareasRealizadasReportPDF,
  TareasReportItem,
  TareasReportStats
} from '../../utils/sgpPdfGenerator';
import { PdfPreviewModal } from '../common/PdfPreviewModal';
import { usePermissions } from '../../context/PermissionsContext';

export interface OperationalTask {
  id: string;
  categoria: 'Tipo de Requerimiento' | 'Charlas';
  categoriaKey: 'requerimiento' | 'charlas';
  fecha: string;
  timestamp: number;
  tipoRequerimientoOTema: string;
  titulo: string;
  descripcion: string;
  referencia: string;
  personalResponsable: string;
  destinoOrganismo: string;
  magnitud?: string;
  estadoBadge: string;
  color: string;
  rawItem: any;
}

interface TareasRealizadasModuleProps {
  expedientes: Expediente[];
  charlas: Charla[];
  personalList?: Personal[];
  catalogs?: DynamicCatalog[];
  institutionalConfig: InstitutionalConfig;
  currentUser: SisPolUser;
  onNavigate: (module: string) => void;
  // Fallbacks to avoid breaking App.tsx if passed
  recargos?: any[];
  moviles?: any[];
  reparaciones?: any[];
  folios?: any[];
}

type PeriodFilter = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL' | 'CUSTOM';
type CategoryFilter = 'ALL' | 'requerimiento' | 'charlas';
type SortOrder = 'DATE_DESC' | 'DATE_ASC' | 'REQ_TYPE' | 'PERSONAL';

// Helper to parse dates (DD/MM/AAAA or YYYY-MM-DD) into timestamp
function parseDateToTimestamp(dateStr?: string): number {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  const clean = dateStr.trim();
  
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }
  }

  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }
  }

  const d = new Date(clean);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

export const TareasRealizadasModule: React.FC<TareasRealizadasModuleProps> = ({
  expedientes = [],
  charlas = [],
  personalList = [],
  catalogs = [],
  institutionalConfig,
  currentUser,
  onNavigate
}) => {
  const perms = usePermissions();
  // Filters State
  const [period, setPeriod] = useState<PeriodFilter>('YEAR');
  const [customDesde, setCustomDesde] = useState<string>('');
  const [customHasta, setCustomHasta] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [selectedReqType, setSelectedReqType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DATE_DESC');

  // Reorderable KPI Cards State
  const [kpiCardOrder, setKpiCardOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sispol_tareas_kpi_order');
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        return parsed.map((k) => (k === 'asistentes' ? 'localidades' : k));
      }
    } catch {}
    return ['total', 'requerimientos', 'concluidos', 'charlas', 'localidades'];
  });
  const [draggedKpi, setDraggedKpi] = useState<string | null>(null);
  const [dragOverKpi, setDragOverKpi] = useState<string | null>(null);

  const handleKpiDragStart = (e: React.DragEvent, id: string) => {
    setDraggedKpi(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleKpiDragOver = (e: React.DragEvent, id: string) => {
    if (!draggedKpi || draggedKpi === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverKpi(id);
  };

  const handleKpiDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedKpi || draggedKpi === targetId) {
      setDraggedKpi(null);
      setDragOverKpi(null);
      return;
    }
    const current = [...kpiCardOrder];
    const srcIdx = current.indexOf(draggedKpi);
    const tgtIdx = current.indexOf(targetId);
    if (srcIdx !== -1 && tgtIdx !== -1) {
      const [removed] = current.splice(srcIdx, 1);
      current.splice(tgtIdx, 0, removed);
      setKpiCardOrder(current);
      localStorage.setItem('sispol_tareas_kpi_order', JSON.stringify(current));
    }
    setDraggedKpi(null);
    setDragOverKpi(null);
  };

  const handleKpiDragEnd = () => {
    setDraggedKpi(null);
    setDragOverKpi(null);
  };

  // Customizable Columns for Reports & Table
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    fecha: true,
    categoria: true,
    tipo: true,
    titulo: true,
    descripcion: true,
    personal: true,
    organismo: true,
    magnitud: true
  });

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllColumns = (val: boolean) => {
    setVisibleColumns({
      fecha: val,
      categoria: val,
      tipo: val,
      titulo: val,
      descripcion: val,
      personal: val,
      organismo: val,
      magnitud: val
    });
  };

  // Detail Modal State
  const [selectedTask, setSelectedTask] = useState<OperationalTask | null>(null);

  // PDF Preview State
  const [pdfPreviewBlob, setPdfPreviewBlob] = useState<{
    blob: Blob;
    title: string;
    filename: string;
  } | null>(null);

  // Build the list containing ONLY "Tipo de Requerimiento" and "Charlas"
  const allTasks = useMemo<OperationalTask[]>(() => {
    const list: OperationalTask[] = [];

    // 1. Tareas del campo "Tipo de Requerimiento" (de Expedientes)
    expedientes.forEach((exp) => {
      const reqType = (exp.tipoRequerimiento || '').trim();
      if (!reqType) return; // Only items with Tipo de Requerimiento

      let custom: any = {};
      try {
        custom = exp.customFieldsJson ? JSON.parse(exp.customFieldsJson) : {};
      } catch {
        custom = {};
      }

      const taskDate = exp.fechaElevacion || exp.fechaIngreso || '01/01/2026';
      const taskTimestamp = parseDateToTimestamp(taskDate);

      list.push({
        id: `exp-${exp.id || exp.nroExpediente}`,
        categoria: 'Tipo de Requerimiento',
        categoriaKey: 'requerimiento',
        fecha: taskDate,
        timestamp: taskTimestamp,
        tipoRequerimientoOTema: reqType,
        titulo: exp.caratula || `Expediente N° ${exp.nroExpediente}`,
        descripcion: custom.resumenTareaRealizada || exp.tipoRequerimientoDetalle || exp.observaciones || `Diligenciamiento de requerimiento: ${reqType}`,
        referencia: `Exp. N° ${exp.nroExpediente || exp.id}/${exp.anio || '26'}`,
        personalResponsable: exp.personalAsignado || custom.personalACargo || 'Gabinete Pericial Informático',
        destinoOrganismo: exp.dependenciaSolicitante || exp.juzgado || exp.dependencia || 'Poder Judicial',
        magnitud: exp.estado === 'Elevado' ? `Elevado (Nota ${exp.nroNotaElevacion || '-'})` : exp.estado,
        estadoBadge: exp.estado,
        color: 'text-blue-600 bg-blue-500/10 border-blue-500/30',
        rawItem: exp
      });
    });

    // 2. Charlas de Prevención
    charlas.forEach((cha) => {
      const taskDate = cha.fecha || '01/01/2026';
      const taskTimestamp = parseDateToTimestamp(taskDate);

      list.push({
        id: `cha-${cha.id || Math.random()}`,
        categoria: 'Charlas',
        categoriaKey: 'charlas',
        fecha: taskDate,
        timestamp: taskTimestamp,
        tipoRequerimientoOTema: cha.temaTratado || 'Charla Preventiva',
        titulo: `Jornada: ${cha.temaTratado || 'Ciberseguridad y Prevención'}`,
        descripcion: cha.observaciones || `Jornada preventiva dictada en ${cha.lugarInstitucion || 'establecimiento'} (${cha.localidad || 'Formosa'}).`,
        referencia: `${cha.lugarInstitucion || 'Institución'} (${cha.localidad || 'Formosa'})`,
        personalResponsable: cha.personalDesignado || 'Equipo de Concientización',
        destinoOrganismo: `${cha.lugarInstitucion || 'Comunidad'} (${cha.localidad || 'Formosa'})`,
        magnitud: cha.hora ? `${cha.hora} hs` : 'Programada',
        estadoBadge: 'Programada',
        color: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/30',
        rawItem: cha
      });
    });

    return list;
  }, [expedientes, charlas]);

  // Extract unique requirement types for filter
  const uniqueReqTypes = useMemo(() => {
    const set = new Set<string>();
    expedientes.forEach((e) => {
      if (e.tipoRequerimiento && e.tipoRequerimiento.trim()) {
        set.add(e.tipoRequerimiento.trim());
      }
    });
    return Array.from(set).sort();
  }, [expedientes]);

  // Date filtering logic
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

  const customDesdeTs = customDesde ? new Date(customDesde).getTime() : 0;
  const customHastaTs = customHasta ? new Date(customHasta).getTime() + 86400000 : Infinity;

  // Filtered and Sorted Tasks
  const filteredTasks = useMemo(() => {
    return allTasks
      .filter((task) => {
        // Category filter
        if (categoryFilter !== 'ALL' && task.categoriaKey !== categoryFilter) {
          return false;
        }

        // Specific requirement type filter
        if (selectedReqType !== 'ALL') {
          if (task.categoriaKey === 'requerimiento' && task.tipoRequerimientoOTema !== selectedReqType) {
            return false;
          }
        }

        // Period filter
        if (period === 'TODAY' && task.timestamp < startOfToday) return false;
        if (period === 'WEEK' && task.timestamp < startOfWeek) return false;
        if (period === 'MONTH' && task.timestamp < startOfMonth) return false;
        if (period === 'YEAR' && task.timestamp < startOfYear) return false;
        if (period === 'CUSTOM') {
          if (task.timestamp < customDesdeTs || task.timestamp > customHastaTs) return false;
        }

        // Search term filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matchTitle = task.titulo.toLowerCase().includes(q);
          const matchDesc = task.descripcion.toLowerCase().includes(q);
          const matchRef = task.referencia.toLowerCase().includes(q);
          const matchPers = task.personalResponsable.toLowerCase().includes(q);
          const matchDest = task.destinoOrganismo.toLowerCase().includes(q);
          const matchReq = task.tipoRequerimientoOTema.toLowerCase().includes(q);
          return matchTitle || matchDesc || matchRef || matchPers || matchDest || matchReq;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'DATE_DESC') return b.timestamp - a.timestamp;
        if (sortOrder === 'DATE_ASC') return a.timestamp - b.timestamp;
        if (sortOrder === 'REQ_TYPE') return a.tipoRequerimientoOTema.localeCompare(b.tipoRequerimientoOTema);
        if (sortOrder === 'PERSONAL') return a.personalResponsable.localeCompare(b.personalResponsable);
        return 0;
      });
  }, [allTasks, categoryFilter, selectedReqType, period, customDesdeTs, customHastaTs, searchTerm, sortOrder, startOfToday, startOfWeek, startOfMonth, startOfYear]);

  // Aggregate Metrics & Quantities
  const stats = useMemo(() => {
    let reqCount = 0;
    let reqElevados = 0;
    let chaCount = 0;
    const chaLocalidades = new Set<string>();

    filteredTasks.forEach((t) => {
      if (t.categoriaKey === 'requerimiento') {
        reqCount++;
        const exp = t.rawItem as Expediente;
        if (exp.estado === 'Elevado' || exp.estado === 'Diligenciado') {
          reqElevados++;
        }
      }
      if (t.categoriaKey === 'charlas') {
        chaCount++;
        const cha = t.rawItem as Charla;
        if (cha.localidad) chaLocalidades.add(cha.localidad.trim());
      }
    });

    return {
      total: filteredTasks.length,
      requerimientos: reqCount,
      requerimientosElevados: reqElevados,
      charlas: chaCount,
      localidadesCharlas: chaLocalidades.size
    };
  }, [filteredTasks]);

  // Monthly breakdown for chronological chart
  const monthlyData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const reqCounts = new Array(12).fill(0);
    const chaCounts = new Array(12).fill(0);

    filteredTasks.forEach((t) => {
      if (t.timestamp > 0) {
        const d = new Date(t.timestamp);
        const m = d.getMonth();
        if (m >= 0 && m < 12) {
          if (t.categoriaKey === 'requerimiento') reqCounts[m]++;
          if (t.categoriaKey === 'charlas') chaCounts[m]++;
        }
      }
    });

    const max = Math.max(...reqCounts.map((v, i) => v + chaCounts[i]), 1);
    return months.map((name, i) => ({
      name,
      reqCount: reqCounts[i],
      chaCount: chaCounts[i],
      totalCount: reqCounts[i] + chaCounts[i],
      heightPercent: ((reqCounts[i] + chaCounts[i]) / max) * 100
    }));
  }, [filteredTasks]);

  // Breakdown by Tipo de Requerimiento for progress chart
  const reqDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTasks.forEach((t) => {
      if (t.categoriaKey === 'requerimiento') {
        const r = t.tipoRequerimientoOTema;
        map[r] = (map[r] || 0) + 1;
      }
    });

    const totalReq = Math.max(stats.requerimientos, 1);
    return Object.entries(map)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalReq) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredTasks, stats.requerimientos]);

  // Top Officers Leaderboard
  const topPersonnel = useMemo(() => {
    const counts: Record<string, { name: string; reqs: number; charlas: number; total: number }> = {};

    filteredTasks.forEach((t) => {
      const name = t.personalResponsable.trim();
      if (!name || name === 'Gabinete Pericial Informático' || name === 'Equipo de Concientización') return;
      if (!counts[name]) {
        counts[name] = { name, reqs: 0, charlas: 0, total: 0 };
      }
      if (t.categoriaKey === 'requerimiento') counts[name].reqs++;
      if (t.categoriaKey === 'charlas') counts[name].charlas++;
      counts[name].total++;
    });

    return Object.values(counts)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredTasks]);

  // Generate PDF Report Preview
  const handleGeneratePdf = () => {
    if (!perms.canExport) return;
    const reportItems: TareasReportItem[] = filteredTasks.map((t) => ({
      fecha: t.fecha,
      submodulo: t.categoria === 'Tipo de Requerimiento' ? `Requerimiento: ${t.tipoRequerimientoOTema}` : 'Charlas y Prevención',
      referencia: t.referencia,
      titulo: t.titulo,
      descripcion: t.descripcion,
      personalResponsable: t.personalResponsable,
      destinoOrganismo: t.destinoOrganismo,
      magnitud: t.magnitud
    }));

    const periodLabel = period === 'TODAY'
      ? 'Día de la Fecha'
      : period === 'WEEK'
      ? 'Semana en Curso'
      : period === 'MONTH'
      ? 'Mes en Curso'
      : period === 'YEAR'
      ? 'Año 2026'
      : period === 'CUSTOM'
      ? `Desde ${customDesde || 'Inicio'} hasta ${customHasta || 'Fin'}`
      : 'Historial Completo';

    const pdfStats: Partial<TareasReportStats> = {
      total: stats.total,
      peritajes: stats.requerimientos,
      ppi: 0,
      recargos: 0,
      charlas: stats.charlas,
      moviles: 0,
      folios: 0,
      totalHorasRecargo: 0,
      totalAsistentes: 0,
      totalCostoReparaciones: 0
    };

    const doc = generateTareasRealizadasReportDoc(
      institutionalConfig,
      reportItems,
      pdfStats,
      periodLabel,
      { orientation: 'landscape', paperSize: 'a4', visibleColumns }
    );

    const blob = doc.output('blob');
    setPdfPreviewBlob({
      blob,
      title: `Informe Oficial de Tareas Realizadas - ${periodLabel}`,
      filename: `SGP_Tareas_Realizadas_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
    });
  };

  // Export to Excel / CSV
  const handleExportCSV = () => {
    if (!perms.canExport) return;
    const headers = [
      'Fecha',
      'Categoría',
      'Tipo de Requerimiento / Tema',
      'Causa / Carátula / Institución',
      'Descripción / Tarea Realizada',
      'Personal Policial Responsable',
      'Juzgado / Dependencia / Destino',
      'Estado / Horario'
    ];

    const rows = filteredTasks.map((t) => [
      t.fecha,
      `"${t.categoria}"`,
      `"${t.tipoRequerimientoOTema.replace(/"/g, '""')}"`,
      `"${t.titulo.replace(/"/g, '""')}"`,
      `"${t.descripcion.replace(/"/g, '""')}"`,
      `"${t.personalResponsable.replace(/"/g, '""')}"`,
      `"${t.destinoOrganismo.replace(/"/g, '""')}"`,
      `"${(t.magnitud || t.estadoBadge).replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SGP_Tareas_Realizadas_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner & Module Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase">
              POLICÍA DE FORMOSA • D.G.P.C.
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              Auditoría de Requerimientos y Charlas
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <span>Registro de Tareas Realizadas</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl mt-1">
            Consolidación y auditoría de tareas cumplidas según el campo <strong>Tipo de Requerimiento</strong> (Peritajes informáticos, extracciones forenses, descargas fílmicas, etc.) y <strong>Charlas de Prevención</strong> comunitarias.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsColumnModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
            title="Seleccionar datos y columnas visibles en reportes y grilla"
          >
            <SlidersHorizontal className="w-4 h-4 text-blue-500" />
            <span>Datos a Mostrar ({Object.values(visibleColumns).filter(Boolean).length}/8)</span>
          </button>

          {perms.canExport && (
            <>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors shadow-xs"
                title="Exportar planilla de tareas a Excel / CSV con formato UTF-8"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Exportar Excel / CSV</span>
              </button>

              <button
                onClick={handleGeneratePdf}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-all active:scale-95"
                title="Generar informe oficial policial con gráficos y cuadro de firmas"
              >
                <Printer className="w-4 h-4 text-blue-200" />
                <span>Reporte PDF con Gráficos</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards: Reorderable by Drag and Drop */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {kpiCardOrder.map((key) => {
          const isDragging = draggedKpi === key;
          const isOver = dragOverKpi === key;

          const renderContent = () => {
            switch (key) {
              case 'total':
                return (
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Total Tareas Realizadas</span>
                        <div className="flex items-center gap-1">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 opacity-50 group-hover:opacity-100 cursor-grab" />
                          <ClipboardCheck className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {stats.total}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium truncate">Requerimientos + Charlas</p>
                  </div>
                );
              case 'requerimientos':
                return (
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Tipos de Requerimiento</span>
                        <div className="flex items-center gap-1">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 opacity-50 group-hover:opacity-100 cursor-grab" />
                          <FileText className="w-4 h-4 text-blue-500" />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                        {stats.requerimientos}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium truncate">Causas periciales registradas</p>
                  </div>
                );
              case 'concluidos':
                return (
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Requerimientos Concluidos</span>
                        <div className="flex items-center gap-1">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 opacity-50 group-hover:opacity-100 cursor-grab" />
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {stats.requerimientosElevados}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium truncate">Diligenciados o Elevados</p>
                  </div>
                );
              case 'charlas':
                return (
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Charlas Realizadas</span>
                        <div className="flex items-center gap-1">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 opacity-50 group-hover:opacity-100 cursor-grab" />
                          <BookOpen className="w-4 h-4 text-indigo-500" />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                        {stats.charlas}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium truncate">Jornadas comunitarias</p>
                  </div>
                );
              case 'localidades':
              case 'asistentes':
                return (
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Localidades en Charlas</span>
                        <div className="flex items-center gap-1">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 opacity-50 group-hover:opacity-100 cursor-grab" />
                          <User className="w-4 h-4 text-purple-500" />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                        {stats.localidadesCharlas}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium truncate">Jurisdicciones alcanzadas</p>
                  </div>
                );
              default:
                return null;
            }
          };

          return (
            <div
              key={key}
              draggable={true}
              onDragStart={(e) => handleKpiDragStart(e, key)}
              onDragOver={(e) => handleKpiDragOver(e, key)}
              onDrop={(e) => handleKpiDrop(e, key)}
              onDragEnd={handleKpiDragEnd}
              className={`group cursor-grab active:cursor-grabbing select-none transition-all ${
                isDragging ? 'opacity-40 scale-95' : 'opacity-100'
              } ${isOver ? 'ring-2 ring-blue-500 rounded-2xl' : ''}`}
            >
              {renderContent()}
            </div>
          );
        })}
      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cuadro 1: Evolución Cronológica (SVG Bar Chart) */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/10 text-blue-600 rounded-lg">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Evolución de Tareas Realizadas (Requerimientos vs Charlas)
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total: {stats.total} tareas
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
            {monthlyData.map((m, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group h-full justify-end">
                <span className="text-[10px] font-mono font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {m.totalCount}
                </span>
                
                {/* Stacked bar: Blue (Requerimientos) + Indigo (Charlas) */}
                <div
                  className="w-full max-w-[28px] rounded-t-lg overflow-hidden flex flex-col-reverse justify-start transition-all duration-300"
                  style={{ height: `${Math.max(m.heightPercent, 4)}%` }}
                  title={`${m.name}: ${m.reqCount} requerimientos periciales, ${m.chaCount} charlas`}
                >
                  <div
                    className="w-full bg-blue-600 group-hover:bg-blue-500"
                    style={{ height: `${m.totalCount > 0 ? (m.reqCount / m.totalCount) * 100 : 100}%` }}
                  />
                  <div
                    className="w-full bg-indigo-500 group-hover:bg-indigo-400"
                    style={{ height: `${m.totalCount > 0 ? (m.chaCount / m.totalCount) * 100 : 0}%` }}
                  />
                </div>

                <span className="text-[10px] font-bold text-slate-500 pt-1">
                  {m.name}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                Tipo de Requerimiento ({stats.requerimientos})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                Charlas de Prevención ({stats.charlas})
              </span>
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Promedio: {Math.round(stats.total / 12)} tareas/mes
            </span>
          </div>
        </div>

        {/* Cuadro 2: Distribución por Tipo de Requerimiento */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-indigo-500/10 text-indigo-600 rounded-lg">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Desglose de Requerimientos Periciales
              </h3>
            </div>
            
            <p className="text-xs text-slate-500 mb-3">
              Distribución de causas por Tipo de Requerimiento:
            </p>

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {reqDistribution.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Sin requerimientos registrados
                </div>
              ) : (
                reqDistribution.map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[170px]" title={item.name}>
                        {item.name}
                      </span>
                      <span className="font-mono text-slate-500 text-[11px] shrink-0">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Officer preview */}
          {topPersonnel.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Efectivo Más Activo:
              </span>
              <div className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                    {topPersonnel[0].name}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {topPersonnel[0].total} tareas
                </span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Filter and Search Control Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        
        {/* Row 1: Periods & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Period Selector Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs font-bold text-slate-500 mr-1 shrink-0 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              Período:
            </span>
            {[
              { id: 'YEAR', label: 'Año 2026' },
              { id: 'MONTH', label: 'Este Mes' },
              { id: 'WEEK', label: 'Esta Semana' },
              { id: 'TODAY', label: 'Hoy' },
              { id: 'ALL', label: 'Todo el Historial' },
              { id: 'CUSTOM', label: 'Personalizado' }
            ].map((p) => {
              const isActive = period === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id as PeriodFilter)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Search input and Sort selector */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar requerimiento, causa, efectivo..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold"
            >
              <option value="DATE_DESC">Fecha: Más reciente</option>
              <option value="DATE_ASC">Fecha: Más antigua</option>
              <option value="REQ_TYPE">Tipo / Requerimiento A-Z</option>
              <option value="PERSONAL">Efectivo A-Z</option>
            </select>
          </div>

        </div>

        {/* Custom date range picker if CUSTOM is selected */}
        {period === 'CUSTOM' && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs animate-in fade-in">
            <span className="font-bold text-slate-600 dark:text-slate-300">Rango de Fechas:</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Desde:</span>
              <input
                type="date"
                value={customDesde}
                onChange={(e) => setCustomDesde(e.target.value)}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Hasta:</span>
              <input
                type="date"
                value={customHasta}
                onChange={(e) => setCustomHasta(e.target.value)}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
              />
            </div>
          </div>
        )}

        {/* Row 2: Category Filter (Requerimientos vs Charlas) & Specific Req Select */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-500" />
              Filtrar por:
            </span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  categoryFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Todas las Tareas ({allTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('requerimiento')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  categoryFilter === 'requerimiento'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Tipo de Requerimiento ({stats.requerimientos})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('charlas')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  categoryFilter === 'charlas'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Charlas ({stats.charlas})
              </button>
            </div>
          </div>

          {/* Specific Tipo de Requerimiento Dropdown */}
          {uniqueReqTypes.length > 0 && categoryFilter !== 'charlas' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold">Tipo específico:</span>
              <select
                value={selectedReqType}
                onChange={(e) => setSelectedReqType(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="ALL">Todos los Requerimientos</option>
                {uniqueReqTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

        </div>

      </div>

      {/* Main Table: TABLA DE TAREAS REALIZADAS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Tabla Oficial de Tareas Realizadas (Requerimientos y Charlas)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filteredTasks.length} registradas
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Haga clic en cualquier fila para ver la ficha detallada
          </span>
        </div>

        <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 z-10">
              <tr>
                {visibleColumns.fecha !== false && <th className="p-3.5 text-center w-24">Fecha</th>}
                {visibleColumns.categoria !== false && <th className="p-3.5">Categoría</th>}
                {visibleColumns.tipo !== false && <th className="p-3.5">Tipo de Requerimiento / Tema</th>}
                {visibleColumns.titulo !== false && <th className="p-3.5">Causa / Carátula / Institución</th>}
                {visibleColumns.personal !== false && <th className="p-3.5">Efectivo Responsable</th>}
                {visibleColumns.organismo !== false && <th className="p-3.5">Destino / Juzgado / Localidad</th>}
                {visibleColumns.magnitud !== false && <th className="p-3.5 text-center">Magnitud / Estado</th>}
                <th className="p-3.5 text-right w-16">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-sm text-slate-600 dark:text-slate-400">
                      No se encontraron tareas registradas bajo los filtros seleccionados.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Intente ampliar el período o seleccionar "Todas las Tareas".
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  >
                    {visibleColumns.fecha !== false && (
                      <td className="p-3.5 text-center whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {t.fecha}
                      </td>
                    )}

                    {visibleColumns.categoria !== false && (
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          t.categoriaKey === 'requerimiento'
                            ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800'
                            : 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800'
                        }`}>
                          {t.categoria}
                        </span>
                      </td>
                    )}

                    {visibleColumns.tipo !== false && (
                      <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {t.tipoRequerimientoOTema}
                      </td>
                    )}

                    {visibleColumns.titulo !== false && (
                      <td className="p-3.5 max-w-sm">
                        <div className="font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {t.titulo}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {t.descripcion}
                        </div>
                      </td>
                    )}

                    {visibleColumns.personal !== false && (
                      <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200 max-w-[150px] truncate" title={t.personalResponsable}>
                        {t.personalResponsable}
                      </td>
                    )}

                    {visibleColumns.organismo !== false && (
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 max-w-[140px] truncate" title={t.destinoOrganismo}>
                        {t.destinoOrganismo}
                      </td>
                    )}

                    {visibleColumns.magnitud !== false && (
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {t.magnitud || t.estadoBadge}
                        </span>
                      </td>
                    )}

                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(t);
                        }}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                        title="Ver Ficha Completa de la Tarea"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            Mostrando <strong>{filteredTasks.length}</strong> tareas realizadas ({stats.requerimientos} requerimientos periciales y {stats.charlas} charlas).
          </span>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-blue-600 hover:underline font-semibold"
          >
            Volver al inicio ↑
          </button>
        </div>

      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-6 animate-in fade-in">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/10 text-blue-600 rounded-xl">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Ficha Oficial de Tarea Realizada
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registro de auditoría operativa policial
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  selectedTask.categoriaKey === 'requerimiento'
                    ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800'
                    : 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800'
                }`}>
                  {selectedTask.categoria}: {selectedTask.tipoRequerimientoOTema}
                </span>
                <span className="font-mono text-xs text-slate-500 font-bold">
                  {selectedTask.fecha}
                </span>
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                {selectedTask.titulo}
              </h4>
              <div className="flex items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400 font-bold">
                <span>Ref: {selectedTask.referencia}</span>
                {selectedTask.magnitud && (
                  <span>• {selectedTask.magnitud}</span>
                )}
              </div>
            </div>

            {/* Description and Metadata */}
            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-500 uppercase block text-[10px] mb-1">
                  Descripción de la Tarea / Objeto Cumplido:
                </span>
                <div className="p-3 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedTask.descripcion}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="font-bold text-slate-500 uppercase block text-[10px]">Efectivo Responsable:</span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                    <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{selectedTask.personalResponsable}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="font-bold text-slate-500 uppercase block text-[10px]">Destino / Órgano Solicitante:</span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                    <Building className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{selectedTask.destinoOrganismo}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Quick Navigation Link */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const targetMod = selectedTask.categoriaKey === 'requerimiento' ? 'expedientes' : 'charlas';
                  setSelectedTask(null);
                  onNavigate(targetMod);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl transition-colors border border-blue-200 dark:border-blue-900"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ir al Módulo de Origen ({selectedTask.categoriaKey === 'requerimiento' ? 'Expedientes' : 'Charlas'})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl"
              >
                Cerrar Ficha
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PDF Document Preview Modal */}
      {pdfPreviewBlob && (
        <PdfPreviewModal
          isOpen={true}
          pdfBlob={pdfPreviewBlob.blob}
          title={pdfPreviewBlob.title}
          filename={pdfPreviewBlob.filename}
          paperSize="a4"
          orientation="landscape"
          onClose={() => setPdfPreviewBlob(null)}
        />
      )}

      {/* Column Selector Modal for Report & Table */}
      {isColumnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Datos a Mostrar en Reporte y Tabla
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Seleccione qué campos desea incluir en la grilla y el reporte PDF
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsColumnModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick check/uncheck all */}
            <div className="flex items-center justify-between text-xs font-semibold px-1">
              <span className="text-slate-500">Columnas disponibles:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAllColumns(true)}
                  className="text-blue-600 hover:underline text-[11px]"
                >
                  Marcar Todas
                </button>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  onClick={() => setAllColumns(false)}
                  className="text-slate-500 hover:underline text-[11px]"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { key: 'fecha', label: 'Fecha de Cumplimiento' },
                { key: 'categoria', label: 'Categoría (Requerim. / Charlas)' },
                { key: 'tipo', label: 'Tipo Requerimiento / Tema' },
                { key: 'titulo', label: 'Causa / Carátula / Institución' },
                { key: 'personal', label: 'Efectivo Responsable' },
                { key: 'organismo', label: 'Destino / Juzgado / Localidad' },
                { key: 'magnitud', label: 'Estado / Horario' }
              ].map((col) => {
                const isChecked = visibleColumns[col.key] !== false;
                return (
                  <div
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className={`p-3 rounded-xl border cursor-pointer select-none transition-all flex items-center justify-between text-xs ${
                      isChecked
                        ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-400'
                    }`}
                  >
                    <span>{col.label}</span>
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsColumnModalOpen(false)}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all"
              >
                Aplicar Selección
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
