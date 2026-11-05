import React, { useState, useMemo } from 'react';
import {
  Car,
  Plus,
  Search,
  Filter,
  Wrench,
  FileDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit,
  Trash2,
  Shield,
  Gauge,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { Movil, Reparacion, DynamicCatalog, InstitutionalConfig, MovilCondicion } from '../../types/sgp';
import { MovilFormModal } from './MovilFormModal';
import { ReparacionesModal } from './ReparacionesModal';
import { MovilPdfModal } from './MovilPdfModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { exportIndividualJson } from '../../utils/sgpBackupZip';
import { sgpManager } from '../../db/dexieDb';

interface MovilesModuleProps {
  moviles: Movil[];
  reparaciones: Reparacion[];
  catalogs: DynamicCatalog[];
  institutionalConfig: InstitutionalConfig;
  delegacionId?: number;
  onNavigate?: (module: string) => void;
  onRefresh: () => void;
}

type ViewMode = 'cards' | 'compact' | 'detailed' | 'byStatus';

export const MovilesModule: React.FC<MovilesModuleProps> = ({
  moviles,
  reparaciones,
  catalogs,
  institutionalConfig,
  delegacionId,
  onNavigate,
  onRefresh
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [showFilters, setShowFilters] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondicion, setFilterCondicion] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterServiceStatus, setFilterServiceStatus] = useState<'TODOS' | 'VENCIDOS' | 'ALERTA' | 'OK'>('TODOS');
  const [sortField, setSortField] = useState<'identificador' | 'kmActual' | 'dominio'>('identificador');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMovil, setEditingMovil] = useState<Movil | null>(null);
  const [selectedForRepairs, setSelectedForRepairs] = useState<Movil | null>(null);
  const [selectedForPdf, setSelectedForPdf] = useState<Movil | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // Lubrication / Service calculation
  const getServiceStatus = (movil: Movil) => {
    const act = parseInt(movil.kmActual, 10) || 0;
    const prox = parseInt(movil.kmProximoService, 10) || 0;
    const ult = parseInt(movil.kmUltimoService, 10) || 0;
    const diff = prox - act;

    const interval = Math.max(1000, prox - ult);
    const progress = Math.min(100, Math.max(0, ((act - ult) / interval) * 100));

    if (diff <= 0) {
      return {
        status: 'danger',
        label: '¡Servis Vencido!',
        diff,
        progress,
        badgeClass: 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 border-rose-300 font-bold'
      };
    } else if (diff <= 500) {
      return {
        status: 'warning',
        label: `Alerta: Faltan ${diff} Km`,
        diff,
        progress,
        badgeClass: 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 border-amber-300 font-bold'
      };
    } else {
      return {
        status: 'ok',
        label: `Al día (${diff} Km restantes)`,
        diff,
        progress,
        badgeClass: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300'
      };
    }
  };

  const tiposMovil = useMemo(() => {
    return catalogs.filter(c => c.category === 'Tipo Movil').map(c => c.value);
  }, [catalogs]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (filterCondicion) count++;
    if (filterTipo) count++;
    if (filterServiceStatus !== 'TODOS') count++;
    return count;
  }, [searchTerm, filterCondicion, filterTipo, filterServiceStatus]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterCondicion('');
    setFilterTipo('');
    setFilterServiceStatus('TODOS');
  };

  // Filtered & Sorted Moviles
  const processedMoviles = useMemo(() => {
    let list = moviles.filter((m) => {
      if (filterCondicion && m.condicion !== filterCondicion) return false;
      if (filterTipo && m.tipo !== filterTipo) return false;
      if (filterServiceStatus !== 'TODOS') {
        const service = getServiceStatus(m);
        if (filterServiceStatus === 'VENCIDOS' && service.status !== 'danger') return false;
        if (filterServiceStatus === 'ALERTA' && service.status !== 'warning') return false;
        if (filterServiceStatus === 'OK' && service.status !== 'ok') return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const idMatch = m.identificador.toLowerCase().includes(q);
        const domMatch = m.dominio.toLowerCase().includes(q);
        const marcaMatch = `${m.marca} ${m.modelo}`.toLowerCase().includes(q);
        return idMatch || domMatch || marcaMatch;
      }
      return true;
    });

    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (sortField === 'kmActual') {
        valA = parseInt(valA, 10) || 0;
        valB = parseInt(valB, 10) || 0;
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [moviles, filterCondicion, filterTipo, filterServiceStatus, searchTerm, sortField, sortAsc]);

  // Actions
  const handleSaveMovil = async (movil: Movil) => {
    const movilToSave: Movil = {
      ...movil,
      delegacionId: movil.delegacionId || delegacionId || 1
    };
    const db = (await import('../../db/dexieDb')).db;
    if (movilToSave.id) {
      await db.moviles.put(movilToSave);
    } else {
      await db.moviles.add(movilToSave);
    }
    sgpManager.notify();
    onRefresh();
  };

  const handleDeleteMovil = async () => {
    if (deleteTargetId) {
      const db = (await import('../../db/dexieDb')).db;
      await db.moviles.delete(deleteTargetId);
      await db.reparaciones.where('movilId').equals(deleteTargetId).delete();
      sgpManager.notify();
      setDeleteTargetId(null);
      onRefresh();
    }
  };

  const handleSaveReparacion = async (rep: Reparacion) => {
    const db = (await import('../../db/dexieDb')).db;
    await db.reparaciones.add(rep);

    // Auto-update vehicle mileage if repair mileage is higher
    if (selectedForRepairs) {
      const currentKm = parseInt(selectedForRepairs.kmActual, 10) || 0;
      const repKm = parseInt(rep.kmMomento, 10) || 0;
      if (repKm > currentKm) {
        selectedForRepairs.kmActual = rep.kmMomento;
        await db.moviles.put(selectedForRepairs);
      }
    }
    sgpManager.notify();
    onRefresh();
  };

  const handleDeleteReparacion = async (id: number) => {
    const db = (await import('../../db/dexieDb')).db;
    await db.reparaciones.delete(id);
    sgpManager.notify();
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Car className="w-6 h-6 text-blue-600" />
            <span>Parque Automotor, Odómetro y Reparaciones</span>
          </h1>
          <p className="text-xs text-slate-500">
            Control de kilometraje, semáforo de lubricación, vencimientos de RTO y seguro oficial
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportIndividualJson('Moviles', moviles)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors shadow-xs"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Exportar JSON</span>
          </button>

          <button
            onClick={() => {
              setEditingMovil(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Móvil</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar with Hide/Show Toggle */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
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

          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-xs">
              Mostrando <strong className="text-slate-700 dark:text-slate-200 font-mono">{processedMoviles.length}</strong> de <span className="font-mono">{moviles.length}</span> móviles
            </span>

            {/* View Switcher: 4 View Modes */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Tarjetas
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === 'compact'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Compacta
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === 'detailed'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Tabla
              </button>
              <button
                onClick={() => setViewMode('byStatus')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === 'byStatus'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Por Estado
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-all">
            <div className="relative sm:col-span-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar móvil, patente, marca o modelo..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <select
                value={filterCondicion}
                onChange={(e) => setFilterCondicion(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-medium"
              >
                <option value="">Todas las Condiciones</option>
                <option value="En Servicio">En Servicio</option>
                <option value="En Reparación">En Reparación</option>
                <option value="Fuera de Servicio">Fuera de Servicio</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
              >
                <option value="">Todos los Tipos</option>
                {tiposMovil.map((t, idx) => (
                  <option key={idx} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <select
                value={filterServiceStatus}
                onChange={(e) => setFilterServiceStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-medium"
              >
                <option value="TODOS">Estado del Service: Todos</option>
                <option value="VENCIDOS">¡Servis Vencido!</option>
                <option value="ALERTA">Alerta de Service (&lt;500km)</option>
                <option value="OK">Service al Día</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-medium"
              >
                <option value="identificador">Ordenar por Móvil</option>
                <option value="kmActual">Ordenar por Kilometraje</option>
                <option value="dominio">Ordenar por Patente</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* RENDER VIEWS */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedMoviles.map((movil) => {
            const service = getServiceStatus(movil);
            const movilRepairs = reparaciones.filter((r) => r.movilId === movil.id);

            return (
              <div
                key={movil.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                        {movil.identificador}
                      </span>
                      <p className="text-xs text-slate-500 font-semibold">
                        {movil.marca} {movil.modelo} • <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{movil.dominio}</span>
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        movil.condicion === 'En Servicio'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : movil.condicion === 'Taller'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {movil.condicion}
                    </span>
                  </div>

                  {/* Odómetro & Service Bar */}
                  <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 flex items-center gap-1 font-semibold">
                        <Gauge className="w-3.5 h-3.5 text-blue-600" /> Odómetro Actual:
                      </span>
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {parseInt(movil.kmActual, 10).toLocaleString('es-AR')} Km
                      </span>
                    </div>

                    {/* Progress Bar Lubricant */}
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          service.status === 'danger'
                            ? 'bg-rose-600'
                            : service.status === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${service.progress}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] pt-1">
                      <span className="text-slate-400 font-mono">Últ: {movil.kmUltimoService} Km</span>
                      <span className={`px-2 py-0.5 rounded font-mono ${service.badgeClass}`}>
                        {service.label}
                      </span>
                    </div>
                  </div>

                  {/* Documentation Expirations */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Vence RTO:</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {movil.vencimientoRto || 'Sin reg.'}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Seguro ({movil.companiaSeguro}):</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {movil.vencimientoSeguro || 'Sin reg.'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedForRepairs(movil)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Historial de reparaciones"
                    >
                      <Wrench className="w-3.5 h-3.5 text-amber-600" />
                      <span>Taller ({movilRepairs.length})</span>
                    </button>

                    <button
                      onClick={() => setSelectedForPdf(movil)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Descargar Ficha Técnica Vehicular en PDF"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Ficha PDF</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingMovil(movil);
                        setIsFormOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => movil.id && setDeleteTargetId(movil.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Compact List View */}
      {viewMode === 'compact' && (
        <div className="space-y-2">
          {processedMoviles.map((movil) => {
            const service = getServiceStatus(movil);
            return (
              <div
                key={movil.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white w-16">
                    {movil.identificador}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 w-24">
                    {movil.dominio}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {movil.marca} {movil.modelo}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono font-bold">{parseInt(movil.kmActual, 10).toLocaleString('es-AR')} Km</span>
                  <span className={`px-2 py-0.5 text-xs rounded font-mono ${service.badgeClass}`}>
                    {service.label}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{movil.condicion}</span>

                  <button
                    onClick={() => setSelectedForPdf(movil)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="PDF"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Detailed Table with sortable columns */}
      {viewMode === 'detailed' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th
                    className="py-3 px-3 cursor-pointer"
                    onClick={() => {
                      setSortField('identificador');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Móvil</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 cursor-pointer"
                    onClick={() => {
                      setSortField('dominio');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Dominio</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Marca y Modelo</th>
                  <th
                    className="py-3 px-3 cursor-pointer"
                    onClick={() => {
                      setSortField('kmActual');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Km Odómetro</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Estado Service</th>
                  <th className="py-3 px-3">Venc. RTO</th>
                  <th className="py-3 px-3">Seguro</th>
                  <th className="py-3 px-3">Condición</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {processedMoviles.map((movil) => {
                  const service = getServiceStatus(movil);
                  return (
                    <tr key={movil.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {movil.identificador}
                      </td>
                      <td className="py-2.5 px-3 font-mono">{movil.dominio}</td>
                      <td className="py-2.5 px-3">{movil.marca} {movil.modelo}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        {parseInt(movil.kmActual, 10).toLocaleString('es-AR')} Km
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${service.badgeClass}`}>
                          {service.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono">{movil.vencimientoRto || '-'}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[11px]">{movil.companiaSeguro} ({movil.vencimientoSeguro || '-'})</span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{movil.condicion}</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedForRepairs(movil)}
                          className="text-amber-600 hover:text-amber-800 font-semibold mr-2"
                        >
                          Taller
                        </button>
                        <button
                          onClick={() => setSelectedForPdf(movil)}
                          className="text-blue-600 hover:text-blue-800 font-semibold mr-2"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => {
                            setEditingMovil(movil);
                            setIsFormOpen(true);
                          }}
                          className="text-slate-500 hover:text-slate-800 mr-2"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => movil.id && setDeleteTargetId(movil.id)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Grouped By Operational Status View */}
      {viewMode === 'byStatus' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['En Servicio', 'Taller', 'Fuera de Servicio', 'En Reserva'] as MovilCondicion[]).map((cond) => {
            const listByCond = processedMoviles.filter((m) => m.condicion === cond);

            return (
              <div
                key={cond}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                    {cond}
                  </h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                    {listByCond.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {listByCond.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1"
                    >
                      <div className="flex justify-between items-center font-bold text-xs">
                        <span className="text-slate-900 dark:text-white font-mono">{m.identificador}</span>
                        <span className="text-blue-600 font-mono">{m.dominio}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{m.marca} {m.modelo}</p>
                      <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                        <span>{parseInt(m.kmActual, 10).toLocaleString('es-AR')} Km</span>
                        <button
                          onClick={() => setSelectedForRepairs(m)}
                          className="text-amber-600 hover:underline font-semibold"
                        >
                          Ver taller
                        </button>
                      </div>
                    </div>
                  ))}
                  {listByCond.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4">
                      Sin móviles en este estado
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL NUEVO / EDITAR MOVIL */}
      <MovilFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingMovil(null);
        }}
        onSave={handleSaveMovil}
        initialData={editingMovil}
        catalogs={catalogs}
        delegacionId={delegacionId}
      />

      {/* MODAL REPARACIONES MECANICAS */}
      {selectedForRepairs && (
        <ReparacionesModal
          isOpen={!!selectedForRepairs}
          onClose={() => setSelectedForRepairs(null)}
          movil={selectedForRepairs}
          reparaciones={reparaciones.filter((r) => r.movilId === selectedForRepairs.id)}
          onSaveReparacion={handleSaveReparacion}
          onDeleteReparacion={handleDeleteReparacion}
        />
      )}

      {/* MODAL PDF CONFIGURABLE DE FICHA TÉCNICA */}
      {selectedForPdf && (
        <MovilPdfModal
          isOpen={!!selectedForPdf}
          onClose={() => setSelectedForPdf(null)}
          movil={selectedForPdf}
          reparaciones={reparaciones.filter((r) => r.movilId === selectedForPdf.id)}
          institutionalConfig={institutionalConfig}
        />
      )}

      {/* CONFIRMAR ELIMINACIÓN */}
      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteMovil}
        title="Eliminar Móvil Policial"
        message="¿Está seguro de que desea eliminar este móvil? Se eliminarán también todas sus reparaciones registradas."
        danger={true}
      />
    </div>
  );
};
