import React, { useState } from 'react';
import {
  X,
  FileText,
  Clock,
  User,
  Building,
  Trash2,
  Edit2,
  Save,
  Check,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';
import { FolioRegistro, NumerarioSerie } from '../../types/sgp';

interface DetalleFolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  folio: FolioRegistro;
  serie: NumerarioSerie;
  canDelete?: boolean;
  onUpdateFolio: (id: number, changes: Partial<FolioRegistro>) => Promise<void>;
  onLiberarFolio: (id: number, liberarRangoCompleto: boolean) => Promise<void>;
}

export const DetalleFolioModal: React.FC<DetalleFolioModalProps> = ({
  isOpen,
  onClose,
  folio,
  serie,
  canDelete = true,
  onUpdateFolio,
  onLiberarFolio
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [asunto, setAsunto] = useState(folio.asunto);
  const [destinatario, setDestinatario] = useState(folio.destinatario);
  const [solicitante, setSolicitante] = useState(folio.solicitante || '');
  const [observaciones, setObservaciones] = useState(folio.observaciones || '');
  
  const [showLiberarConfirm, setShowLiberarConfirm] = useState(false);
  const [liberarTodoElRango, setLiberarTodoElRango] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isRange = Boolean(folio.rangoInicio && folio.rangoFin && folio.rangoInicio !== folio.rangoFin);

  const handleSaveEdit = async () => {
    if (!asunto.trim() || !destinatario.trim()) return;
    setIsSubmitting(true);
    try {
      await onUpdateFolio(folio.id!, {
        asunto: asunto.trim(),
        destinatario: destinatario.trim(),
        solicitante: solicitante.trim(),
        observaciones: observaciones.trim()
      });
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmLiberar = async () => {
    setIsSubmitting(true);
    try {
      await onLiberarFolio(folio.id!, isRange && liberarTodoElRango);
      setShowLiberarConfirm(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 text-red-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Ficha Oficial del Folio N° {folio.numero}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800">
                  OCUPADO
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Serie: {serie.nombre} ({serie.prefijo})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlighted Banner */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Carátula Oficial:</span>
            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
              {folio.caratula}
            </span>
          </div>

          {isRange && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
              <Layers className="w-3.5 h-3.5" />
              <span>
                Asignado como parte del Bloque Continuo: Folios {folio.rangoInicio} al {folio.rangoFin}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Registrado el {folio.fecha} a las {folio.hora} hs</span>
            </div>
            {folio.usuarioAsigno && (
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Por: @{folio.usuarioAsigno}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Details / Edit Mode */}
        {isEditing ? (
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Asunto / Objeto *
              </label>
              <textarea
                rows={2}
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Destinatario / Organismo *
              </label>
              <input
                type="text"
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Iniciador / Solicitante
              </label>
              <input
                type="text"
                value={solicitante}
                onChange={(e) => setSolicitante(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Observaciones
              </label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div>
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Tipo de Documento:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200">{folio.tipoDocumento}</span>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Asunto / Objeto:</span>
              <p className="text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap mt-0.5">
                {folio.asunto}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="font-bold text-slate-500 uppercase block text-[10px]">Destinatario:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{folio.destinatario}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 uppercase block text-[10px]">Iniciador:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{folio.solicitante || '-'}</span>
              </div>
            </div>

            {folio.observaciones && (
              <div className="pt-1">
                <span className="font-bold text-slate-500 uppercase block text-[10px]">Observaciones:</span>
                <span className="text-slate-600 dark:text-slate-400 italic">{folio.observaciones}</span>
              </div>
            )}
          </div>
        )}

        {/* Liberar Folio Confirmation Panel */}
        {showLiberarConfirm && (
          <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-2xl space-y-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-red-900 dark:text-red-200 block">
                  ¿Confirmar Liberación de Folio?
                </span>
                <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5">
                  Esta acción eliminará el registro del trámite y el folio volverá inmediatamente a estar <strong>LIBRE / DISPONIBLE</strong> para una nueva asignación.
                </p>
              </div>
            </div>

            {isRange && (
              <div className="pt-2 border-t border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-300">
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={liberarTodoElRango}
                    onChange={(e) => setLiberarTodoElRango(e.target.checked)}
                    className="rounded border-red-300 text-red-600"
                  />
                  <span>Liberar todo el bloque de folios ({folio.rangoInicio} al {folio.rangoFin})</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLiberarConfirm(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmLiberar}
                className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
              >
                {isSubmitting ? 'Liberando...' : 'Sí, Liberar Folio'}
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <div>
            {!showLiberarConfirm && canDelete && (
              <button
                type="button"
                onClick={() => setShowLiberarConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Liberar Folio</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar Edición
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Cambios</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 dark:border-blue-900"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Modificar Datos</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl"
                >
                  Cerrar
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
