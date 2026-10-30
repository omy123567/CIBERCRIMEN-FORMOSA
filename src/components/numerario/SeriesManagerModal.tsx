import React, { useState } from 'react';
import {
  X,
  Layers,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  FolderPlus,
  Palette
} from 'lucide-react';
import { NumerarioSerie } from '../../types/sgp';
import { sgpManager } from '../../db/dexieDb';

interface SeriesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  series: NumerarioSerie[];
  delegacionId: number;
  onRefresh: () => void;
  onSelectSerie: (id: number) => void;
}

const COLOR_OPTIONS = [
  { id: 'blue', label: 'Azul Policial', bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-500' },
  { id: 'indigo', label: 'Índigo Profundo', bg: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-500' },
  { id: 'emerald', label: 'Verde Esmeralda', bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-500' },
  { id: 'amber', label: 'Ámbar Alerta', bg: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-500' },
  { id: 'purple', label: 'Púrpura / Violeta', bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-500' },
  { id: 'rose', label: 'Rosa / Carmín', bg: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-500' },
  { id: 'cyan', label: 'Cian Tecnológico', bg: 'bg-cyan-600', text: 'text-cyan-600', border: 'border-cyan-500' }
];

export const SeriesManagerModal: React.FC<SeriesManagerModalProps> = ({
  isOpen,
  onClose,
  series,
  delegacionId,
  onRefresh,
  onSelectSerie
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSerie, setEditingSerie] = useState<NumerarioSerie | null>(null);

  const [nombre, setNombre] = useState('');
  const [prefijo, setPrefijo] = useState('');
  const [anio, setAnio] = useState('2026');
  const [color, setColor] = useState('blue');
  const [limiteFolios, setLimiteFolios] = useState(1000);
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const openCreate = () => {
    setEditingSerie(null);
    setNombre('');
    setPrefijo('');
    setAnio('2026');
    setColor('blue');
    setLimiteFolios(1000);
    setDescripcion('');
    setError(null);
    setIsFormOpen(true);
  };

  const openEdit = (s: NumerarioSerie) => {
    setEditingSerie(s);
    setNombre(s.nombre);
    setPrefijo(s.prefijo);
    setAnio(s.anio || '2026');
    setColor(s.color || 'blue');
    setLimiteFolios(s.limiteFolios || 1000);
    setDescripcion(s.descripcion || '');
    setError(null);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim() || !prefijo.trim()) {
      setError('Nombre y Prefijo son obligatorios.');
      return;
    }

    try {
      if (editingSerie && editingSerie.id) {
        await sgpManager.updateSerieNumerario(editingSerie.id, {
          nombre: nombre.trim(),
          prefijo: prefijo.trim().toUpperCase(),
          anio: anio.trim(),
          color,
          limiteFolios: Number(limiteFolios) || 1000,
          descripcion: descripcion.trim()
        });
      } else {
        const newId = await sgpManager.addSerieNumerario({
          nombre: nombre.trim(),
          prefijo: prefijo.trim().toUpperCase(),
          anio: anio.trim(),
          color,
          limiteFolios: Number(limiteFolios) || 1000,
          columnas: 20,
          delegacionId,
          descripcion: descripcion.trim()
        });
        onSelectSerie(newId);
      }

      setIsFormOpen(false);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar la serie.');
    }
  };

  const handleDelete = async (id: number, serieName: string) => {
    if (series.length <= 1) {
      alert('Debe mantenerse al menos una serie de numerario en el sistema.');
      return;
    }
    if (confirm(`¿Confirma eliminar la serie "${serieName}" y todos sus folios registrados? Esta acción no se puede deshacer.`)) {
      await sgpManager.deleteSerieNumerario(id);
      onRefresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Administración de Series de Numerario
              </h3>
              <p className="text-xs text-slate-500">
                Gestione los cuadernos y series independientes de folios (Oficios, Memos, Circulares, etc.)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action button to open create form */}
        {!isFormOpen && (
          <div className="flex justify-end">
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nueva Serie de Numerario</span>
            </button>
          </div>
        )}

        {/* Form Modal Sub-panel */}
        {isFormOpen && (
          <form onSubmit={handleSave} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {editingSerie ? `Editar Serie: ${editingSerie.nombre}` : 'Registrar Nueva Serie'}
              </span>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancelar
              </button>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 text-red-600 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre de la Serie *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="ej. Oficios Vicedirección"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Prefijo / Siglas *
                </label>
                <input
                  type="text"
                  required
                  value={prefijo}
                  onChange={(e) => setPrefijo(e.target.value)}
                  placeholder="ej. OF-VICE"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Año Oficial
                </label>
                <input
                  type="text"
                  required
                  value={anio}
                  onChange={(e) => setAnio(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Límite Inicial de Folios
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  required
                  value={limiteFolios}
                  onChange={(e) => setLimiteFolios(parseInt(e.target.value, 10) || 1000)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Color Palette */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-blue-500" />
                <span>Color Distintivo de la Serie</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      color === c.id
                        ? `${c.border} bg-white dark:bg-slate-900 font-bold shadow-xs ring-2 ring-blue-500/30`
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${c.bg}`} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Descripción / Finalidad
              </label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="ej. Control de correspondencia oficial emitida a juzgados"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
              >
                {editingSerie ? 'Guardar Cambios' : 'Crear Serie'}
              </button>
            </div>
          </form>
        )}

        {/* List of existing series */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {series.map((s) => {
            const colorObj = COLOR_OPTIONS.find(c => c.id === s.color) || COLOR_OPTIONS[0];

            return (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-3.5 h-3.5 rounded-full ${colorObj.bg} shrink-0 ring-2 ring-white dark:ring-slate-900`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {s.nombre}
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                        {s.prefijo}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Año {s.anio || '2026'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-sm">
                      {s.descripcion || `Numerario 1 al ${s.limiteFolios || 1000}`} • {s.columnas || 20} columnas
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      onSelectSerie(s.id!);
                      onClose();
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 dark:border-blue-900"
                  >
                    Ver Cuadrícula
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Editar serie"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => s.id && handleDelete(s.id, s.nombre)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                    title="Eliminar serie"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
