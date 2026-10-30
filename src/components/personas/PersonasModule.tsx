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
  Save
} from 'lucide-react';
import { PersonaInvestigada, Expediente } from '../../types/sgp';
import { db, sgpManager } from '../../db/dexieDb';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { exportIndividualJson } from '../../utils/sgpBackupZip';

interface PersonasModuleProps {
  personas?: PersonaInvestigada[];
  expedientes?: Expediente[];
  onRefresh: () => void;
}

export const PersonasModule: React.FC<PersonasModuleProps> = ({
  personas = [],
  expedientes = [],
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<PersonaInvestigada | null>(null);

  // Form states
  const [apellidoNombre, setApellidoNombre] = useState('');
  const [dni, setDni] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const filteredPersonas = useMemo(() => {
    if (!searchTerm.trim()) return personas;
    const q = searchTerm.toLowerCase().trim();
    return personas.filter(
      (p) =>
        p.apellidoNombre.toLowerCase().includes(q) ||
        p.dni.includes(q) ||
        (p.observaciones || '').toLowerCase().includes(q) ||
        (p.expedientesVinculados || []).some((exp) => exp.toLowerCase().includes(q))
    );
  }, [personas, searchTerm]);

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

    if (editingPersona?.id) {
      await db.personas.update(editingPersona.id, {
        apellidoNombre: apellidoNombre.trim(),
        dni: cleanDni,
        observaciones: observaciones.trim()
      });
    } else {
      await db.personas.add({
        apellidoNombre: apellidoNombre.trim(),
        dni: cleanDni,
        observaciones: observaciones.trim(),
        fechaRegistro: new Date().toLocaleDateString('es-AR'),
        expedientesVinculados: [],
        delegacionId: 1
      });
    }

    sgpManager.notify();
    setIsModalOpen(false);
    onRefresh();
  };

  const handleDelete = async () => {
    if (deleteTargetId) {
      await db.personas.delete(deleteTargetId);
      sgpManager.notify();
      setDeleteTargetId(null);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-blue-600" />
            <span>Módulo de Personas & Evidencias Forenses</span>
          </h1>
          <p className="text-xs text-slate-500">
            Registro unificado de imputados, testigos y titulares en resguardos de evidencia para búsqueda rápida y reutilización
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportIndividualJson('Personas', personas)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar JSON</span>
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

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por DNI, apellido, nombre o expediente vinculado..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>
        <span className="text-xs font-bold text-slate-500 font-mono pr-2">
          {filteredPersonas.length} registros
        </span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">D.N.I.</th>
                <th className="py-3 px-4">Apellido y Nombre</th>
                <th className="py-3 px-4">Expedientes Vinculados</th>
                <th className="py-3 px-4">Fecha Alta</th>
                <th className="py-3 px-4">Observaciones / Rol</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredPersonas.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                    {p.dni}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {p.apellidoNombre}
                  </td>
                  <td className="py-3 px-4">
                    {p.expedientesVinculados && p.expedientesVinculados.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.expedientesVinculados.map((exp, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-mono text-[10px] font-bold"
                          >
                            {exp}
                          </span>
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
                      Editar
                    </button>
                    <button
                      onClick={() => p.id && setDeleteTargetId(p.id)}
                      className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPersonas.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-xs italic">
            No se encontraron personas registradas en la base de datos.
          </div>
        )}
      </div>

      {/* Modal Nueva / Editar Persona */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingPersona ? 'Editar Persona Investigada' : 'Nueva Persona en Registro'}
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
                  placeholder="Imputado, testigo, titular de línea, secuestro..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500"
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
