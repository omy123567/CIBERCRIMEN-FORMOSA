import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit,
  FileText,
  UserCheck,
  Shield,
  Download,
  X,
  Save,
  ArrowLeft,
  ShieldAlert,
  FolderOpen,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { PersonaInvestigada, Expediente } from '../../types/sgp';
import { db, sgpManager } from '../../db/dexieDb';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { exportIndividualJson } from '../../utils/sgpBackupZip';

interface PersonasModuleProps {
  personas?: PersonaInvestigada[];
  expedientes?: Expediente[];
  onRefresh: () => void;
  delegacionId?: number;
  onNavigate?: (module: string) => void;
}

export const PersonasModule: React.FC<PersonasModuleProps> = ({
  personas = [],
  expedientes = [],
  onRefresh,
  delegacionId,
  onNavigate
}) => {
  const [showFilters, setShowFilters] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScope, setFilterScope] = useState<'ALL' | 'LOCAL'>('ALL');
  const [filterVinculacion, setFilterVinculacion] = useState<'TODOS' | 'CON_EXPEDIENTES' | 'SIN_EXPEDIENTES'>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<PersonaInvestigada | null>(null);

  // Form states
  const [apellidoNombre, setApellidoNombre] = useState('');
  const [dni, setDni] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // Safe helper to normalize expedientesVinculados to string[]
  const parseExpedientes = (val: any): string[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
        return val.trim() ? [val.trim()] : [];
      } catch {
        return val.trim() ? [val.trim()] : [];
      }
    }
    return [];
  };

  // Combine directly registered personas + persons extracted from expedientes evidence
  const unifiedPersonas = useMemo(() => {
    const map = new Map<string, PersonaInvestigada>();

    // 1. Registered personas in db.personas
    (personas || []).forEach((p) => {
      const cleanDni = (p.dni || '').replace(/\D/g, '').trim();
      const cleanName = (p.apellidoNombre || '').trim();
      const key = cleanDni || cleanName.toLowerCase();
      if (!key) return;

      map.set(key, {
        ...p,
        dni: cleanDni || p.dni || 'S/D',
        apellidoNombre: cleanName,
        expedientesVinculados: parseExpedientes(p.expedientesVinculados)
      });
    });

    // 2. Aggregate evidencePersons stored within expedientes customFields
    (expedientes || []).forEach((exp) => {
      if (!exp.customFieldsJson) return;
      try {
        const custom = JSON.parse(exp.customFieldsJson);
        const expLabel = `${exp.nroExpediente}/${exp.anio}`;

        if (Array.isArray(custom.evidencePersons)) {
          custom.evidencePersons.forEach((ep: any) => {
            const cleanDni = (ep.dni || '').replace(/\D/g, '').trim();
            const cleanName = (ep.fullName || '').trim();
            const key = cleanDni || cleanName.toLowerCase();
            if (!key) return;

            if (map.has(key)) {
              const existing = map.get(key)!;
              const merged = Array.from(new Set([...(existing.expedientesVinculados || []), expLabel]));
              existing.expedientesVinculados = merged;
            } else {
              map.set(key, {
                id: undefined, // Sourced dynamically from evidence case
                apellidoNombre: cleanName || 'Persona en Evidencia',
                dni: cleanDni || 'S/D',
                observaciones: `Evidencia vinculada a: ${exp.caratula || exp.tipoRequerimiento}`,
                fechaRegistro: exp.fechaIngreso || new Date().toLocaleDateString('es-AR'),
                expedientesVinculados: [expLabel],
                delegacionId: exp.delegacionId
              });
            }
          });
        }
      } catch {
        // ignore JSON parse errors
      }
    });

    return Array.from(map.values());
  }, [personas, expedientes]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (filterScope !== 'ALL') count++;
    if (filterVinculacion !== 'TODOS') count++;
    return count;
  }, [searchTerm, filterScope, filterVinculacion]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterScope('ALL');
    setFilterVinculacion('TODOS');
  };

  const filteredPersonas = useMemo(() => {
    let list = unifiedPersonas;

    // Filter by delegation scope
    if (filterScope === 'LOCAL' && delegacionId) {
      list = list.filter((p) => !p.delegacionId || p.delegacionId === delegacionId);
    }

    // Filter by expedientes vinculados
    if (filterVinculacion === 'CON_EXPEDIENTES') {
      list = list.filter((p) => (p.expedientesVinculados || []).length > 0);
    } else if (filterVinculacion === 'SIN_EXPEDIENTES') {
      list = list.filter((p) => (p.expedientesVinculados || []).length === 0);
    }

    if (!searchTerm.trim()) return list;

    const q = searchTerm.toLowerCase().trim();
    return list.filter((p) => {
      const matchName = (p.apellidoNombre || '').toLowerCase().includes(q);
      const matchDni = (p.dni || '').includes(q);
      const matchObs = (p.observaciones || '').toLowerCase().includes(q);
      const matchExps = (p.expedientesVinculados || []).some((exp) => exp.toLowerCase().includes(q));
      return matchName || matchDni || matchObs || matchExps;
    });
  }, [unifiedPersonas, filterScope, filterVinculacion, delegacionId, searchTerm]);

  const handleOpenNew = () => {
    setEditingPersona(null);
    setApellidoNombre('');
    setDni('');
    setObservaciones('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: PersonaInvestigada) => {
    setEditingPersona(p);
    setApellidoNombre(p.apellidoNombre);
    setDni(p.dni);
    setObservaciones(p.observaciones || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apellidoNombre.trim() || !dni.trim()) return;

    const cleanDni = dni.replace(/\D/g, '');

    try {
      if (editingPersona?.id) {
        await db.personas.update(editingPersona.id, {
          apellidoNombre: apellidoNombre.trim(),
          dni: cleanDni,
          observaciones: observaciones.trim(),
          delegacionId: editingPersona.delegacionId || delegacionId || 1
        });
      } else {
        await db.personas.add({
          apellidoNombre: apellidoNombre.trim(),
          dni: cleanDni,
          observaciones: observaciones.trim(),
          fechaRegistro: new Date().toLocaleDateString('es-AR'),
          expedientesVinculados: editingPersona?.expedientesVinculados || [],
          delegacionId: delegacionId || 1
        });
      }

      sgpManager.notify();
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Error saving persona:', err);
    }
  };

  const handleDelete = async () => {
    if (deleteTargetId) {
      try {
        await db.personas.delete(deleteTargetId);
        sgpManager.notify();
        setDeleteTargetId(null);
        onRefresh();
      } catch (err) {
        console.error('Error deleting persona:', err);
      }
    }
  };

  const handleExportCsv = () => {
    const headers = ['DNI', 'Apellido y Nombre', 'Expedientes Vinculados', 'Fecha Registro', 'Observaciones / Rol'];
    const rows = filteredPersonas.map((p) => [
      `"${p.dni}"`,
      `"${p.apellidoNombre.replace(/"/g, '""')}"`,
      `"${(p.expedientesVinculados || []).join(' | ')}"`,
      `"${p.fechaRegistro || ''}"`,
      `"${(p.observaciones || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SGP_Personas_Evidencias_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Submodule Breadcrumb Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gradient-to-r from-blue-950 to-slate-900 text-white rounded-2xl border border-blue-900/60 shadow-xs">
        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('expedientes')}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Expedientes</span>
            </button>
          )}
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-600/30 text-blue-300 border border-blue-500/40">
            Submódulo Dependiente
          </span>
          <span className="text-xs font-bold text-slate-200">
            Personas en Evidencias
          </span>
        </div>

        {onNavigate && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('ppi')}
              className="flex items-center gap-1.5 px-3 py-1 bg-sky-950/70 hover:bg-sky-900 text-sky-300 border border-sky-800/60 rounded-xl text-xs font-bold transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Ver Causas PPI →</span>
            </button>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-blue-600" />
            <span>Módulo de Personas & Evidencias Forenses</span>
          </h1>
          <p className="text-xs text-slate-500">
            Base unificada de imputados, investigados, titulares de dispositivos y testigos vinculados a expedientes judiciales
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportIndividualJson('Personas', filteredPersonas)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs"
            title="Exportar archivo JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs"
            title="Exportar archivo CSV para Excel"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>CSV / Excel</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Persona</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Scope Filters with Hide/Show Toggle */}
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
            Mostrando <strong className="text-slate-700 dark:text-slate-200 font-mono">{filteredPersonas.length}</strong> de <span className="font-mono">{unifiedPersonas.length}</span> personas registradas
          </div>
        </div>

        {showFilters && (
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 transition-all">
            <div className="relative sm:col-span-6">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por DNI, apellido, nombre o expediente..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={filterScope}
                onChange={(e) => setFilterScope(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-medium"
              >
                <option value="ALL">Todas las Delegaciones (Global)</option>
                <option value="LOCAL">Solo Mi Delegación</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={filterVinculacion}
                onChange={(e) => setFilterVinculacion(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-medium"
              >
                <option value="TODOS">Todos los Registros</option>
                <option value="CON_EXPEDIENTES">Con Expedientes Vinculados</option>
                <option value="SIN_EXPEDIENTES">Sin Expedientes Asignados</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">D.N.I.</th>
                <th className="py-3 px-4">Apellido y Nombre</th>
                <th className="py-3 px-4">Expedientes / Evidencias Vinculadas</th>
                <th className="py-3 px-4">Fecha Registro</th>
                <th className="py-3 px-4">Observaciones / Rol Procesal</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredPersonas.map((p, idx) => {
                const exps = parseExpedientes(p.expedientesVinculados);

                return (
                  <tr key={p.id ? `db-${p.id}` : `ev-${p.dni}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {p.dni}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{p.apellidoNombre}</span>
                        {!p.id && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                            Evidencia en Caso
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {exps.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {exps.map((exp, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => onNavigate && onNavigate('expedientes')}
                              className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-mono text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                              title="Ver expediente judicial"
                            >
                              {exp}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">Sin vincular</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {p.fechaRegistro || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {p.observaciones || '-'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold mr-3"
                      >
                        {p.id ? 'Editar' : 'Registrar'}
                      </button>
                      {p.id ? (
                        <button
                          onClick={() => setDeleteTargetId(p.id!)}
                          className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
                        >
                          Eliminar
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">En Evidencia</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredPersonas.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-xs italic">
            No se encontraron personas registradas en la base de datos de evidencias.
          </div>
        )}
      </div>

      {/* Modal Nueva / Editar Persona */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingPersona?.id ? 'Editar Persona Investigada' : 'Nueva Persona en Registro'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  D.N.I. (Solo números) (*)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                  placeholder="ej. 34891022"
                  required
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Apellido y Nombre Completo (*)
                </label>
                <input
                  type="text"
                  value={apellidoNombre}
                  onChange={(e) => setApellidoNombre(e.target.value)}
                  placeholder="ej. Medina, Carlos Alberto"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observaciones / Causa de Origen / Rol
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                  placeholder="Imputado, investigado, testigo, titular de línea, secuestro de equipo..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Persona</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Eliminar Registro de Persona"
        message="¿Está seguro de que desea eliminar a esta persona del registro? Los expedientes que ya la hayan referenciado mantendrán su historial."
        danger={true}
      />
    </div>
  );
};
