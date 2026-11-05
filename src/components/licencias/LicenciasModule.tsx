import React, { useState, useMemo } from 'react';
import {
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Search,
  Filter,
  Users,
  Shield,
  Download,
  RotateCcw,
  Plus,
  AlertCircle
} from 'lucide-react';
import { Personal, Licencia, DynamicCatalog, InstitutionalConfig } from '../../types/sgp';
import { calcularCuatrienioPersonal, calcularEscalaDiasAnuales } from '../../utils/licenciasCuatrienio';
import { LicenciasModal } from '../personal/LicenciasModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { exportIndividualJson } from '../../utils/sgpBackupZip';
import { exportPersonalRosterPDF } from '../../utils/sgpPdfGenerator';
import { sgpManager } from '../../db/dexieDb';

interface LicenciasModuleProps {
  personalList: Personal[];
  licencias: Licencia[];
  catalogs: DynamicCatalog[];
  institutionalConfig: InstitutionalConfig;
  delegacionId?: number;
  onNavigate?: (module: string) => void;
  onRefresh: () => void;
  anioBase?: number;
}

export const LicenciasModule: React.FC<LicenciasModuleProps> = ({
  personalList,
  licencias,
  catalogs,
  institutionalConfig,
  delegacionId,
  onNavigate,
  onRefresh,
  anioBase = 2026
}) => {
  const [activeTab, setActiveTab] = useState<'cuatrienios' | 'historial'>('cuatrienios');
  const [showFilters, setShowFilters] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrupo, setFilterGrupo] = useState('');
  const [filterEstado, setFilterEstado] = useState<'TODOS' | 'CON_SALDO' | 'SIN_SALDO' | 'CON_VENCIDAS'>('TODOS');

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (filterGrupo) count++;
    if (filterEstado !== 'TODOS') count++;
    return count;
  }, [searchTerm, filterGrupo, filterEstado]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterGrupo('');
    setFilterEstado('TODOS');
  };

  // Modals
  const [selectedForLicencia, setSelectedForLicencia] = useState<Personal | null>(null);
  const [confirmBulkVencer, setConfirmBulkVencer] = useState(false);

  const grupos = catalogs.filter((c) => c.category === 'Grupos').map((c) => c.value);

  // Cuatrienio calculation for all personal
  const personalWithCuatrienio = useMemo(() => {
    return personalList.map((person) => {
      const pLicencias = licencias.filter((l) => l.personalId === person.id);
      const cuatrienio = calcularCuatrienioPersonal(person, pLicencias, anioBase);
      const tieneVencidas = cuatrienio.periodos.some((p) => p.estado === 'VENCIDA');
      const tieneSaldo = cuatrienio.totalSaldoDisponible > 0;
      return {
        person,
        cuatrienio,
        pLicencias,
        tieneVencidas,
        tieneSaldo
      };
    });
  }, [personalList, licencias, anioBase]);

  // Filtered
  const filteredList = useMemo(() => {
    return personalWithCuatrienio.filter(({ person, tieneSaldo, tieneVencidas }) => {
      if (filterGrupo && person.grupo !== filterGrupo) return false;
      if (filterEstado === 'CON_SALDO' && !tieneSaldo) return false;
      if (filterEstado === 'SIN_SALDO' && tieneSaldo) return false;
      if (filterEstado === 'CON_VENCIDAS' && !tieneVencidas) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const nameMatch = person.apellidoNombre.toLowerCase().includes(q);
        const dniMatch = person.dni.includes(q);
        const plazaMatch = person.plaza.toLowerCase().includes(q);
        const jerMatch = person.jerarquia.toLowerCase().includes(q);
        return nameMatch || dniMatch || plazaMatch || jerMatch;
      }
      return true;
    });
  }, [personalWithCuatrienio, filterGrupo, filterEstado, searchTerm]);


  // Actions
  const handleSaveLicencia = async (lic: Licencia) => {
    const db = (await import('../../db/dexieDb')).db;
    await db.licencias.add(lic);
    sgpManager.notify();
    onRefresh();
  };

  const handleUpdatePeriodStatus = async (
    personalId: number,
    anio: number,
    newStatus: 'AUTOMÁTICO' | 'MANUAL' | 'VENCIDA' | 'SIN DÍAS'
  ) => {
    const db = (await import('../../db/dexieDb')).db;
    const p = await db.personal.get(personalId);
    if (!p) return;

    let custom: any = {};
    try {
      custom = p.customFieldsJson ? JSON.parse(p.customFieldsJson) : {};
    } catch {
      // ignore
    }

    if (!custom.periodosManuales) custom.periodosManuales = {};
    custom.periodosManuales[anio.toString()] = {
      dias: custom.periodosManuales[anio.toString()]?.dias || 0,
      estado: newStatus
    };

    p.customFieldsJson = JSON.stringify(custom);
    await db.personal.put(p);
    sgpManager.notify();
    onRefresh();
  };

  const handleVencerAnteriores = async (personalId: number, currentYear: number) => {
    const db = (await import('../../db/dexieDb')).db;
    const p = await db.personal.get(personalId);
    if (!p) return;

    let custom: any = {};
    try {
      custom = p.customFieldsJson ? JSON.parse(p.customFieldsJson) : {};
    } catch {
      // ignore
    }

    if (!custom.periodosManuales) custom.periodosManuales = {};

    for (let y = currentYear - 3; y < currentYear; y++) {
      custom.periodosManuales[y.toString()] = {
        dias: 0,
        estado: 'VENCIDA'
      };
    }

    p.customFieldsJson = JSON.stringify(custom);
    await db.personal.put(p);
    sgpManager.notify();
    onRefresh();
  };

  const handleBulkVencerAnteriores = async () => {
    const db = (await import('../../db/dexieDb')).db;
    const all = await db.personal.toArray();

    for (const p of all) {
      if (!p.id) continue;
      let custom: any = {};
      try {
        custom = p.customFieldsJson ? JSON.parse(p.customFieldsJson) : {};
      } catch {
        // ignore
      }

      if (!custom.periodosManuales) custom.periodosManuales = {};
      for (let y = anioBase - 3; y < anioBase; y++) {
        custom.periodosManuales[y.toString()] = {
          dias: 0,
          estado: 'VENCIDA'
        };
      }
      p.customFieldsJson = JSON.stringify(custom);
      await db.personal.put(p);
    }

    sgpManager.notify();
    setConfirmBulkVencer(false);
    onRefresh();
  };

  const handleInterruptLicencia = async (licenciaId: number, devueltos: number, motivo: string) => {
    const db = (await import('../../db/dexieDb')).db;
    const lic = await db.licencias.get(licenciaId);
    if (lic) {
      lic.fueInterrumpida = true;
      lic.diasRestantesDevueltos = devueltos;
      lic.motivoInterrupcion = motivo;
      lic.fechaInterrupcion = new Date().toLocaleDateString('es-AR');
      await db.licencias.put(lic);
      sgpManager.notify();
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Submodule Parent Navigation Breadcrumb */}
      {onNavigate && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-blue-900 dark:text-blue-200">Módulo Padre:</span>
            <button
              onClick={() => onNavigate('personal')}
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              ← Volver a Personal & Legajos
            </button>
            <span className="text-slate-400">/</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
              Submódulo: Licencias & Cuatrienios
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Gestión especializada de descansos y licencias reglamentarias</span>
          </div>
        </div>
      )}

      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            <span>Módulo de Licencias Policiales & Cuatrienio</span>
          </h1>
          <p className="text-xs text-slate-500">
            Control de 4 períodos independientes, escalas por antigüedad estricta en años calendario y registro de goce
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportIndividualJson('Licencias', licencias)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar JSON</span>
          </button>

          <button
            onClick={() => setConfirmBulkVencer(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 rounded-xl shadow-xs"
            title={`Marcar vencidos períodos anteriores a ${anioBase} para toda la fuerza`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Vencer &lt; {anioBase} (Global)</span>
          </button>
        </div>
      </div>


      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('cuatrienios')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'cuatrienios'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Cuatrienios por Efectivo ({personalList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'historial'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Historial de Licencias ({licencias.length})</span>
        </button>
      </div>

      {activeTab === 'cuatrienios' && (
        <div className="space-y-4">
          {/* Filter Bar with Hide/Show Toggle */}
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
                Mostrando <strong className="text-slate-700 dark:text-slate-200 font-mono">{filteredList.length}</strong> de <span className="font-mono">{personalWithCuatrienio.length}</span> efectivos
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-all">
                <div className="relative sm:col-span-6">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por apellido, nombre, DNI o plaza..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={filterGrupo}
                    onChange={(e) => setFilterGrupo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
                  >
                    <option value="">Todas las Secciones</option>
                    {grupos.map((g, i) => (
                      <option key={i} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="TODOS">Todos los Estados de Licencia</option>
                    <option value="CON_SALDO">Con Saldo Disponible</option>
                    <option value="SIN_SALDO">Sin Saldo (Agotado)</option>
                    <option value="CON_VENCIDAS">Con Períodos Vencidos</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Cuatrienios Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Efectivo / Jerarquía</th>
                    <th className="py-3 px-3">Sección</th>
                    <th className="py-3 px-3">Ingreso</th>
                    <th className="py-3 px-3 text-center">Antigüedad</th>
                    <th className="py-3 px-3 text-center">Escala Base</th>
                    <th className="py-3 px-3">Cuatrienio Activo ({anioBase - 3} - {anioBase})</th>
                    <th className="py-3 px-3 text-right">Saldo Total</th>
                    <th className="py-3 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredList.map(({ person, cuatrienio, tieneVencidas }) => (
                    <tr key={person.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {person.apellidoNombre}
                        </div>
                        <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                          {person.jerarquia} • DNI: {person.dni} • Plaza: {person.plaza}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {person.grupo}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {person.fechaIngreso}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {cuatrienio.antiguedadAnios} años
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                        <span className="font-bold">{cuatrienio.escalaDiasBase}</span> d/año
                        {cuatrienio.antiguedadAnios >= 10 && (
                          <span className="text-[10px] text-blue-600 block">+5 inv.</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {cuatrienio.periodos.map((p) => {
                            let badgeStyle = 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border-blue-200';
                            if (p.estado === 'VENCIDA') badgeStyle = 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200';
                            if (p.estado === 'SIN DÍAS' || p.saldoRestante === 0) badgeStyle = 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border-slate-200';

                            return (
                              <div
                                key={p.anio}
                                className={`px-2 py-1 rounded-lg border text-[11px] font-mono ${badgeStyle}`}
                                title={`Año ${p.anio}: ${p.diasAsignados}d otorgados, ${p.diasTomados}d tomados, saldo ${p.saldoRestante}d (${p.estado})`}
                              >
                                <span className="font-bold">{p.anio}:</span> {p.saldoRestante}d
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                          {cuatrienio.totalSaldoDisponible} d
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedForLicencia(person)}
                          className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-600/30 rounded-xl transition-all"
                        >
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredList.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                No se encontraron registros de cuatrienio que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historial Tab */}
      {activeTab === 'historial' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3">Efectivo</th>
                  <th className="py-3 px-3">Tipo Licencia</th>
                  <th className="py-3 px-3">Año Imputado</th>
                  <th className="py-3 px-3">Fecha Inicio</th>
                  <th className="py-3 px-3">Fecha Fin</th>
                  <th className="py-3 px-3 text-right">Días Gozados</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {licencias.map((lic) => {
                  const person = personalList.find((p) => p.id === lic.personalId);

                  return (
                    <tr key={lic.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {person ? person.apellidoNombre : `ID ${lic.personalId}`}
                        </span>
                        {person && (
                          <span className="text-[10px] text-slate-500 block">
                            {person.jerarquia} • DNI: {person.dni}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {lic.tipoLicencia}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-mono font-bold">
                        {lic.anioPeriodo || '-'}
                      </td>

                      <td className="py-2.5 px-3 font-mono">{lic.fechaSalida || '-'}</td>
                      <td className="py-2.5 px-3 font-mono">{lic.fechaReanudacion || '-'}</td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {lic.diasHabilesTomados} d
                      </td>

                      <td className="py-2.5 px-3">
                        {lic.fueInterrumpida ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Interrumpida ({lic.diasRestantesDevueltos}d dev.)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Cumplida
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate">
                        {lic.observaciones || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {licencias.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              No hay licencias registradas en la base de datos.
            </div>
          )}
        </div>
      )}

      {/* Modal Cuatrienio Individual */}
      {selectedForLicencia && (
        <LicenciasModal
          isOpen={!!selectedForLicencia}
          onClose={() => setSelectedForLicencia(null)}
          personal={selectedForLicencia}
          licencias={licencias.filter((l) => l.personalId === selectedForLicencia.id)}
          onSaveLicencia={handleSaveLicencia}
          onUpdatePeriodStatus={handleUpdatePeriodStatus}
          onVencerAnteriores={handleVencerAnteriores}
          onInterruptLicencia={handleInterruptLicencia}
          institutionalConfig={institutionalConfig}
          anioBase={anioBase}
        />
      )}

      {/* Bulk Expire Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmBulkVencer}
        onClose={() => setConfirmBulkVencer(false)}
        onConfirm={handleBulkVencerAnteriores}
        title={`Vencer Períodos Anteriores a ${anioBase} (Global)`}
        message={`¿Está seguro de marcar como VENCIDOS todos los períodos anteriores al año ${anioBase} para toda la fuerza policial? Esta acción actualizará los cuatrienios de todos los efectivos dejando su saldo en 0 para dichos años caducos.`}
        danger={true}
      />
    </div>
  );
};
