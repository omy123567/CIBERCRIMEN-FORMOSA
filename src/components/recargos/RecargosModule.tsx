import React, { useState, useMemo } from 'react';
import {
  Shield,
  Plus,
  Download,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  Search,
  Filter,
  Layers,
  ArrowUpDown,
  Users
} from 'lucide-react';
import { Recargo, Personal, DynamicCatalog, InstitutionalConfig } from '../../types/sgp';
import { generateRecargoPlanillaDoc, SgpPaperSize, SgpOrientation } from '../../utils/sgpPdfGenerator';
import { exportIndividualJson } from '../../utils/sgpBackupZip';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PdfPreviewModal } from '../common/PdfPreviewModal';
import { sgpManager } from '../../db/dexieDb';

interface RecargosModuleProps {
  recargos: Recargo[];
  personalList: Personal[];
  catalogs: DynamicCatalog[];
  institutionalConfig: InstitutionalConfig;
  delegacionId?: number;
  onNavigate?: (module: string) => void;
  onRefresh: () => void;
}

type RecargosViewMode = 'cards' | 'table' | 'byType' | 'byOfficer';

export const RecargosModule: React.FC<RecargosModuleProps> = ({
  recargos,
  personalList,
  catalogs,
  institutionalConfig,
  delegacionId,
  onNavigate,
  onRefresh
}) => {
  const [viewMode, setViewMode] = useState<RecargosViewMode>('cards');
  const [showFilters, setShowFilters] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPersonal, setFilterPersonal] = useState<string>('');
  const [sortField, setSortField] = useState<'fecha' | 'personalNombre' | 'totalHoras'>('fecha');
  const [sortAsc, setSortAsc] = useState(false);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [personalId, setPersonalId] = useState<number>(personalList[0]?.id || 0);
  const [fecha, setFecha] = useState(new Date().toLocaleDateString('es-AR'));
  const [horarioDesde, setHorarioDesde] = useState('18:00');
  const [horarioHasta, setHorarioHasta] = useState('00:00');
  const [totalHoras, setTotalHoras] = useState('6');
  const [tipoRecargo, setTipoRecargo] = useState('');
  const [lugarDestino, setLugarDestino] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // PDF Preview State
  const [previewPdfBlob, setPdfPreviewBlob] = useState<{
    blob: Blob;
    title: string;
    filename: string;
    rec: Recargo;
    paperSize: SgpPaperSize;
    orientation: SgpOrientation;
  } | null>(null);

  const handleOpenPlanillaPdf = (
    rec: Recargo,
    paperSize: SgpPaperSize = 'a4',
    orientation: SgpOrientation = 'portrait'
  ) => {
    const doc = generateRecargoPlanillaDoc(institutionalConfig, rec, { paperSize, orientation });
    const blob = doc.output('blob');
    setPdfPreviewBlob({
      blob,
      title: `Planilla de Recargo de Servicio - ${rec.personalNombre}`,
      filename: `SGP_Recargo_${rec.fecha.replace(/\//g, '-')}_${rec.personalNombre.replace(/[^a-zA-Z]/g, '_')}.pdf`,
      rec,
      paperSize,
      orientation
    });
  };

  const tiposRecargo = catalogs.filter((c) => c.category === 'Tipos de Recargo').map((c) => c.value);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (filterType) count++;
    if (filterPersonal) count++;
    return count;
  }, [searchTerm, filterType, filterPersonal]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterType('');
    setFilterPersonal('');
  };

  // Filter & sort
  const processedRecargos = useMemo(() => {
    let list = recargos.filter((r) => {
      if (filterType && r.tipoRecargo !== filterType) return false;
      if (filterPersonal && r.personalId?.toString() !== filterPersonal) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const persMatch = r.personalNombre.toLowerCase().includes(q);
        const lugarMatch = r.lugarDestino.toLowerCase().includes(q);
        const tipoMatch = r.tipoRecargo.toLowerCase().includes(q);
        const fechaMatch = r.fecha.includes(q);
        return persMatch || lugarMatch || tipoMatch || fechaMatch;
      }
      return true;
    });

    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (sortField === 'totalHoras') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [recargos, filterType, filterPersonal, searchTerm, sortField, sortAsc]);

  // Total Hours Accumulator
  const totalHorasGlobal = useMemo(() => {
    return recargos.reduce((acc, r) => acc + (parseFloat(r.totalHoras) || 0), 0);
  }, [recargos]);

  // Grouped by Type
  const groupedByType = useMemo(() => {
    const map: Record<string, { count: number; hours: number; items: Recargo[] }> = {};
    processedRecargos.forEach((r) => {
      const type = r.tipoRecargo || 'Otro';
      if (!map[type]) map[type] = { count: 0, hours: 0, items: [] };
      map[type].count++;
      map[type].hours += parseFloat(r.totalHoras) || 0;
      map[type].items.push(r);
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [processedRecargos]);

  // Grouped by Officer
  const groupedByOfficer = useMemo(() => {
    const map: Record<string, { jerarquia: string; name: string; count: number; hours: number; items: Recargo[] }> = {};
    processedRecargos.forEach((r) => {
      const key = `${r.personalNombre}`;
      if (!map[key]) {
        map[key] = {
          jerarquia: r.personalJerarquia,
          name: r.personalNombre,
          count: 0,
          hours: 0,
          items: []
        };
      }
      map[key].count++;
      map[key].hours += parseFloat(r.totalHoras) || 0;
      map[key].items.push(r);
    });
    return Object.values(map).sort((a, b) => b.hours - a.hours);
  }, [processedRecargos]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const person = personalList.find((p) => p.id === Number(personalId));
    if (!person) return;

    const db = (await import('../../db/dexieDb')).db;
    const nuevoRecargo: Recargo = {
      personalId: person.id || 0,
      personalNombre: person.apellidoNombre,
      personalJerarquia: person.jerarquia,
      fecha,
      horarioDesde,
      horarioHasta,
      totalHoras,
      tipoRecargo: tipoRecargo || tiposRecargo[0] || 'Operativo de Prevención',
      lugarDestino,
      observaciones,
      delegacionId: person.delegacionId || delegacionId || 1
    };

    await db.recargos.add(nuevoRecargo);
    sgpManager.notify();
    setIsFormOpen(false);
    onRefresh();
  };

  const handleDelete = async () => {
    if (deleteTargetId) {
      const db = (await import('../../db/dexieDb')).db;
      await db.recargos.delete(deleteTargetId);
      sgpManager.notify();
      setDeleteTargetId(null);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            <span>Recargos Operativos y Servicios Extraordinarios</span>
          </h1>
          <p className="text-xs text-slate-500">
            Afectación de servicios adicionales, puestos fijos, prevención y eventos deportivos
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportIndividualJson('Recargos', recargos)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar JSON</span>
          </button>

          <button
            onClick={() => {
              setTipoRecargo(tiposRecargo[0] || 'Seguridad en Cancha / Evento');
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Programar Recargo</span>
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
            <div className="text-xs text-slate-500 hidden sm:block">
              <span>Mostrando </span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">{processedRecargos.length}</span> de <span className="font-mono">{recargos.length}</span> servicios |{' '}
              <span className="font-bold font-mono text-blue-600">{totalHorasGlobal} hs</span>
            </div>

            {/* View Switcher: 4 Modes */}
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
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Tabla
              </button>
              <button
                onClick={() => setViewMode('byType')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === 'byType'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Por Tipo
              </button>
              <button
                onClick={() => setViewMode('byOfficer')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === 'byOfficer'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Por Efectivo
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-all">
            <div className="relative sm:col-span-5">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por efectivo, lugar, servicio o fecha..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
              >
                <option value="">Todos los Tipos de Recargo</option>
                {tiposRecargo.map((t, idx) => (
                  <option key={idx} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <select
                value={filterPersonal}
                onChange={(e) => setFilterPersonal(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
              >
                <option value="">Todos los Efectivos Designados</option>
                {personalList.map((p) => (
                  <option key={p.id} value={p.id?.toString()}>
                    {p.jerarquia} {p.apellidoNombre} ({p.plaza})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* VISTA 1: TARJETAS */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedRecargos.map((rec) => (
            <div
              key={rec.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase font-mono">
                      {rec.fecha}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {rec.tipoRecargo}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    {rec.totalHoras} hs
                  </span>
                </div>

                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-900 dark:text-white">
                      {rec.personalJerarquia} {rec.personalNombre}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{rec.horarioDesde} a {rec.horarioHasta} hs</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{rec.lugarDestino}</span>
                  </div>
                </div>

                {rec.observaciones && (
                  <p className="text-[11px] text-slate-500 italic mt-2">
                    "{rec.observaciones}"
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => handleOpenPlanillaPdf(rec)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Abrir vista preliminar de planilla de recargo"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Planilla PDF</span>
                </button>

                <button
                  onClick={() => rec.id && setDeleteTargetId(rec.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VISTA 2: TABLA DETALLADA */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th
                    className="py-3 px-3 cursor-pointer"
                    onClick={() => {
                      setSortField('fecha');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Fecha</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 cursor-pointer"
                    onClick={() => {
                      setSortField('personalNombre');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Personal Asignado</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Tipo de Recargo</th>
                  <th className="py-3 px-3">Lugar / Destino</th>
                  <th className="py-3 px-3">Horario</th>
                  <th
                    className="py-3 px-3 cursor-pointer"
                    onClick={() => {
                      setSortField('totalHoras');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Horas</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Observaciones</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {processedRecargos.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono font-semibold">{rec.fecha}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {rec.personalJerarquia} {rec.personalNombre}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-blue-600 dark:text-blue-400">
                      {rec.tipoRecargo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      {rec.lugarDestino}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {rec.horarioDesde} a {rec.horarioHasta}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                      {rec.totalHoras} hs
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">
                      {rec.observaciones || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenPlanillaPdf(rec)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold mr-2"
                        title="Abrir vista preliminar de planilla de recargo"
                      >
                        Planilla PDF
                      </button>
                      <button
                        onClick={() => rec.id && setDeleteTargetId(rec.id)}
                        className="text-xs text-rose-500 hover:text-rose-700"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 3: AGRUPADO POR TIPO DE RECARGO */}
      {viewMode === 'byType' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groupedByType.map(([type, data]) => (
            <div
              key={type}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {type}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {data.count} servicios asignados
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  {data.hours} hs acumuladas
                </span>
              </div>

              <div className="space-y-2">
                {data.items.map((r) => (
                  <div
                    key={r.id}
                    className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {r.personalJerarquia} {r.personalNombre}
                      </span>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>{r.fecha}</span>
                        <span>•</span>
                        <span>{r.lugarDestino}</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-blue-600">{r.totalHoras} hs</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VISTA 4: AGRUPADO POR EFECTIVO */}
      {viewMode === 'byOfficer' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupedByOfficer.map((off, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <span className="text-[11px] text-blue-600 font-bold uppercase">{off.jerarquia}</span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {off.name}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-blue-600 font-mono block">
                    {off.hours} hs
                  </span>
                  <span className="text-[10px] text-slate-400">{off.count} servicios</span>
                </div>
              </div>

              <div className="space-y-1.5">
                {off.items.map((r) => (
                  <div key={r.id} className="text-xs p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg flex justify-between">
                    <div>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{r.tipoRecargo}</span>
                      <span className="text-[10px] text-slate-400 block">{r.fecha} • {r.lugarDestino}</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">{r.totalHoras} hs</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Programar Recargo de Servicio
            </h3>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Personal Asignado (*)
                </label>
                <select
                  value={personalId}
                  onChange={(e) => setPersonalId(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {personalList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.jerarquia} {p.apellidoNombre} ({p.grupo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha (DD/MM/AAAA)
                  </label>
                  <input
                    type="text"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Recargo
                  </label>
                  <select
                    value={tipoRecargo}
                    onChange={(e) => setTipoRecargo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {tiposRecargo.map((t, i) => (
                      <option key={i} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Desde</label>
                  <input
                    type="time"
                    value={horarioDesde}
                    onChange={(e) => setHorarioDesde(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Hasta</label>
                  <input
                    type="time"
                    value={horarioHasta}
                    onChange={(e) => setHorarioHasta(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Total Hs</label>
                  <input
                    type="text"
                    value={totalHoras}
                    onChange={(e) => setTotalHoras(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lugar / Destino de Cobertura
                </label>
                <input
                  type="text"
                  value={lugarDestino}
                  onChange={(e) => setLugarDestino(e.target.value)}
                  placeholder="ej. Cancha Club Atlético / Puesto Fijo Fronterizo"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  Guardar Recargo
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
        title="Eliminar Recargo"
        message="¿Está seguro de que desea eliminar este recargo de servicio?"
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
            handleOpenPlanillaPdf(previewPdfBlob.rec, newSize, newOrient);
          }}
          onClose={() => setPdfPreviewBlob(null)}
        />
      )}
    </div>
  );
};
