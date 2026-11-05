import React, { useState } from 'react';
import { X, Wrench, Plus, Save, Trash2, DollarSign } from 'lucide-react';
import { Movil, Reparacion } from '../../types/sgp';

interface ReparacionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  movil: Movil;
  reparaciones: Reparacion[];
  onSaveReparacion: (rep: Reparacion) => void;
  onDeleteReparacion: (id: number) => void;
}

export const ReparacionesModal: React.FC<ReparacionesModalProps> = ({
  isOpen,
  onClose,
  movil,
  reparaciones,
  onSaveReparacion,
  onDeleteReparacion
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [fecha, setFecha] = useState(new Date().toLocaleDateString('es-AR'));
  const [tallerMecanico, setTallerMecanico] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [repuestosCambiados, setRepuestosCambiados] = useState('');
  const [costoTotal, setCostoTotal] = useState<number>(0);
  const [kmMomento, setKmMomento] = useState(movil.kmActual);
  const [observaciones, setObservaciones] = useState('');

  if (!isOpen) return null;

  const totalCostos = reparaciones.reduce((sum, r) => sum + (Number(r.costoTotal) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nuevaReparacion: Reparacion = {
      movilId: movil.id || 0,
      fecha,
      tallerMecanico: tallerMecanico || 'Taller Central Policial',
      descripcion,
      repuestosCambiados,
      costoTotal: Number(costoTotal) || 0,
      kmMomento: kmMomento || movil.kmActual,
      observaciones,
      delegacionId: movil.delegacionId || 1
    };

    onSaveReparacion(nuevaReparacion);
    setShowAddForm(false);
    setDescripcion('');
    setRepuestosCambiados('');
    setCostoTotal(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 text-blue-600 rounded-lg">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Historial de Reparaciones Mecánicas
              </h2>
              <p className="text-xs text-slate-500">
                Móvil {movil.identificador} • Dominio: {movil.dominio} • {movil.marca} {movil.modelo}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Summary Balance */}
          <div className="flex items-center justify-between p-4 bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/60">
            <div>
              <span className="text-xs text-slate-500">Total Intervenciones:</span>
              <p className="text-base font-bold text-slate-900 dark:text-white">{reparaciones.length} trabajos</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Inversión Total en Reparaciones:</span>
              <p className="text-lg font-extrabold text-blue-700 dark:text-blue-400 font-mono">
                $ {totalCostos.toLocaleString('es-AR')}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Detalle de Trabajos y Mantenimiento
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Registrar Reparación</span>
            </button>
          </div>

          {/* Form to add repair */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-blue-200 dark:border-blue-900/60 space-y-3 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Fecha (DD/MM/AAAA)</label>
                  <input
                    type="text"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Km al Ingreso</label>
                  <input
                    type="text"
                    value={kmMomento}
                    onChange={(e) => setKmMomento(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Costo Total ($)</label>
                  <input
                    type="number"
                    value={costoTotal}
                    onChange={(e) => setCostoTotal(Number(e.target.value))}
                    required
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Taller Mecánico / Proveedor</label>
                <input
                  type="text"
                  value={tallerMecanico}
                  onChange={(e) => setTallerMecanico(e.target.value)}
                  placeholder="ej. Taller Mecánico Central Laguna Blanca"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Descripción de los Trabajos</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={2}
                  placeholder="Detalle de fallas corregidas y reparaciones..."
                  required
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Repuestos Cambiados</label>
                <input
                  type="text"
                  value={repuestosCambiados}
                  onChange={(e) => setRepuestosCambiados(e.target.value)}
                  placeholder="Pastillas de freno, filtros, amortiguadores..."
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Reparación</span>
                </button>
              </div>
            </form>
          )}

          {/* List of repairs */}
          <div className="space-y-3">
            {reparaciones.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                No se registran intervenciones mecánicas para este móvil.
              </div>
            ) : (
              reparaciones.map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white font-mono text-xs">{r.fecha}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 font-mono text-xs">{r.kmMomento} Km</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-600 font-mono text-xs">
                        $ {r.costoTotal.toLocaleString('es-AR')}
                      </span>
                      {r.id && (
                        <button
                          onClick={() => onDeleteReparacion(r.id!)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Eliminar reparación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                    {r.descripcion}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>Taller: {r.tallerMecanico}</span>
                    {r.repuestosCambiados && (
                      <span className="truncate max-w-xs">Repuestos: {r.repuestosCambiados}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
