import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Download,
  Trash2,
  Edit3,
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  Filter,
  Table as TableIcon,
  LayoutGrid,
  Map,
  Sparkles,
  School,
  BellRing
} from 'lucide-react';
import { Charla, Personal, DynamicCatalog, InstitutionalConfig } from '../../types/sgp';
import { generateCharlasDoc, SgpPaperSize, SgpOrientation } from '../../utils/sgpPdfGenerator';
import { exportIndividualJson } from '../../utils/sgpBackupZip';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PdfPreviewModal } from '../common/PdfPreviewModal';
import { sgpManager } from '../../db/dexieDb';
import { usePermissions } from '../../context/PermissionsContext';
import {
  formatDateDDMMYYYY,
  getCharlaReminderInfo,
  getUpcomingCharlasReminders
} from '../../utils/charlaReminders';

interface CharlasModuleProps {
  charlas: Charla[];
  personalList: Personal[];
  catalogs: DynamicCatalog[];
  institutionalConfig: InstitutionalConfig;
  delegacionId?: number;
  onNavigate?: (module: string) => void;
  onRefresh: () => void;
}

type ViewMode = 'cards' | 'table' | 'byLocation' | 'byTopic';

export const CharlasModule: React.FC<CharlasModuleProps> = ({
  charlas,
  personalList,
  catalogs,
  institutionalConfig,
  delegacionId,
  onRefresh
}) => {
  const perms = usePermissions();
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [showFilters, setShowFilters] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocalidad, setSelectedLocalidad] = useState('');

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (selectedLocalidad) count++;
    return count;
  }, [searchTerm, selectedLocalidad]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedLocalidad('');
  };

  // Form State (Strictly ONLY the 7 requested fields)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [fecha, setFecha] = useState(formatDateDDMMYYYY());
  const [hora, setHora] = useState('09:00');
  const [localidad, setLocalidad] = useState('');
  const [lugarInstitucion, setLugarInstitucion] = useState('');
  const [temaTratado, setTemaTratado] = useState('');
  const [personalDesignado, setPersonalDesignado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // PDF Preview State
  const [previewPdfBlob, setPdfPreviewBlob] = useState<{
    blob: Blob;
    title: string;
    filename: string;
    paperSize: SgpPaperSize;
    orientation: SgpOrientation;
  } | null>(null);

  const handleOpenCharlasPdf = (
    paperSize: SgpPaperSize = 'a4',
    orientation: SgpOrientation = 'landscape'
  ) => {
    if (!perms.canExport) return;
    const doc = generateCharlasDoc(institutionalConfig, filteredCharlas, { paperSize, orientation });
    const blob = doc.output('blob');
    setPdfPreviewBlob({
      blob,
      title: 'Registro Oficial de Charlas y Prevención Comunitaria',
      filename: `SGP_Charlas_Prevencion_${new Date().toISOString().slice(0, 10)}.pdf`,
      paperSize,
      orientation
    });
  };

  const localidades = useMemo(
    () => catalogs.filter((c) => c.category === 'Localidades').map((c) => c.value),
    [catalogs]
  );

  // Upcoming reminders (next 14 days)
  const upcomingReminders = useMemo(
    () => getUpcomingCharlasReminders(charlas, 14),
    [charlas]
  );

  // Filtered charlas
  const filteredCharlas = useMemo(() => {
    return charlas.filter((ch) => {
      if (selectedLocalidad && ch.localidad !== selectedLocalidad) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const fechaMatch = (ch.fecha || '').toLowerCase().includes(q);
        const horaMatch = (ch.hora || '').toLowerCase().includes(q);
        const temaMatch = (ch.temaTratado || '').toLowerCase().includes(q);
        const instMatch = (ch.lugarInstitucion || '').toLowerCase().includes(q);
        const locMatch = (ch.localidad || '').toLowerCase().includes(q);
        const persMatch = (ch.personalDesignado || '').toLowerCase().includes(q);
        const obsMatch = (ch.observaciones || '').toLowerCase().includes(q);
        return fechaMatch || horaMatch || temaMatch || instMatch || locMatch || persMatch || obsMatch;
      }
      return true;
    });
  }, [charlas, selectedLocalidad, searchTerm]);

  // Aggregate by location
  const byLocationGroups = useMemo(() => {
    const record: Record<string, { charlas: Charla[] }> = {};
    filteredCharlas.forEach((ch) => {
      const loc = ch.localidad || 'Sin Localidad';
      if (!record[loc]) {
        record[loc] = { charlas: [] };
      }
      record[loc].charlas.push(ch);
    });
    return Object.entries(record).sort((a, b) => b[1].charlas.length - a[1].charlas.length);
  }, [filteredCharlas]);

  // Aggregate by topic
  const byTopicGroups = useMemo(() => {
    const record: Record<string, { charlas: Charla[] }> = {};
    filteredCharlas.forEach((ch) => {
      const t = ch.temaTratado ? ch.temaTratado.trim() : 'Sin Tema Específico';
      if (!record[t]) {
        record[t] = { charlas: [] };
      }
      record[t].charlas.push(ch);
    });
    return Object.entries(record).sort((a, b) => b[1].charlas.length - a[1].charlas.length);
  }, [filteredCharlas]);

  const openCreateModal = () => {
    setEditingId(null);
    setFecha(formatDateDDMMYYYY());
    setHora('09:00');
    setLocalidad(localidades[0] || 'Laguna Blanca');
    setLugarInstitucion('');
    setTemaTratado('');
    setPersonalDesignado(
      personalList[0] ? `${personalList[0].jerarquia} ${personalList[0].apellidoNombre}` : ''
    );
    setObservaciones('');
    setIsFormOpen(true);
  };

  const openEditModal = (ch: Charla) => {
    if (!perms.canEdit || !ch.id) return;
    setEditingId(ch.id);
    setFecha(ch.fecha || formatDateDDMMYYYY());
    setHora(ch.hora || '09:00');
    setLocalidad(ch.localidad || localidades[0] || 'Laguna Blanca');
    setLugarInstitucion(ch.lugarInstitucion || '');
    setTemaTratado(ch.temaTratado || '');
    setPersonalDesignado(ch.personalDesignado || '');
    setObservaciones(ch.observaciones || '');
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && !perms.canEdit) return;
    if (!editingId && !perms.canCreate) return;

    const db = (await import('../../db/dexieDb')).db;

    const charlaData: Charla = {
      fecha: fecha.trim(),
      hora: hora.trim(),
      localidad: localidad || localidades[0] || 'Laguna Blanca',
      lugarInstitucion: lugarInstitucion.trim(),
      temaTratado: temaTratado.trim(),
      personalDesignado: personalDesignado.trim(),
      observaciones: observaciones.trim(),
      delegacionId: delegacionId || 1
    };

    if (editingId) {
      await db.charlas.update(editingId, charlaData);
    } else {
      await db.charlas.add(charlaData);
    }

    sgpManager.notify();
    setIsFormOpen(false);
    setEditingId(null);
    setLugarInstitucion('');
    setTemaTratado('');
    setObservaciones('');
    onRefresh();
  };

  const handleDelete = async () => {
    if (!perms.canDelete) return;
    if (deleteTargetId) {
      const db = (await import('../../db/dexieDb')).db;
      await db.charlas.delete(deleteTargetId);
      sgpManager.notify();
      setDeleteTargetId(null);
      onRefresh();
    }
  };

  const renderReminderBadge = (ch: Charla) => {
    const info = getCharlaReminderInfo(ch);
    if (!info || info.daysUntil < 0 || info.daysUntil > 14) return null;

    const style =
      info.status === 'today'
        ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800 animate-pulse'
        : info.status === 'tomorrow'
        ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800'
        : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';

    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono shrink-0 ${style}`}
        title="Recordatorio de evento programado"
      >
        <BellRing className="w-3 h-3" />
        <span>{info.label}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <span>Charlas y Prevención Comunitaria</span>
          </h1>
          <p className="text-xs text-slate-500">
            Agenda y registro de capacitaciones escolares, ciberdelito, seguridad vial y prevención comunitaria • D.D.P.C.L.B.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {perms.canExport && (
            <>
              <button
                onClick={() => handleOpenCharlasPdf()}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200 dark:border-blue-900 rounded-xl shadow-xs transition-colors"
                title="Generar Registro Oficial de Charlas en PDF"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>PDF Charlas</span>
              </button>

              <button
                onClick={() => exportIndividualJson('Charlas', charlas)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar JSON</span>
              </button>
            </>
          )}

          {perms.canCreate && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Charla</span>
            </button>
          )}
        </div>
      </div>

      {/* Upcoming Reminders Banner */}
      {upcomingReminders.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-blue-50 to-indigo-50 dark:from-amber-950/30 dark:via-slate-900 dark:to-indigo-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-wide">
              <BellRing className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Recordatorios Próximos ({upcomingReminders.length})</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Eventos agendados para hoy y los próximos 14 días
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {upcomingReminders.slice(0, 6).map((item) => (
              <div
                key={item.key}
                className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs space-y-1 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                    {item.charla.fecha} {item.charla.hora ? `• ${item.charla.hora} hs` : ''}
                  </span>
                  {renderReminderBadge(item.charla)}
                </div>
                <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                  {item.charla.temaTratado}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                  {item.charla.lugarInstitucion} ({item.charla.localidad})
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  Disertante: {item.charla.personalDesignado || 'A designar'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Eventos</span>
          <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {filteredCharlas.length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Próximas (14 días)</span>
          <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {upcomingReminders.length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Localidades Cubiertas</span>
          <div className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
            {byLocationGroups.length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Temas Abordados</span>
          <div className="text-xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
            {byTopicGroups.length}
          </div>
        </div>
      </div>

      {/* Filter and Mode Bar with Hide/Show Toggle */}
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
              Mostrando <strong className="text-slate-700 dark:text-slate-200 font-mono">{filteredCharlas.length}</strong> de <span className="font-mono">{charlas.length}</span> actividades
            </span>

            {/* View mode switcher */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Vista de Tarjetas"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tarjetas</span>
              </button>

              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Vista de Tabla"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabla</span>
              </button>

              <button
                onClick={() => setViewMode('byLocation')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  viewMode === 'byLocation'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Agrupado por Localidad"
              >
                <Map className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Por Localidad</span>
              </button>

              <button
                onClick={() => setViewMode('byTopic')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  viewMode === 'byTopic'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Agrupado por Tema"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Por Tema</span>
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-all">
            <div className="relative sm:col-span-8">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por fecha, tema, lugar/institución, disertante o localidad..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={selectedLocalidad}
                onChange={(e) => setSelectedLocalidad(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
              >
                <option value="">Todas las Localidades</option>
                {localidades.map((loc, i) => (
                  <option key={i} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* VIEW 1: CARDS */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCharlas.map((ch) => (
            <div
              key={ch.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase font-mono">
                        <Calendar className="w-3 h-3" />
                        {ch.fecha}
                      </span>
                      {ch.hora && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                          <Clock className="w-3 h-3 text-blue-500" />
                          {ch.hora} hs
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                      {ch.temaTratado}
                    </h3>
                  </div>
                  {renderReminderBadge(ch)}
                </div>

                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <School className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="font-semibold">{ch.lugarInstitucion}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{ch.localidad}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Disertante: {ch.personalDesignado || '-'}</span>
                  </div>
                </div>

                {ch.observaciones && (
                  <p className="text-[11px] text-slate-500 italic mt-2.5">
                    "{ch.observaciones}"
                  </p>
                )}
              </div>

              {(perms.canEdit || perms.canDelete) && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-1.5">
                  {perms.canEdit && (
                    <button
                      onClick={() => openEditModal(ch)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Editar charla"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {perms.canDelete && (
                    <button
                      onClick={() => ch.id && setDeleteTargetId(ch.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Eliminar charla"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {filteredCharlas.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              No se encontraron charlas comunitarias con los filtros aplicados.
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: DETAILED TABLE */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3">Fecha</th>
                  <th className="py-3 px-3">Hora</th>
                  <th className="py-3 px-3">Localidad</th>
                  <th className="py-3 px-3">Lugar / Institución</th>
                  <th className="py-3 px-3">Tema</th>
                  <th className="py-3 px-3">Disertante Designado</th>
                  <th className="py-3 px-3">Observaciones</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredCharlas.map((ch) => (
                  <tr key={ch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{ch.fecha}</span>
                        {renderReminderBadge(ch)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {ch.hora ? `${ch.hora} hs` : '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {ch.localidad}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                      {ch.lugarInstitucion}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white max-w-xs">
                      {ch.temaTratado}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {ch.personalDesignado || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate">
                      {ch.observaciones || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {perms.canEdit && (
                          <button
                            onClick={() => openEditModal(ch)}
                            className="text-slate-400 hover:text-blue-600 p-1"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {perms.canDelete && (
                          <button
                            onClick={() => ch.id && setDeleteTargetId(ch.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {!perms.canEdit && !perms.canDelete && (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredCharlas.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              No hay registros para mostrar en la planilla.
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: GROUPED BY LOCALIDAD */}
      {viewMode === 'byLocation' && (
        <div className="space-y-4">
          {byLocationGroups.map(([loc, group]) => (
            <div
              key={loc}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
            >
              <div className="bg-slate-50 dark:bg-slate-950 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {loc}
                  </h3>
                  <span className="text-xs text-slate-500">
                    ({group.charlas.length} eventos registrados)
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
                {group.charlas.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-xl flex items-center justify-between text-xs gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                          {ch.fecha}{ch.hora ? ` • ${ch.hora} hs` : ''}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{ch.temaTratado}</span>
                        {renderReminderBadge(ch)}
                      </div>
                      <div className="text-slate-500">
                        {ch.lugarInstitucion} • Disertante: {ch.personalDesignado || '-'}
                      </div>
                      {ch.observaciones && (
                        <div className="text-[11px] text-slate-400 italic">"{ch.observaciones}"</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {perms.canEdit && (
                        <button
                          onClick={() => openEditModal(ch)}
                          className="text-slate-400 hover:text-blue-600 p-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {perms.canDelete && (
                        <button
                          onClick={() => ch.id && setDeleteTargetId(ch.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {byLocationGroups.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              No hay localidades para mostrar.
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: GROUPED BY TOPIC */}
      {viewMode === 'byTopic' && (
        <div className="space-y-4">
          {byTopicGroups.map(([topic, group]) => (
            <div
              key={topic}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
            >
              <div className="bg-slate-50 dark:bg-slate-950 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {topic}
                  </h3>
                  <span className="text-xs text-slate-500">
                    ({group.charlas.length} charlas)
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
                {group.charlas.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-xl flex items-center justify-between text-xs gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                          {ch.fecha}{ch.hora ? ` • ${ch.hora} hs` : ''}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {ch.lugarInstitucion} ({ch.localidad})
                        </span>
                        {renderReminderBadge(ch)}
                      </div>
                      <div className="text-slate-500">
                        Disertante designado: {ch.personalDesignado || '-'}
                      </div>
                      {ch.observaciones && (
                        <div className="text-[11px] text-slate-400 italic">"{ch.observaciones}"</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {perms.canEdit && (
                        <button
                          onClick={() => openEditModal(ch)}
                          className="text-slate-400 hover:text-blue-600 p-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {perms.canDelete && (
                        <button
                          onClick={() => ch.id && setDeleteTargetId(ch.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {byTopicGroups.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              No hay temáticas para mostrar.
            </div>
          )}
        </div>
      )}

      {/* Modal Charla Comunitaria (Strictly 7 fields) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editingId ? 'Editar Charla Comunitaria' : 'Registrar Charla Comunitaria'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3">
              {/* 1. Fecha (DD/MM/AAAA) & 2. Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha (DD/MM/AAAA) *
                  </label>
                  <input
                    type="text"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    pattern="\d{2}/\d{2}/\d{4}"
                    title="Formato requerido: DD/MM/AAAA"
                    required
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hora *
                  </label>
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* 3. Localidad */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Localidad *
                </label>
                <select
                  value={localidad}
                  onChange={(e) => setLocalidad(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {localidades.map((loc, i) => (
                    <option key={i} value={loc}>{loc}</option>
                  ))}
                  {localidad && !localidades.includes(localidad) && (
                    <option value={localidad}>{localidad}</option>
                  )}
                </select>
              </div>

              {/* 4. Lugar / Institución */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lugar / Institución *
                </label>
                <input
                  type="text"
                  value={lugarInstitucion}
                  onChange={(e) => setLugarInstitucion(e.target.value)}
                  placeholder="ej. Colegio Secundario EPES N° 22"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* 5. Tema */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tema *
                </label>
                <input
                  type="text"
                  value={temaTratado}
                  onChange={(e) => setTemaTratado(e.target.value)}
                  placeholder="ej. Prevención de Ciberdelito y Grooming"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* 6. Disertante Designado */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Disertante Designado *
                </label>
                <input
                  type="text"
                  list="charlas-personal-options"
                  value={personalDesignado}
                  onChange={(e) => setPersonalDesignado(e.target.value)}
                  placeholder="Efectivo policial designado..."
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <datalist id="charlas-personal-options">
                  {personalList.map((p) => (
                    <option key={p.id} value={`${p.jerarquia} ${p.apellidoNombre}`} />
                  ))}
                </datalist>
              </div>

              {/* 7. Observaciones */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={2}
                  placeholder="Notas adicionales o detalles del evento..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingId(null);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  {editingId ? 'Guardar Cambios' : 'Guardar Charla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Eliminar Charla"
        message="¿Está seguro de que desea eliminar este registro de charla comunitaria?"
        danger={true}
      />

      {/* PDF Document Preview Modal */}
      {previewPdfBlob && (
        <PdfPreviewModal
          isOpen={true}
          pdfBlob={previewPdfBlob.blob}
          title={previewPdfBlob.title}
          filename={previewPdfBlob.filename}
          paperSize={previewPdfBlob.paperSize}
          orientation={previewPdfBlob.orientation}
          onChangeFormat={(newSize, newOrient) => {
            handleOpenCharlasPdf(newSize, newOrient);
          }}
          onClose={() => setPdfPreviewBlob(null)}
        />
      )}
    </div>
  );
};
