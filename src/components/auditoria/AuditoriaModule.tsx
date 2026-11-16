import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  History,
  ShieldAlert,
  Search,
  Calendar,
  RefreshCw,
  Download,
  Trash2,
  Eye,
  X,
  ArrowUpDown,
  Lock
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { AuditCategory, AuditLogEntry, SisPolUser, SisPolDelegacion } from '../../types/sgp';
import { getAuditHeaders } from '../../db/dexieDb';

interface AuditoriaModuleProps {
  currentUser: SisPolUser;
  delegaciones: SisPolDelegacion[];
}

interface AuditResponse {
  logs: AuditLogEntry[];
  total: number;
  stats: Record<string, number>;
  retentionDays: number;
  oldestTimestamp: string | null;
  usersList: string[];
  modulesList: string[];
}

const CATEGORY_LABELS: Record<AuditCategory, { label: string; tone: string }> = {
  ACCESO: {
    label: 'Acceso',
    tone: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800'
  },
  CREACION: {
    label: 'Alta / Creación',
    tone: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
  },
  MODIFICACION: {
    label: 'Modificación',
    tone: 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800'
  },
  ELIMINACION: {
    label: 'Eliminación',
    tone: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800'
  },
  RESETEO: {
    label: 'Reseteo / Purga',
    tone: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800'
  },
  SEGURIDAD: {
    label: 'Seguridad',
    tone: 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800'
  },
  RESPALDO: {
    label: 'Respaldo',
    tone: 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800'
  }
};

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const AuditoriaModule: React.FC<AuditoriaModuleProps> = ({
  currentUser,
  delegaciones
}) => {
  const isSuperuser = currentUser.rol === 'superusuario';

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [usersList, setUsersList] = useState<string[]>([]);
  const [modulesList, setModulesList] = useState<string[]>([]);
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [purging, setPurging] = useState<boolean>(false);
  const [purgeFeedback, setPurgeFeedback] = useState<string | null>(null);

  // Filters
  const [fechaDesde, setFechaDesde] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDateInput(d);
  });
  const [fechaHasta, setFechaHasta] = useState<string>(() => formatDateInput(new Date()));
  const [categoria, setCategoria] = useState<string>('TODAS');
  const [modulo, setModulo] = useState<string>('TODOS');
  const [usuario, setUsuario] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [orderDir, setOrderDir] = useState<'DESC' | 'ASC'>('DESC');

  // Detail modal
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    if (!isSuperuser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (fechaDesde) params.set('fechaDesde', fechaDesde);
      if (fechaHasta) params.set('fechaHasta', fechaHasta);
      if (categoria && categoria !== 'TODAS') params.set('categoria', categoria);
      if (modulo && modulo !== 'TODOS') params.set('modulo', modulo);
      if (usuario && usuario !== 'TODOS') params.set('usuario', usuario);
      if (searchTerm.trim()) params.set('q', searchTerm.trim());
      params.set('order', orderDir);
      params.set('limit', '1000');

      const res = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers: {
          ...getAuditHeaders()
        }
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'No se pudo obtener el registro de auditoría.');
      }

      const data: AuditResponse = await res.json();
      setLogs(data.logs || []);
      setStats(data.stats || {});
      setUsersList(data.usersList || []);
      setModulesList(data.modulesList || []);
      setRetentionDays(data.retentionDays || 30);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al consultar la auditoría.');
    } finally {
      setLoading(false);
    }
  }, [isSuperuser, fechaDesde, fechaHasta, categoria, modulo, usuario, searchTerm, orderDir]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const applyDatePreset = (daysBack: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - daysBack);
    setFechaDesde(formatDateInput(start));
    setFechaHasta(formatDateInput(end));
  };

  const handleResetFilters = () => {
    applyDatePreset(30);
    setCategoria('TODAS');
    setModulo('TODOS');
    setUsuario('TODOS');
    setSearchTerm('');
    setOrderDir('DESC');
  };

  const handlePurgeExpired = async () => {
    setPurging(true);
    setPurgeFeedback(null);
    try {
      const res = await fetch('/api/audit-logs/purge-expired', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuditHeaders()
        }
      });
      const data = await res.json();
      if (res.ok) {
        setPurgeFeedback(`Depuración ejecutada: ${data.deleted || 0} registros anteriores a ${data.retentionDays || 30} días eliminados.`);
        await fetchAuditLogs();
      }
    } catch {
      setPurgeFeedback('Error al ejecutar la depuración automática.');
    } finally {
      setPurging(false);
    }
  };

  const handleExportCsv = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'Fecha', 'Hora', 'Timestamp', 'Categoría', 'Operación', 'Módulo', 'Entidad', 'ID Entidad', 'Descripción', 'Usuario', 'Nombre', 'Rol', 'Delegación', 'IP'];
    const escapeCell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = logs.map((l) => {
      const del = delegaciones.find((d) => d.id === l.delegacionId);
      return [
        l.id,
        l.fechaDia,
        l.hora,
        l.timestamp,
        l.categoria,
        l.operacion,
        l.modulo,
        l.entidad || '',
        l.entidadId || '',
        l.descripcion,
        l.usuario,
        l.usuarioNombre || '',
        l.usuarioRol || '',
        del ? `${del.codigo} - ${del.ciudad}` : String(l.delegacionId || ''),
        l.ipAddress || ''
      ].map(escapeCell).join(',');
    });
    const csv = '\uFEFF' + [headers.map(escapeCell).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `auditoria_trazabilidad_${formatDateInput(new Date())}.csv`);
  };

  const parsedSelectedDetails = useMemo(() => {
    if (!selectedEntry?.detallesJson) return null;
    try {
      return JSON.stringify(JSON.parse(selectedEntry.detallesJson), null, 2);
    } catch {
      return selectedEntry.detallesJson;
    }
  }, [selectedEntry]);

  if (!isSuperuser) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center max-w-xl mx-auto my-8 space-y-3">
        <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Módulo Exclusivo de Superusuario
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          La Auditoría y Trazabilidad de Acciones está restringida únicamente al perfil Superusuario.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Auditoría y Trazabilidad de Acciones
              </h1>
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                Exclusivo Superusuario · Retención automática {retentionDays} días
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Registro histórico cronológico de operaciones, altas, modificaciones, eliminaciones, reseteos de contadores y accesos al sistema.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchAuditLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={handlePurgeExpired}
            disabled={purging}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/70 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors"
            title="Depurar manualmente registros con más de 30 días de antigüedad"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{purging ? 'Depurando...' : 'Purgar >30 días'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {purgeFeedback && (
        <div className="px-4 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{purgeFeedback}</span>
          <button onClick={() => setPurgeFeedback(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total (30 días)', value: stats.TOTAL || 0, tone: 'text-slate-900 dark:text-white' },
          { label: 'Accesos', value: stats.ACCESO || 0, tone: 'text-sky-600 dark:text-sky-400' },
          { label: 'Altas / Creación', value: stats.CREACION || 0, tone: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Modificaciones', value: stats.MODIFICACION || 0, tone: 'text-indigo-600 dark:text-indigo-400' },
          { label: 'Eliminaciones', value: stats.ELIMINACION || 0, tone: 'text-rose-600 dark:text-rose-400' },
          {
            label: 'Reseteos / Seg.',
            value: (stats.RESETEO || 0) + (stats.SEGURIDAD || 0) + (stats.RESPALDO || 0),
            tone: 'text-amber-600 dark:text-amber-400'
          }
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3"
          >
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              {kpi.label}
            </span>
            <span className={`text-xl font-bold font-mono tabular-nums mt-0.5 block ${kpi.tone}`}>
              {kpi.value}
            </span>
          </div>
        ))}
      </div>

      {/* Filters Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <span className="font-semibold text-slate-600 dark:text-slate-300 mr-1">Rango rápido:</span>
            <button
              type="button"
              onClick={() => applyDatePreset(0)}
              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset(7)}
              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
            >
              Últimos 7 días
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset(30)}
              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
            >
              Últimos 30 días
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setOrderDir((prev) => (prev === 'DESC' ? 'ASC' : 'DESC'))}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{orderDir === 'DESC' ? 'Más recientes primero' : 'Cronológico antiguo → reciente'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline underline-offset-2 font-medium"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por operación, descripción, usuario o ID..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              title="Fecha desde"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              title="Fecha hasta"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white font-medium"
            >
              <option value="TODAS">Todas las Operaciones</option>
              <option value="ACCESO">Accesos / Sesiones</option>
              <option value="CREACION">Altas / Creación</option>
              <option value="MODIFICACION">Modificaciones</option>
              <option value="ELIMINACION">Eliminaciones</option>
              <option value="RESETEO">Reseteos de Contadores</option>
              <option value="SEGURIDAD">Seguridad / Usuarios / Roles</option>
              <option value="RESPALDO">Respaldos / Restauración</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={modulo}
              onChange={(e) => setModulo(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white"
            >
              <option value="TODOS">Módulos</option>
              {modulesList.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white"
            >
              <option value="TODOS">Usuarios</option>
              {usersList.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {errorMsg ? (
          <div className="p-8 text-center text-xs text-rose-600 dark:text-rose-400 space-y-2">
            <ShieldAlert className="w-8 h-8 mx-auto opacity-75" />
            <p className="font-semibold">{errorMsg}</p>
          </div>
        ) : loading ? (
          <div className="p-10 text-center text-xs text-slate-500 dark:text-slate-400">
            Cargando historial de auditoría cronológico...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1.5">
            <History className="w-8 h-8 mx-auto opacity-40" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              No se registran eventos para los filtros seleccionados
            </p>
            <p className="text-xs text-slate-500">
              Las operaciones, modificaciones, reseteos de contadores y accesos quedarán registrados automáticamente aquí durante {retentionDays} días.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Operación / Módulo</th>
                  <th className="py-3 px-4">Detalle de la Acción</th>
                  <th className="py-3 px-4">Usuario / Rol</th>
                  <th className="py-3 px-4 text-right">Inspección</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((entry) => {
                  const cat = CATEGORY_LABELS[entry.categoria] || {
                    label: entry.categoria,
                    tone: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  };
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-white">{entry.fechaDia}</div>
                        <div className="text-[11px] text-slate-400">{entry.hora}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded border ${cat.tone}`}>
                          {cat.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-[11px] font-bold text-slate-900 dark:text-slate-100">
                          {entry.operacion}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {entry.modulo}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        <div className="text-slate-800 dark:text-slate-200 line-clamp-2">
                          {entry.descripcion}
                        </div>
                        {entry.entidadId && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {entry.entidad} #{entry.entidadId}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-semibold text-slate-900 dark:text-white">
                          {entry.usuario}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {entry.usuarioRol || 'Sin rol'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedEntry(entry)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detalle</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspection Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Registro de Auditoría #{selectedEntry.id}
                </h3>
                <p className="text-xs font-mono text-slate-500">
                  {selectedEntry.timestamp}
                </p>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Operación</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedEntry.operacion}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Módulo / Entidad</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedEntry.modulo} {selectedEntry.entidad ? `(${selectedEntry.entidad}${selectedEntry.entidadId ? ` #${selectedEntry.entidadId}` : ''})` : ''}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Usuario Actuante</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedEntry.usuarioNombre || selectedEntry.usuario} ({selectedEntry.usuario}) — {selectedEntry.usuarioRol || 'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Delegación / Dirección IP</span>
                <span className="font-mono text-slate-900 dark:text-white">
                  {delegaciones.find(d => d.id === selectedEntry.delegacionId)?.nombre || `Delegación #${selectedEntry.delegacionId || 1}`} · IP: {selectedEntry.ipAddress || 'local'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">Descripción</span>
              <p className="text-slate-800 dark:text-slate-200">{selectedEntry.descripcion}</p>
            </div>

            {parsedSelectedDetails && (
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">Carga Útil / Metadatos Registrados</span>
                <pre className="p-3 rounded-lg bg-slate-950 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-60 border border-slate-800">
                  {parsedSelectedDetails}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
