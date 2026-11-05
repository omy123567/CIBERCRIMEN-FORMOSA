import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Plus,
  Download,
  Printer,
  FileText,
  User,
  Scale,
  Building,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  Edit,
  BadgeAlert,
  IdCard,
  ShieldCheck,
  ChevronRight,
  X,
  FileCheck,
  Calendar
} from 'lucide-react';
import {
  Expediente,
  Personal,
  DynamicCatalog,
  InstitutionalConfig,
  ExpedienteCustomFields
} from '../../types/sgp';
import { ExpedienteFormModal } from '../expedientes/ExpedienteFormModal';
import { AttachmentZoomModal } from '../common/AttachmentZoomModal';
import { PdfPreviewModal } from '../common/PdfPreviewModal';
import { drawSgpHeader, drawSgpSignatureBlock } from '../../utils/sgpPdfGenerator';
import { db, sgpManager } from '../../db/dexieDb';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PpiModuleProps {
  expedientes: Expediente[];
  personalList: Personal[];
  catalogs: DynamicCatalog[];
  institutionalConfig: InstitutionalConfig;
  delegacionId?: number;
  onNavigate?: (module: string) => void;
  onRefresh: () => void;
  onOpenExpediente?: (exp: Expediente) => void;
}

export const PpiModule: React.FC<PpiModuleProps> = ({
  expedientes,
  personalList,
  catalogs,
  institutionalConfig,
  delegacionId,
  onNavigate,
  onRefresh,
  onOpenExpediente
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJerarquia, setFilterJerarquia] = useState('');
  const [filterJuzgado, setFilterJuzgado] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterOficio, setFilterOficio] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (filterJerarquia) count++;
    if (filterJuzgado) count++;
    if (filterEstado) count++;
    if (filterOficio) count++;
    return count;
  }, [searchTerm, filterJerarquia, filterJuzgado, filterEstado, filterOficio]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterJerarquia('');
    setFilterJuzgado('');
    setFilterEstado('');
    setFilterOficio('');
  };

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpediente, setEditingExpediente] = useState<Expediente | null>(null);
  const [viewingDetailCase, setViewingDetailCase] = useState<Expediente | null>(null);
  const [zoomImage, setZoomImage] = useState<{ src: string; title: string } | null>(null);
  const [previewPdf, setPreviewPdf] = useState<{ blob: Blob; title: string; filename: string } | null>(null);

  const jerarquias = catalogs.filter((c) => c.category === 'Jerarquias').map((c) => c.value);
  const juzgados = Array.from(new Set(expedientes.map((e) => e.juzgado).filter(Boolean)));

  // Extract all PPI Expedientes
  const ppiExpedientes = useMemo(() => {
    return expedientes.filter((e) => {
      try {
        const custom: ExpedienteCustomFields = e.customFieldsJson ? JSON.parse(e.customFieldsJson) : {};
        return !!custom.isPPI;
      } catch {
        return false;
      }
    });
  }, [expedientes]);

  // Filtered List
  const filteredList = useMemo(() => {
    return ppiExpedientes.filter((e) => {
      let custom: ExpedienteCustomFields = {};
      try {
        custom = e.customFieldsJson ? JSON.parse(e.customFieldsJson) : {};
      } catch {
        // ignore
      }

      if (filterJerarquia && custom.ppiJerarquia !== filterJerarquia) return false;
      if (filterJuzgado && e.juzgado !== filterJuzgado) return false;
      if (filterEstado && e.estado !== filterEstado) return false;

      if (filterOficio === 'CON_OFICIO' && custom.isFaltaOficio) return false;
      if (filterOficio === 'SIN_OFICIO' && !custom.isFaltaOficio) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const expMatch = `${e.nroExpediente}/${e.anio}`.toLowerCase().includes(q);
        const nameMatch = (custom.ppiApellidoNombre || '').toLowerCase().includes(q);
        const plazaMatch = (custom.ppiPlaza || '').toLowerCase().includes(q);
        const dniMatch = (custom.ppiDni || '').includes(q);
        const jerMatch = (custom.ppiJerarquia || '').toLowerCase().includes(q);
        const juzMatch = (e.juzgado || '').toLowerCase().includes(q);
        const carMatch = (e.caratula || '').toLowerCase().includes(q);
        const detMatch = (custom.ppiDetalles || '').toLowerCase().includes(q);

        return expMatch || nameMatch || plazaMatch || dniMatch || jerMatch || juzMatch || carMatch || detMatch;
      }

      return true;
    });
  }, [ppiExpedientes, filterJerarquia, filterJuzgado, filterEstado, filterOficio, searchTerm]);

  // Metrics
  const metrics = useMemo(() => {
    const total = ppiExpedientes.length;
    let conOficio = 0;
    let sinOficio = 0;
    let enTramite = 0;
    let elevados = 0;
    const uniqueOfficers = new Set<string>();

    ppiExpedientes.forEach((e) => {
      let c: ExpedienteCustomFields = {};
      try {
        c = e.customFieldsJson ? JSON.parse(e.customFieldsJson) : {};
      } catch {
        // ignore
      }
      if (c.isFaltaOficio) sinOficio++;
      else conOficio++;

      if (e.estado === 'Elevado' || c.condicionElevacion === 'Entregado') elevados++;
      else enTramite++;

      const officerKey = c.ppiPlaza || c.ppiDni || c.ppiApellidoNombre;
      if (officerKey) uniqueOfficers.add(officerKey);
    });

    return {
      total,
      conOficio,
      sinOficio,
      enTramite,
      elevados,
      totalOfficers: uniqueOfficers.size
    };
  }, [ppiExpedientes]);

  // Open modal for new PPI case
  const handleOpenNewPpiCase = () => {
    const defaultPpiData: Partial<Expediente> = {
      nroExpediente: '',
      anio: new Date().getFullYear().toString(),
      tipoOficio: 'Oficio Judicial',
      tipoRequerimiento: 'Resguardo de Evidencia Digital',
      delegacionId: delegacionId || 1,
      customFieldsJson: JSON.stringify({
        isPPI: true,
        ppiJerarquia: jerarquias[0] || 'Sargento',
        ppiPlaza: '',
        ppiApellidoNombre: '',
        ppiDni: '',
        condicionElevacion: 'No entregado'
      })
    };
    setEditingExpediente(defaultPpiData as Expediente);
    setIsFormOpen(true);
  };

  // Export PDF Report with Centered Letterhead and Preview Modal
  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    const todayStr = new Date().toLocaleDateString('es-AR');

    // Official Centered Formosa Police Letterhead with dual logos
    const startY = drawSgpHeader(
      doc,
      institutionalConfig,
      'REGISTRO OFICIAL DE CAUSAS CON PERSONAL POLICIAL INVOLUCRADO (PPI)',
      `Fecha de emisión: ${todayStr} | Total registros: ${filteredList.length} | Estado: Clasificado Institucional`
    );

    // Table
    const tableData = filteredList.map((exp) => {
      let c: ExpedienteCustomFields = {};
      try {
        c = exp.customFieldsJson ? JSON.parse(exp.customFieldsJson) : {};
      } catch {
        // ignore
      }

      const officer = `${c.ppiJerarquia || 'S/D'} ${c.ppiApellidoNombre || 'Sin Asignar'}\nPlaza: ${c.ppiPlaza || 'S/P'}${c.ppiDni ? ` | DNI: ${c.ppiDni}` : ''}`;
      const caseNumber = c.isFaltaOficio ? `FO-${exp.nroExpediente}` : `N° ${exp.nroExpediente}/${exp.anio}`;
      const oficioInfo = `${c.oficioOrigen || exp.tipoOficio}${c.letrasOficio ? ` (${c.letrasOficio})` : ''}`;
      const elevation = c.condicionElevacion === 'Entregado' ? `Elevado: ${exp.fechaElevacion || 'Sí'}` : 'No entregado';

      return [
        caseNumber,
        oficioInfo,
        officer,
        exp.juzgado || 'S/D',
        exp.tipoRequerimiento || 'Peritaje',
        exp.caratula || exp.observaciones || '-',
        exp.estado,
        elevation
      ];
    });

    autoTable(doc, {
      startY,
      head: [
        [
          'Expediente',
          'Oficio Judicial',
          'Personal Policial Involucrado',
          'Juzgado Interviniente',
          'Requerimiento',
          'Carátula / Motivo',
          'Estado',
          'Condición'
        ]
      ],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [3, 105, 161], // Sky 700 / Celeste Policial
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59]
      },
      styles: {
        cellPadding: 2.5,
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: 'bold' },
        1: { cellWidth: 28 },
        2: { cellWidth: 50, fontStyle: 'bold' },
        3: { cellWidth: 38 },
        4: { cellWidth: 30 },
        5: { cellWidth: 50 },
        6: { cellWidth: 22 },
        7: { cellWidth: 24 }
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          // Soft sky-50 background for PPI rows
          data.cell.styles.fillColor = [240, 249, 255];
        }
      }
    });

    drawSgpSignatureBlock(doc, institutionalConfig, (doc as any).lastAutoTable.finalY);
    
    // Open preview before download
    const blob = doc.output('blob');
    setPreviewPdf({
      blob,
      title: 'Registro Oficial de Causas PPI (Personal Policial Involucrado)',
      filename: `SGP_Registro_PPI_${todayStr.replace(/\//g, '-')}.pdf`
    });
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Expediente',
      'Año',
      'Tipo Oficio',
      'Oficio Origen',
      'Jerarquía PPI',
      'Plaza PPI',
      'Apellido y Nombre PPI',
      'DNI PPI',
      'Detalles PPI',
      'Juzgado',
      'Dependencia Solicitante',
      'Tipo Requerimiento',
      'Estado',
      'Fecha Ingreso',
      'Condición Elevación'
    ];

    const rows = filteredList.map((exp) => {
      let c: ExpedienteCustomFields = {};
      try {
        c = exp.customFieldsJson ? JSON.parse(exp.customFieldsJson) : {};
      } catch {
        // ignore
      }

      return [
        `"${exp.nroExpediente}"`,
        `"${exp.anio}"`,
        `"${exp.tipoOficio}"`,
        `"${c.oficioOrigen || ''}"`,
        `"${c.ppiJerarquia || ''}"`,
        `"${c.ppiPlaza || ''}"`,
        `"${c.ppiApellidoNombre || ''}"`,
        `"${c.ppiDni || ''}"`,
        `"${(c.ppiDetalles || '').replace(/"/g, '""')}"`,
        `"${exp.juzgado || ''}"`,
        `"${c.dependenciaSolicitante || exp.dependencia || ''}"`,
        `"${exp.tipoRequerimiento || ''}"`,
        `"${exp.estado}"`,
        `"${exp.fechaIngreso || ''}"`,
        `"${c.condicionElevacion || ''}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SGP_Causas_PPI_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Submodule Parent Navigation Breadcrumb */}
      {onNavigate && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-2xl text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-sky-800 dark:text-sky-300">Módulo Padre:</span>
            <button
              onClick={() => onNavigate('expedientes')}
              className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              ← Volver a Expedientes & Evidencias
            </button>
            <span className="text-slate-400">/</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
              Submódulo: Causas PPI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('personas')}
              className="text-xs font-semibold px-3 py-1.5 bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 hover:bg-sky-100/50 rounded-xl border border-sky-200 dark:border-sky-800 transition-colors"
            >
              Ver Submódulo: Personas en Evidencias →
            </button>
          </div>
        </div>
      )}

      {/* Institutional Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-sky-900 via-slate-900 to-slate-950 p-6 rounded-3xl text-white shadow-lg border border-sky-800/40">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-sky-600/30 ring-2 ring-sky-500/50 rounded-2xl">
            <ShieldAlert className="w-8 h-8 text-sky-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-wider uppercase text-sky-300 font-bold bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-800">
                Módulo Especial de Seguridad
              </span>
              <span className="text-xs text-slate-400">
                {institutionalConfig.division}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              Causas con Personal Policial Involucrado (PPI)
            </h1>
            <p className="text-xs text-sky-200/80 mt-1 max-w-2xl leading-relaxed">
              Registro clasificado y seguimiento procesal de causas penales, administrativas y requerimientos periciales que involucran a efectivos policiales.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-800 rounded-xl transition-all shadow-xs"
            title="Exportar reporte oficial en PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Reporte PDF</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all shadow-xs"
            title="Exportar archivo CSV / Excel"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Planilla CSV</span>
          </button>

          <button
            onClick={handleOpenNewPpiCase}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva Causa PPI</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total PPI */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">TOTAL CAUSAS PPI</span>
            <ShieldAlert className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-700 dark:text-sky-400 mt-1">
            {metrics.total}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            {metrics.conOficio} C/Oficio • {metrics.sinOficio} S/Oficio
          </span>
        </div>

        {/* Efectivos Involucrados */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">EFECTIVOS REGISTRADOS</span>
            <User className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {metrics.totalOfficers}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Identificados con Plaza/DNI
          </span>
        </div>

        {/* En Trámite */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">EN TRÁMITE / LABORES</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {metrics.enTramite}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Actuaciones en curso
          </span>
        </div>

        {/* Elevadas a Sede Judicial */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">ELEVADAS / ENTREGADAS</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.elevados}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Con recibo de elevación
          </span>
        </div>

        {/* Porcentaje de Diligenciamiento */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">TASA DILIGENCIAMIENTO</span>
            <Scale className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {metrics.total > 0 ? `${Math.round((metrics.elevados / metrics.total) * 100)}%` : '0%'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Conclusión pericial
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                showFilters
                  ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[10px] flex items-center justify-center font-black">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Mostrando <strong className="text-slate-900 dark:text-white">{filteredList.length}</strong> de <strong className="text-slate-900 dark:text-white">{ppiExpedientes.length}</strong> causas PPI
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Fichas
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Tabla
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {/* Search Query */}
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por efectivo (Apellido, Plaza, DNI), Expediente N°, juzgado..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Filter Jerarquía */}
              <div>
                <select
                  value={filterJerarquia}
                  onChange={(e) => setFilterJerarquia(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
                >
                  <option value="">Todas las Jerarquías</option>
                  {jerarquias.map((j, idx) => (
                    <option key={idx} value={j}>{j}</option>
                  ))}
                </select>
              </div>

              {/* Filter Juzgado */}
              <div>
                <select
                  value={filterJuzgado}
                  onChange={(e) => setFilterJuzgado(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
                >
                  <option value="">Todos los Juzgados</option>
                  {juzgados.map((j, idx) => (
                    <option key={idx} value={j}>{j}</option>
                  ))}
                </select>
              </div>

              {/* Filter Oficio Status */}
              <div>
                <select
                  value={filterOficio}
                  onChange={(e) => setFilterOficio(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
                >
                  <option value="">Con y Sin Oficio</option>
                  <option value="CON_OFICIO">Solo Con Oficio Formal</option>
                  <option value="SIN_OFICIO">Solo Falta de Oficio (Preliminar)</option>
                </select>
              </div>
            </div>

            {/* View mode toggle and status chips */}
            <div className="flex items-center gap-1.5 pt-1 text-xs">
              <span className="text-slate-400 font-semibold mr-1">Estado:</span>
              {['', 'Iniciado', 'En Trámite', 'Diligenciado', 'Elevado'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterEstado(st)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                    filterEstado === st
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {st === '' ? 'Todos' : st}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Cards or Table View */}
      {filteredList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 bg-sky-50 dark:bg-sky-950/50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No se registran causas PPI con los filtros aplicados
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Para registrar una nueva causa con efectivo policial involucrado, presione el botón "+ Nueva Causa PPI" arriba o marque la casilla correspondiente al cargar un expediente.
          </p>
          <button
            onClick={handleOpenNewPpiCase}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Primera Causa PPI</span>
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* ================= CARDS VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((exp) => {
            let custom: ExpedienteCustomFields = {};
            try {
              custom = exp.customFieldsJson ? JSON.parse(exp.customFieldsJson) : {};
            } catch {
              // ignore
            }

            const isDelivered = custom.condicionElevacion === 'Entregado' || exp.estado === 'Elevado';

            return (
              <div
                key={exp.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* Header Strip */}
                <div className="p-4 bg-gradient-to-r from-sky-50 to-slate-50 dark:from-sky-950/40 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 rounded-xl ring-1 ring-sky-300 dark:ring-sky-700">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm font-mono text-sky-900 dark:text-sky-300">
                            {custom.isFaltaOficio ? `FO-${exp.nroExpediente}` : `Expte. N° ${exp.nroExpediente}/${exp.anio}`}
                          </span>
                          {custom.isFaltaOficio && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded border border-amber-300">
                              Sin Oficio
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          Oficio: {custom.oficioOrigen || exp.tipoOficio} {custom.letrasOficio ? `(${custom.letrasOficio})` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        exp.estado === 'Elevado'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : exp.estado === 'Diligenciado'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {exp.estado}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 space-y-3.5 flex-1 text-xs">
                  {/* Officer Info Card */}
                  <div className="p-3 bg-sky-50/70 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-900/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-900 dark:text-sky-300 flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        Efectivo Policial Involucrado
                      </span>
                      <span className="font-mono text-xs font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-700 text-sky-800 dark:text-sky-300">
                        Plaza: {custom.ppiPlaza || 'S/P'}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {custom.ppiJerarquia} {custom.ppiApellidoNombre || 'Sin nombre registrado'}
                      </span>
                      {custom.ppiDni && (
                        <span className="text-[11px] font-mono text-slate-500">
                          (DNI: {custom.ppiDni})
                        </span>
                      )}
                    </div>

                    {custom.ppiDetalles && (
                      <p className="text-[11px] text-sky-950 dark:text-sky-200 italic bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-sky-100 dark:border-sky-900/40">
                        {custom.ppiDetalles}
                      </p>
                    )}
                  </div>

                  {/* Case Details */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Scale className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Juzgado:</span>
                      <span className="truncate">{exp.juzgado}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Building className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Dependencia:</span>
                      <span className="truncate">{custom.dependenciaSolicitante || exp.dependencia}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <FileCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Labor Requerida:</span>
                      <span className="font-bold text-teal-700 dark:text-teal-400">{exp.tipoRequerimiento}</span>
                    </div>

                    {exp.caratula && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800 line-clamp-2">
                        {exp.caratula}
                      </div>
                    )}
                  </div>

                  {/* Elevación / Entrega status */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ingreso: <strong>{exp.fechaIngreso}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isDelivered ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Elevado ({exp.fechaElevacion || 'Formal'})
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          No entregado aún
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {custom.imagenOficioUri && (
                      <button
                        onClick={() => setZoomImage({ src: custom.imagenOficioUri!, title: `Oficio Causa PPI - Expte N° ${exp.nroExpediente}` })}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg"
                        title="Ver Oficio Adjunto"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingDetailCase(exp)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      Ver Detalle
                    </button>

                    <button
                      onClick={() => {
                        setEditingExpediente(exp);
                        setIsFormOpen(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-all"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= TABLE VIEW ================= */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-sky-900/10 dark:bg-sky-950/40 text-sky-900 dark:text-sky-300 font-bold border-b border-sky-200 dark:border-sky-900 uppercase text-[10px]">
                  <th className="py-3 px-4">Expediente</th>
                  <th className="py-3 px-4">Efectivo PPI Involucrado</th>
                  <th className="py-3 px-4">Plaza Policial</th>
                  <th className="py-3 px-4">Juzgado Solicitante</th>
                  <th className="py-3 px-4">Labor Pericial</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Elevación</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredList.map((exp) => {
                  let custom: ExpedienteCustomFields = {};
                  try {
                    custom = exp.customFieldsJson ? JSON.parse(exp.customFieldsJson) : {};
                  } catch {
                    // ignore
                  }

                  const isDelivered = custom.condicionElevacion === 'Entregado' || exp.estado === 'Elevado';

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-sky-900 dark:text-sky-300 whitespace-nowrap">
                        {custom.isFaltaOficio ? `FO-${exp.nroExpediente}` : `N° ${exp.nroExpediente}/${exp.anio}`}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {custom.oficioOrigen || exp.tipoOficio}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {custom.ppiJerarquia} {custom.ppiApellidoNombre || 'Sin asignar'}
                        </div>
                        {custom.ppiDni && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            DNI: {custom.ppiDni}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                        {custom.ppiPlaza || 'S/P'}
                      </td>

                      <td className="py-3 px-4 max-w-xs truncate text-slate-700 dark:text-slate-300">
                        {exp.juzgado}
                      </td>

                      <td className="py-3 px-4 font-semibold text-teal-700 dark:text-teal-400">
                        {exp.tipoRequerimiento}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          exp.estado === 'Elevado'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : exp.estado === 'Diligenciado'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {exp.estado}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {isDelivered ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {exp.fechaElevacion || 'Elevado'}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 text-[11px]">
                            No entregado
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingDetailCase(exp)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950"
                            title="Ver Ficha Detallada"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingExpediente(exp);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950"
                            title="Editar Causa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal for PPI Case */}
      {viewingDetailCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Ficha Oficial de Causa PPI: Expte N° {viewingDetailCase.nroExpediente}/{viewingDetailCase.anio}
                </h3>
              </div>
              <button
                onClick={() => setViewingDetailCase(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              let c: ExpedienteCustomFields = {};
              try {
                c = viewingDetailCase.customFieldsJson ? JSON.parse(viewingDetailCase.customFieldsJson) : {};
              } catch {
                // ignore
              }

              return (
                <div className="space-y-4 text-xs">
                  {/* Officer Box */}
                  <div className="p-4 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-sky-900 dark:text-sky-300">
                      Datos del Personal Policial Involucrado
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-semibold">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Jerarquía:</span>
                        <span className="text-slate-800 dark:text-slate-200">{c.ppiJerarquia || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Plaza / Legajo:</span>
                        <span className="font-mono text-sky-700 dark:text-sky-400 font-bold">{c.ppiPlaza || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Apellido y Nombre:</span>
                        <span className="text-slate-800 dark:text-slate-200">{c.ppiApellidoNombre || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">DNI:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{c.ppiDni || 'S/D'}</span>
                      </div>
                    </div>

                    {c.ppiDetalles && (
                      <div className="mt-2 pt-2 border-t border-sky-200 dark:border-sky-800">
                        <span className="text-slate-400 block text-[10px]">Observaciones del Efectivo / Sumario:</span>
                        <p className="text-slate-800 dark:text-slate-200 italic mt-0.5">{c.ppiDetalles}</p>
                      </div>
                    )}
                  </div>

                  {/* Case Info */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Juzgado:</span>
                      <span className="font-semibold">{viewingDetailCase.juzgado}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Dependencia Solicitante:</span>
                      <span className="font-semibold">{c.dependenciaSolicitante || viewingDetailCase.dependencia}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Tipo Requerimiento:</span>
                      <span className="font-bold text-teal-600">{viewingDetailCase.tipoRequerimiento}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Instructor a Cargo:</span>
                      <span className="font-semibold">{c.personalACargo || viewingDetailCase.personalAsignado}</span>
                    </div>
                  </div>

                  {/* Resumen / Carátula */}
                  <div>
                    <span className="text-slate-400 block text-[10px] mb-1 font-bold">Carátula / Resumen Operativo:</span>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 whitespace-pre-wrap font-mono text-[11px]">
                      {viewingDetailCase.caratula || viewingDetailCase.observaciones}
                    </div>
                  </div>

                  {/* Footer Close */}
                  <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => setViewingDetailCase(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Expediente Form Modal for Creating/Editing */}
      <ExpedienteFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingExpediente(null);
        }}
        onSave={async (savedExp) => {
          const expToSave = {
            ...savedExp,
            delegacionId: savedExp.delegacionId || delegacionId || 1
          };
          if (expToSave.id) {
            await db.expedientes.put(expToSave);
          } else {
            await db.expedientes.add(expToSave);
          }
          sgpManager.notify();
          onRefresh();
          setIsFormOpen(false);
          setEditingExpediente(null);
        }}
        initialData={editingExpediente}
        catalogs={catalogs}
        personalList={personalList}
        delegacionId={delegacionId}
      />

      {/* Attachment Zoom Modal */}
      {zoomImage && (
        <AttachmentZoomModal
          isOpen={true}
          onClose={() => setZoomImage(null)}
          imageSrc={zoomImage.src}
          title={zoomImage.title}
        />
      )}

      {/* PDF Document Preview Modal */}
      {previewPdf && (
        <PdfPreviewModal
          isOpen={true}
          pdfBlob={previewPdf.blob}
          title={previewPdf.title}
          filename={previewPdf.filename}
          onClose={() => setPreviewPdf(null)}
        />
      )}
    </div>
  );
};
