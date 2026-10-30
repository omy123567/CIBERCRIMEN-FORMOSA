import React, { useState } from 'react';
import { X, AlertTriangle, RotateCcw, ShieldAlert } from 'lucide-react';
import { NumerarioSerie } from '../../types/sgp';

interface ReiniciarSerieModalProps {
  isOpen: boolean;
  onClose: () => void;
  serie: NumerarioSerie;
  totalOccupied: number;
  onConfirmReset: () => Promise<void>;
}

export const ReiniciarSerieModal: React.FC<ReiniciarSerieModalProps> = ({
  isOpen,
  onClose,
  serie,
  totalOccupied,
  onConfirmReset
}) => {
  const [confirmationWord, setConfirmationWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  if (!isOpen) return null;

  const isConfirmed = confirmationWord.trim() === 'REINICIAR';

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) {
      setError('Debe escribir exactamente la palabra "REINICIAR" para autorizar el reseteo.');
      return;
    }

    setIsResetting(true);
    try {
      await onConfirmReset();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al reiniciar la serie.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-red-100 dark:bg-red-950/60 text-red-600 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Reinicio Seguro de Numerario
              </h3>
              <p className="text-xs text-slate-500">
                Serie: <span className="font-bold text-red-600 dark:text-red-400">{serie.nombre}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning card */}
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Atención: Acción Destructiva Irreversible</span>
          </div>
          <p className="leading-relaxed">
            Se liberarán y eliminarán <strong>todos los {totalOccupied} folios ocupados</strong> registrados únicamente en la serie <strong>"{serie.nombre}"</strong>. Las demás series no serán afectadas.
          </p>
        </div>

        {error && (
          <div className="p-2.5 bg-red-100 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-3.5 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Para autorizar, escriba <span className="font-mono text-red-600 dark:text-red-400">REINICIAR</span> en mayúsculas:
            </label>
            <input
              type="text"
              autoFocus
              value={confirmationWord}
              onChange={(e) => {
                setConfirmationWord(e.target.value);
                setError(null);
              }}
              placeholder="Escriba REINICIAR"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white tracking-wider"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || isResetting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-xl shadow-xs transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isResetting ? 'Reiniciando...' : 'Confirmar Reinicio'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
