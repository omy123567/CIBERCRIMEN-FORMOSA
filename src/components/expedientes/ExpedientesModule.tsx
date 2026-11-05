import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  Eye,
  Trash2,
  Edit,
  ExternalLink,
  ShieldAlert,
  Merge,
  Inbox,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { Expediente, DynamicCatalog, Personal, InstitutionalConfig, PersonaInvestigada } from '../../types/sgp';
import { ExpedienteFormModal } from './ExpedienteFormModal';
import { RecepcionarOficioModal } from './RecepcionarOficioModal';
import { CombinarExpedientesModal } from './CombinarExpedientesModal';
import { LibroPdfOptionsModal } from './LibroPdfOptionsModal';
import { PdfPreviewModal } from '../common/PdfPreviewModal';
import { AttachmentZoomModal } from '../common/AttachmentZoomModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { exportIndividualJson } from '../../utils/sgpBackupZip';
import { sgpManager } from '../../db/dexieDb';

interface ExpedientesModuleProps {
  expedientes: Expediente[];
  catalogs: DynamicCatalog[];
  personalList: Personal[];
  institutionalConfig: InstitutionalConfig;
  onRefresh: () => void;
  canDelete?: boolean;
  delegacionId?: number;
  onNavigate?: (module: string) => void;
}

export const ExpedientesModule: React.FC<ExpedientesModuleProps> = ({
  expedientes,
  catalogs,
  personalList,
  institutionalConfig,
  onRefresh,
  canDelete = true,
  delegacionId,
  onNavigate
}) => {

  // Navigation tab: 'all' | 'faltaOficio' | 'ppi'
  const [activeTab, setActiveTab] = useState<'all' | 'faltaOficio' | 'ppi'>('all');

  // Search & Filters
  const [showFilters, setShowFilters] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReq, setFilterReq] = useState('');
  const [filterJuzgado, setFilterJuzgado] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterAnio, setFilterAnio] = useState('');
  const [filterIncompletos, setFilterIncompletos] = useState<'ALL' | 'ONLY_INCOMPLETE' | 'ONLY_COMPLETE'>('ALL');
  const [filterPPI, setFilterPPI] = useState<'ALL' | 'ONLY_PPI' | 'NO_PPI'>('ALL');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpediente, setEditingExpediente] = useState<Expediente | null>(null);

  // Libro PDF Options Modal & Document Preview
  const [isLibroModalOpen, setIsLibroModalOpen] = useState(false);
  const [pdfPreviewBlob, setPdfPreviewBlob] = useState<{ blob: Blob; title: string; filename: string } | null>(null);

  // Recepcionar Oficio Modal
  const [receivingExpediente, setReceivingExpediente] = useState<Expediente | null>(null);

  // Combinar Expedientes Modal & selection
  const [isCombineModalOpen, setIsCombineModalOpen] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<number[]>([]);

  // Zoom Attachment Viewer
  const [zoomAttachment, setZoomAttachment] = useState<{ src: string; title: string } | null>(null);

  // Delete dialog
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // Helper to determine if an expediente has missing/incomplete fields
  const checkIsIncomplete = (exp: Expediente): { isIncomplete: boolean; reason: string } => {
    let custom: any = {};
    try {
      custom = exp.customFieldsJson ? JSON.parse(exp.customFieldsJson) : {};
    } catch {
      // ignore
    }

    const isResguardo =
      exp.tipoRequerimiento?.toLowerCase().includes('resguardo') ||
      exp.tipoRequerimiento?.toLowerCase().includes('escalamiento');

    // Rule 1: Resguardos must have evidence persons with both Name and DNI
    if (isResguardo) {
      if (!custom.evidencePersons || custom.evidencePersons.length === 0) {
        return { isIncomplete: true, reason: 'Falta ingresar Personas / DNI investigadas' };
      }
      const missingDni = custom.evidencePersons.some((p: any) => !p.dni || !p.dni.trim());
      const missingName = custom.evidencePersons.some((p: any) => !p.fullName || !p.fullName.trim());
      if (missingDni || missingName) {
        return { isIncomplete: true, reason: 'Persona(s) sin DNI o Nombre completo' };
      }
    }

    // Rule 2: Falta de Oficio must have instructor, solicitante and summary
    if (custom.isFaltaOficio) {
      if (!exp.personalAsignado || !exp.personalAsignado.trim()) {
        return { isIncomplete: true, reason: 'Falta Personal a Cargo de la Instrucción' };
      }
      if (!exp.dependenciaSolicitante || !exp.dependenciaSolicitante.trim()) {
        return { isIncomplete: true, reason: 'Falta Dependencia Solicitante' };
      }
      if (!exp.observaciones || !exp.observaciones.trim()) {
        return { isIncomplete: true, reason: 'Falta Resumen Operativo' };
      }
    }

    // Rule 3: Regular expedientes need Juzgado and Caratula
    if (!custom.isFaltaOficio) {
      if (!exp.juzgado || !exp.juzgado.trim()) {
        return { isIncomplete: true, reason: 'Falta Juzgado solicitante' };
      }
      if (!exp.caratula || !exp.caratula.trim()) {
        return { isIncomplete: true, reason: 'Falta Carátula o Descripción' };
      }
    }

    // Rule 4: Personal Policial Involucrado (PPI) must have Jerarquía, Plaza, and Apellido y Nombre
    if (custom.isPPI) {
      if (!custom.ppiJerarquia || !custom.ppiJerarquia.trim()) {
        return { isIncomplete: true, reason: 'PPI: Falta Jerarquía del efectivo' };
      }
      if (!custom.ppiPlaza || !custom.ppiPlaza.trim()) {
        return { isIncomplete: true, reason: 'PPI: Falta Plaza policial del efectivo' };
      }
      if (!custom.ppiApellidoNombre || !custom.ppiApellidoNombre.trim()) {
        return { isIncomplete: true, reason: 'PPI: Falta Apellido y Nombre del efectivo' };
      }
    }

    return { isIncomplete: false, reason: '' };
  };

  // Count total incomplete records
  const totalIncompletosCount = useMemo(() => {
    return expedientes.filter((e) => checkIsIncomplete(e).isIncomplete).length;
  }, [expedientes]);

  // Count total PPI records
  const totalPpiCount = useMemo(() => {
    return expedientes.filter((e) => {
      try {
        return JSON.parse(e.customFieldsJson).isPPI;
      } catch {
        return false;
      }
    }).length;
  }, [expedientes]);

  // Extract unique filter options
  const requerimientos = useMemo(
    () => Array.from(new Set(expedientes.map((e) => e.tipoRequerimiento).filter(Boolean))),
    [expedientes]
  );
  const juzgados = useMemo(
    () => Array.from(new Set(expedientes.map((e) => e.juzgado).filter(Boolean))),
    [expedientes]
  );
  const aniosDisponibles = useMemo(
    () => Array.from(new Set(expedientes.map((e) => e.anio).filter(Boolean))).sort((a, b) => Number(b) - Number(a)),
    [expedientes]
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (filterReq) count++;
    if (filterJuzgado) count++;
    if (filterEstado) count++;
    if (filterAnio) count++;
    if (filterIncompletos !== 'ALL') count++;
    if (filterPPI !== 'ALL') count++;
    return count;
  }, [searchTerm, filterReq, filterJuzgado, filterEstado, filterAnio, filterIncompletos, filterPPI]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterReq('');
    setFilterJuzgado('');
    setFilterEstado('');
    setFilterAnio('');
    setFilterIncompletos('ALL');
    setFilterPPI('ALL');
  };

  // Filtered lists
  const filteredExpedientes = useMemo(() => {
    return expedientes.filter((e) => {
      let custom: any = {};
      try {
        custom = e.customFieldsJson ? JSON.parse(e.customFieldsJson) : {};
      } catch {
        // ignore
      }

      // Tab constraint
      if (activeTab === 'faltaOficio') {
        if (!custom.isFaltaOficio) return false;
      }
      if (activeTab === 'ppi') {
        if (!custom.isPPI) return false;
      }

      // PPI filter
      if (filterPPI === 'ONLY_PPI' && !custom.isPPI) return false;
      if (filterPPI === 'NO_PPI' && custom.isPPI) return false;

      // Incompleteness filter
      const status = checkIsIncomplete(e);
      if (filterIncompletos === 'ONLY_INCOMPLETE' && !status.isIncomplete) return false;
      if (filterIncompletos === 'ONLY_COMPLETE' && status.isIncomplete) return false;

      // Filter constraints
      if (filterReq && e.tipoRequerimiento !== filterReq) return false;
      if (filterJuzgado && e.juzgado !== filterJuzgado) return false;
      if (filterEstado && e.estado !== filterEstado) return false;
      if (filterAnio && e.anio.toString() !== filterAnio) return false;

      // Text search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const nroMatch = `${e.nroExpediente}/${e.anio}`.toLowerCase().includes(query);
        const caratulaMatch = (e.caratula || '').toLowerCase().includes(query);
        const oficioMatch = (custom.oficioOrigen || e.tipoOficio || '').toLowerCase().includes(query);
        const obsMatch = (e.observaciones || '').toLowerCase().includes(query);
        const personMatch = custom.evidencePersons?.some(
          (p: any) => p.fullName?.toLowerCase().includes(query) || p.dni?.includes(query)
        );
        const ppiMatch =
          custom.isPPI &&
          (custom.ppiApellidoNombre?.toLowerCase().includes(query) ||
           custom.ppiPlaza?.toLowerCase().includes(query) ||
           custom.ppiJerarquia?.toLowerCase().includes(query) ||
           custom.ppiDni?.includes(query));

        return nroMatch || caratulaMatch || oficioMatch || obsMatch || personMatch || ppiMatch;
      }

      return true;
    });
  }, [expedientes, activeTab, filterReq, filterJuzgado, filterEstado, filterAnio, filterIncompletos, filterPPI, searchTerm]);

  // Selected cases for combination
  const selectedCasesForCombine = useMemo(() => {
    return expedientes.filter((e) => e.id && selectedCaseIds.includes(e.id));
  }, [expedientes, selectedCaseIds]);

  // Semaphoric deadline calculation
  const getDeadlineStatus = (fechaVenc?: string, estado?: string) => {
    if (estado === 'Elevado' || estado === 'Diligenciado') {
      return {
        label: estado,
        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200'
      };
    }
    if (!fechaVenc) {
      return {
        label: 'Sin plazo fijo',
        badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200'
      };
    }

    const parts = fechaVenc.split('/');
    if (parts.length !== 3) {
      return {
        label: fechaVenc,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
      };
    }

    const targetDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return {
        label: `Vencido (${Math.abs(diffDays)}d)`,
        badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 font-bold'
      };
    } else if (diffDays <= 5) {
      return {
        label: `Próximo (${diffDays}d)`,
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 font-bold'
      };
    } else {
      return {
        label: `En término (${diffDays}d)`,
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
      };
    }
  };

  // Actions
  const handleSaveExpediente = async (expData: Expediente) => {
    const db = (await import('../../db/dexieDb')).db;
    if (expData.id) {
      await db.expedientes.put(expData);
    } else {
      await db.expedientes.add(expData);
    }
    sgpManager.notify();
    onRefresh();
  };

  const handleDeleteExpediente = async () => {
    if (deleteTargetId) {
      const db = (await import('../../db/dexieDb')).db;
      await db.expedientes.delete(deleteTargetId);
      sgpManager.notify();
      setDeleteTargetId(null);
      onRefresh();
    }
  };

  const handleConfirmCombine = async (
    consolidatedCase: Omit<Expediente, 'id'>,
    sourceCaseIds: number[],
    personsToSave: PersonaInvestigada[]
  ) => {
    const db = (await import('../../db/dexieDb')).db;
    // 1. Add single consolidated record
    await db.expedientes.add(consolidatedCase as Expediente);
    // 2. Remove / depurate merged redundant cases
    for (const id of sourceCaseIds) {
      await db.expedientes.delete(id);
    }
    // 3. Register unified persons in Personas module
    if (personsToSave && personsToSave.length > 0) {
      for (const p of personsToSave) {
        if (p.apellidoNombre || p.dni) {
          await sgpManager.upsertPersona({
            apellidoNombre: p.apellidoNombre,
            dni: p.dni,
            expedientesVinculados: [`${consolidatedCase.nroExpediente}/${consolidatedCase.anio}`]
          });
        }
      }
    }
    sgpManager.notify();
    setSelectedCaseIds([]);
    setIsCombineModalOpen(false);
    onRefresh();
  };

  const toggleSelectCase = (id: number) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedCaseIds.length === filteredExpedientes.length) {
      setSelectedCaseIds([]);
    } else {
      setSelectedCaseIds(filteredExpedientes.map((e) => e.id!).filter(Boolean));
    }
  };

  const handleOpenNewSinOficio = () => {
    setEditingExpediente({
      nroExpediente: 'S/N',
      anio: new Date().getFullYear(),
      tipoOficio: 'Sin Oficio',
      estado: 'Iniciado',
      tipoRequerimiento: 'Resguardo de Evidencia',
      fechaIngreso: new Date().toISOString().slice(0, 10).split('-').reverse().join('/'),
      juzgado: '',
      caratula: '',
      dependenciaSolicitante: '',
      personalAsignado: '',
      observaciones: '',
      customFieldsJson: JSON.stringify({
        isFaltaOficio: true,
        isPPI: false,
        isTareaRealizadaEjecutada: false,
        evidencePersons: []
      })
    } as unknown as Expediente);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Module vs Submodules Navigation Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl border border-slate-700 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
            Módulo Principal
          </span>
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Expedientes & Evidencias</span>
          </span>
        </div>

        {onNavigate && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
              Submódulos dependientes:
            </span>
            <button
              type="button"
              onClick={() => onNavigate('personas')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 bg-slate-800/90 hover:bg-blue-600 hover:text-white border border-slate-700 transition-all shadow-xs"
              title="Abrir submódulo de personas investigadas"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Personas (Evidencias)</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('ppi')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-sky-200 bg-sky-950/60 hover:bg-sky-600 hover:text-white border border-sky-800 transition-all shadow-xs"
              title="Abrir submódulo de causas con personal policial involucrado"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
              <span>Causas PPI (Policial)</span>
            </button>
          </div>
        )}
      </div>

      {/* Module Title & Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <span>Gestión de Expedientes Judiciales y Evidencias</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro con/sin oficio, vinculación a personas investigadas, alertas de incompletitud y unificación pericial.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Combinar Expedientes Registrados Button */}
          <button
            onClick={() => setIsCombineModalOpen(true)}
            disabled={selectedCaseIds.length < 2}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-sm ${
              selectedCaseIds.length >= 2
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
            }`}
            title="Seleccione 2 o más expedientes para combinarlos en un único registro depurando los originales"
          >
            <Merge className="w-4 h-4" />
            <span>Combinar ({selectedCaseIds.length})</span>
          </button>

          {/* Libro PDF con modal de configuración y vista previa */}
          <button
            onClick={() => setIsLibroModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors shadow-xs"
            title="Generar Libro de Registro de Expedientes Oficial (Filtrable por tiempo y N° inicial)"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Libro PDF</span>
          </button>

          <button
            onClick={() => exportIndividualJson('Expedientes', expedientes)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar JSON</span>
          </button>

          {/* Botón directo para causas SIN OFICIO */}
          <button
            onClick={handleOpenNewSinOficio}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-all active:scale-95"
            title="Registrar una nueva actuación operativa urgente sin oficio previo"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>+ Nueva Causa Sin Oficio</span>
          </button>

          {/* Botón clásico Nuevo Expediente con Oficio */}
          <button
            onClick={() => {
              setEditingExpediente(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Expediente</span>
          </button>
        </div>
      </div>

      {/* Tabs & Falta de Oficio Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Todos los Expedientes ({expedientes.length})
          </button>

          <button
            onClick={() => setActiveTab('faltaOficio')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'faltaOficio'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Casos Falta de Oficio</span>
            <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded-full font-mono">
              {expedientes.filter((e) => e.customFieldsJson?.includes('"isFaltaOficio":true')).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ppi')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ppi'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-sky-500" />
            <span>Causas PPI ({totalPpiCount})</span>
          </button>
        </div>

        {/* Incomplete Records Quick Filter Pill */}
        <div className="flex items-center gap-1 pb-2">
          <span className="text-xs text-slate-400 mr-1">Filtro de integridad:</span>
          <button
            onClick={() => setFilterIncompletos('ALL')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
              filterIncompletos === 'ALL'
                ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterIncompletos('ONLY_INCOMPLETE')}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
              filterIncompletos === 'ONLY_INCOMPLETE'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Incompletos ({totalIncompletosCount})</span>
          </button>
          <button
            onClick={() => setFilterIncompletos('ONLY_COMPLETE')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
              filterIncompletos === 'ONLY_COMPLETE'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            Completos
          </button>
        </div>
      </div>

      {/* Filter and Search Bar with Hide/Show toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-mono">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold underline underline-offset-2 ml-1"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="text-slate-400 text-xs">
            Mostrando <strong className="text-slate-700 dark:text-slate-200 font-mono">{filteredExpedientes.length}</strong> de <span className="font-mono">{expedientes.length}</span> expedientes
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-all">
            <div className="relative sm:col-span-4">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por N°, carátula, personas, DNI o juzgado..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={filterReq}
                onChange={(e) => setFilterReq(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
              >
                <option value="">Todos los Requerimientos</option>
                {requerimientos.map((r, idx) => (
                  <option key={idx} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
              >
                <option value="">Todos los Estados</option>
                <option value="Iniciado">Iniciado</option>
                <option value="En Trámite">En Trámite</option>
                <option value="Diligenciado">Diligenciado</option>
                <option value="Elevado">Elevado</option>
                <option value="Archivado">Archivado</option>
              </select>
            </div>

            <div className="sm:col-span-2">
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

            <div className="sm:col-span-1">
              <select
                value={filterAnio}
                onChange={(e) => setFilterAnio(e.target.value)}
                className="w-full px-2 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono"
              >
                <option value="">Año</option>
                {aniosDisponibles.map((a) => (
                  <option key={a} value={a.toString()}>{a}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Expedientes Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredExpedientes.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No se encontraron expedientes
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {filterIncompletos === 'ONLY_INCOMPLETE'
                ? '¡Excelente! No hay expedientes con campos pendientes en este período.'
                : 'Intente ajustar los filtros de búsqueda o registre un nuevo expediente judicial.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredExpedientes.length > 0 &&
                        selectedCaseIds.length === filteredExpedientes.length
                      }
                      onChange={handleSelectAllFiltered}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      title="Seleccionar todos para combinar"
                    />
                  </th>
                  <th className="py-3 px-4">Expediente</th>
                  <th className="py-3 px-4">Ingreso / Carátula</th>
                  <th className="py-3 px-4">Requerimiento & Personas</th>
                  <th className="py-3 px-4">Juzgado Solicitante</th>
                  <th className="py-3 px-4">Semáforo Vencimiento</th>
                  <th className="py-3 px-4">Adjuntos</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredExpedientes.map((exp) => {
                  let custom: any = {};
                  try {
                    custom = exp.customFieldsJson ? JSON.parse(exp.customFieldsJson) : {};
                  } catch {
                    // ignore
                  }

                  const deadline = getDeadlineStatus(exp.fechaVencimiento, exp.estado);
                  const persons = custom.evidencePersons || [];
                  const incompleteStatus = checkIsIncomplete(exp);
                  const isSelected = exp.id ? selectedCaseIds.includes(exp.id) : false;

                  return (
                    <tr
                      key={exp.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40'
                          : custom.isPPI
                          ? 'bg-sky-50/60 dark:bg-sky-950/25 border-l-4 border-l-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                          : incompleteStatus.isIncomplete
                          ? 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Selection checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => exp.id && toggleSelectCase(exp.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {/* Expediente N° & Alertas */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                            {custom.isFaltaOficio ? (
                              <span className="text-amber-600 dark:text-amber-400 font-bold">
                                FO-{exp.nroExpediente}
                              </span>
                            ) : (
                              `N° ${exp.nroExpediente}/${exp.anio}`
                            )}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {custom.oficioOrigen || exp.tipoOficio}
                          </span>

                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {custom.isPPI && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/70 px-1.5 py-0.5 rounded border border-sky-300 dark:border-sky-700"
                                title={`Personal Policial Involucrado: ${custom.ppiJerarquia || ''} ${custom.ppiApellidoNombre || ''} (Plaza: ${custom.ppiPlaza || 'S/P'})`}
                              >
                                <ShieldAlert className="w-3 h-3 text-sky-600" />
                                <span>PPI: {custom.ppiJerarquia ? `${custom.ppiJerarquia} ` : ''}{custom.ppiApellidoNombre || 'Sin asignar'} {custom.ppiPlaza ? `(${custom.ppiPlaza})` : ''}</span>
                              </span>
                            )}

                            {/* Resaltado visual si faltan completar campos */}
                            {incompleteStatus.isIncomplete && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-300"
                                title={incompleteStatus.reason}
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Faltan Campos</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Ingreso / Caratula */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-slate-400 font-mono">
                            Ingreso: {exp.fechaIngreso}
                          </span>
                          <span className="font-medium text-slate-900 dark:text-white line-clamp-2 mt-0.5">
                            {exp.caratula}
                          </span>
                          {exp.personalAsignado && (
                            <span className="text-[11px] text-slate-500">
                              Instr: {exp.personalAsignado}
                            </span>
                          )}
                          {incompleteStatus.isIncomplete && (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                              ⚠️ {incompleteStatus.reason}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Requerimiento & Evidencia (con nómina de personas) */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-blue-700 dark:text-blue-400">
                            {exp.tipoRequerimiento}
                          </span>
                          {persons.length > 0 ? (
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md inline-block">
                                {persons.length} {persons.length === 1 ? 'persona vinculada' : 'personas vinculadas'}
                              </span>
                              <div className="text-[10px] text-slate-500 truncate" title={persons.map((p: any) => `${p.fullName} (${p.dni || 'S/DNI'})`).join(' • ')}>
                                {persons.map((p: any) => p.fullName).join(', ')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Sin personas cargadas
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Juzgado */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        <div className="max-w-xs truncate" title={exp.juzgado}>
                          {exp.juzgado || <span className="text-slate-400 italic">Sin juzgado</span>}
                        </div>
                        {exp.dependenciaSolicitante && (
                          <div className="text-[10px] text-slate-400 truncate">
                            Dep: {exp.dependenciaSolicitante}
                          </div>
                        )}
                      </td>

                      {/* Semáforo Vencimiento */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg border ${deadline.badgeClass}`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{deadline.label}</span>
                        </span>
                      </td>

                      {/* Adjuntos con Zoom Modal */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {custom.imagenOficioUri ? (
                            <button
                              onClick={() =>
                                setZoomAttachment({
                                  src: custom.imagenOficioUri,
                                  title: `Oficio Judicial - Expte N° ${exp.nroExpediente}/${exp.anio}`
                                })
                              }
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg transition-colors"
                              title="Ver Oficio con Zoom"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">-</span>
                          )}

                          {custom.imagenReciboUri && (
                            <button
                              onClick={() =>
                                setZoomAttachment({
                                  src: custom.imagenReciboUri,
                                  title: `Recibo de Elevación - Expte N° ${exp.nroExpediente}/${exp.anio}`
                                })
                              }
                              className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 dark:bg-blue-950/60 rounded-lg transition-colors"
                              title="Ver Recibo de Elevación con Zoom"
                            >
                              <FileCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Recepcionar Oficio Modal button for Falta de Oficio */}
                          {custom.isFaltaOficio && (
                            <button
                              onClick={() => setReceivingExpediente(exp)}
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 rounded-lg transition-colors shadow-xs"
                              title="Marcar Oficio Recepcionado y formalizar causa"
                            >
                              <Inbox className="w-3.5 h-3.5" />
                              <span>Recepcionar</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setEditingExpediente(exp);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Editar Expediente"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {canDelete && (
                            <button
                              onClick={() => exp.id && setDeleteTargetId(exp.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Eliminar Expediente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recepcionar Oficio Modal */}
      {receivingExpediente && (
        <RecepcionarOficioModal
          isOpen={true}
          expediente={receivingExpediente}
          onClose={() => setReceivingExpediente(null)}
          onSuccess={() => {
            setReceivingExpediente(null);
            onRefresh();
          }}
          catalogs={catalogs}
        />
      )}

      {/* Combinar Expedientes Modal */}
      {isCombineModalOpen && (
        <CombinarExpedientesModal
          isOpen={isCombineModalOpen}
          selectedCases={selectedCasesForCombine}
          onClose={() => setIsCombineModalOpen(false)}
          onConfirmCombine={handleConfirmCombine}
          catalogs={catalogs}
          personalList={personalList}
        />
      )}

      {/* Expediente Form Modal */}
      <ExpedienteFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveExpediente}
        initialData={editingExpediente}
        catalogs={catalogs}
        personalList={personalList}
        delegacionId={delegacionId}
      />

      {/* Attachment Zoom Modal */}
      {zoomAttachment && (
        <AttachmentZoomModal
          isOpen={true}
          imageSrc={zoomAttachment.src}
          title={zoomAttachment.title}
          onClose={() => setZoomAttachment(null)}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        title="Eliminar Expediente Judicial"
        message="¿Está seguro que desea eliminar este expediente de la base de datos? Esta acción es irreversible."
        confirmText="Sí, Eliminar"
        danger={true}
        onConfirm={handleDeleteExpediente}
        onClose={() => setDeleteTargetId(null)}
      />

      {/* Libro PDF Options Modal */}
      {isLibroModalOpen && (
        <LibroPdfOptionsModal
          isOpen={isLibroModalOpen}
          expedientes={expedientes}
          config={institutionalConfig}
          onClose={() => setIsLibroModalOpen(false)}
        />
      )}

      {/* PDF Document Preview Modal */}
      {pdfPreviewBlob && (
        <PdfPreviewModal
          isOpen={true}
          pdfBlob={pdfPreviewBlob.blob}
          title={pdfPreviewBlob.title}
          filename={pdfPreviewBlob.filename}
          onClose={() => setPdfPreviewBlob(null)}
        />
      )}
    </div>
  );
};
