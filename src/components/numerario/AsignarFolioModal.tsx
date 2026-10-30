import React, { useState, useEffect } from 'react';
import { X, FileText, AlertTriangle, Layers, Calendar, User, Building, Check, Sparkles } from 'lucide-react';
import { NumerarioSerie, FolioRegistro, SisPolUser } from '../../types/sgp';

interface AsignarFolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  serie: NumerarioSerie;
  initialNumero?: number;
  initialRangoFin?: number;
  occupiedNumbers: Set<number>;
  currentUser: SisPolUser;
  onSave: (folios: Omit<FolioRegistro, 'id'>[]) => Promise<void>;
}

const TIPO_DOC_OPTIONS = [
  { label: 'Oficio Judicial', prefix: 'OF-JUD' },
  { label: 'Oficio Policial', prefix: 'OF-POL' },
  { label: 'Memorándum Interno', prefix: 'MEMO' },
  { label: 'Expediente / Actuación', prefix: 'EXP' },
  { label: 'Circular Reglamentaria', prefix: 'CIRC' },
  { label: 'Radiomensaje Policial', prefix: 'RAD' },
  { label: 'Nota Externa / Requerimiento', prefix: 'NOTA' },
  { label: 'Cédula de Notificación', prefix: 'CED' },
  { label: 'Dictamen Pericial Forense', prefix: 'DICT' }
];

export const AsignarFolioModal: React.FC<AsignarFolioModalProps> = ({
  isOpen,
  onClose,
  serie,
  initialNumero = 1,
  initialRangoFin,
  occupiedNumbers,
  currentUser,
  onSave
}) => {
  const [isRange, setIsRange] = useState<boolean>(Boolean(initialRangoFin && initialRangoFin > initialNumero));
  const [numeroDesde, setNumeroDesde] = useState<number>(initialNumero);
  const [numeroHasta, setNumeroHasta] = useState<number>(initialRangoFin || initialNumero);
  
  const [tipoDocumento, setTipoDocumento] = useState<string>(TIPO_DOC_OPTIONS[0].label);
  const [asunto, setAsunto] = useState<string>('');
  const [destinatario, setDestinatario] = useState<string>('');
  const [solicitante, setSolicitante] = useState<string>(currentUser.nombreApellido || '');
  const [observaciones, setObservaciones] = useState<string>('');
  const [anio, setAnio] = useState<string>(serie.anio || '2026');
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setNumeroDesde(initialNumero);
    if (initialRangoFin && initialRangoFin > initialNumero) {
      setIsRange(true);
      setNumeroHasta(initialRangoFin);
    } else {
      setIsRange(false);
      setNumeroHasta(initialNumero);
    }
    setError(null);
  }, [initialNumero, initialRangoFin, isOpen]);

  if (!isOpen) return null;

  // Compute collision list
  const start = isRange ? Math.min(numeroDesde, numeroHasta) : numeroDesde;
  const end = isRange ? Math.max(numeroDesde, numeroHasta) : numeroDesde;
  const rangeNumbers: number[] = [];
  for (let n = start; n <= end; n++) {
    rangeNumbers.push(n);
  }

  const collisions = rangeNumbers.filter(n => occupiedNumbers.has(n));
  const hasCollisions = collisions.length > 0;

  // Live Caratula Code Preview
  const previewCaratula = isRange && start !== end
    ? `${serie.nombre} N° ${start}/${anio} a ${end}/${anio} (${end - start + 1} Folios)`
    : `${serie.nombre} N° ${start}/${anio}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!asunto.trim()) {
      setError('El Asunto / Objeto del trámite es obligatorio.');
      return;
    }

    if (!destinatario.trim()) {
      setError('El Destinatario u Organismo es obligatorio.');
      return;
    }

    if (start < 1) {
      setError('El número de folio debe ser mayor o igual a 1.');
      return;
    }

    if (hasCollisions) {
      setError(`No es posible asignar: los siguientes folios ya están ocupados: ${collisions.slice(0, 8).join(', ')}${collisions.length > 8 ? '...' : ''}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const fechaStr = now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const horaStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      const rangoId = isRange && start !== end ? `rng-${Date.now()}-${start}-${end}` : undefined;

      const foliosToInsert: Omit<FolioRegistro, 'id'>[] = rangeNumbers.map((num, idx) => ({
        serieId: serie.id!,
        numero: num,
        rangoId,
        rangoInicio: isRange && start !== end ? start : undefined,
        rangoFin: isRange && start !== end ? end : undefined,
        caratula: isRange && start !== end 
          ? `${serie.nombre} N° ${start}/${anio} a ${end}/${anio} [Pieza ${idx + 1}/${rangeNumbers.length}]`
          : `${serie.nombre} N° ${num}/${anio}`,
        tipoDocumento,
        asunto: asunto.trim(),
        destinatario: destinatario.trim(),
        solicitante: solicitante.trim(),
        observaciones: observaciones.trim(),
        fecha: fechaStr,
        hora: horaStr,
        usuarioAsigno: currentUser.username,
        delegacionId: serie.delegacionId
      }));

      await onSave(foliosToInsert);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al asignar el folio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Asignación Oficial de Numerario
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Serie activa: <span className="font-bold text-blue-600 dark:text-blue-400">{serie.nombre}</span> ({serie.prefijo})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Caratula Code Badge */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-slate-600 dark:text-slate-300">Carátula Oficial Resultante:</span>
          </div>
          <span className="font-mono font-black text-xs text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl shadow-xs border border-blue-200 dark:border-blue-800">
            {previewCaratula}
          </span>
        </div>

        {/* Prevent Collision Alert */}
        {hasCollisions && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-900 rounded-2xl flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">¡Conflicto de Folios Ocupados!</span>
              <span>
                Los números {collisions.join(', ')} ya fueron asignados en esta serie. Elija números libres para continuar.
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Mode Switch: Individual vs Range */}
          <div className="flex items-center justify-between p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setIsRange(false);
                setNumeroHasta(numeroDesde);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                !isRange
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Folio Individual
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRange(true);
                if (numeroHasta <= numeroDesde) setNumeroHasta(numeroDesde + 1);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                isRange
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Rango Continuo (Bloque de Folios)
            </button>
          </div>

          {/* Number Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isRange ? 'Folio Desde *' : 'Número de Folio *'}
              </label>
              <input
                type="number"
                min="1"
                required
                value={numeroDesde}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 1;
                  setNumeroDesde(val);
                  if (!isRange) setNumeroHasta(val);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>

            {isRange ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Folio Hasta *
                </label>
                <input
                  type="number"
                  min={numeroDesde}
                  required
                  value={numeroHasta}
                  onChange={(e) => setNumeroHasta(parseInt(e.target.value, 10) || numeroDesde)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cantidad a Asignar
                </label>
                <input
                  type="text"
                  disabled
                  value="1 Folio Único"
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 font-semibold"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Año Oficial
              </label>
              <input
                type="text"
                required
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Tipo de Documento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tipo / Categoría de Trámite
            </label>
            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
            >
              {TIPO_DOC_OPTIONS.map((t) => (
                <option key={t.label} value={t.label}>
                  {t.label} [{t.prefix}]
                </option>
              ))}
            </select>
          </div>

          {/* Asunto / Objeto */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Asunto / Objeto del Trámite *
            </label>
            <textarea
              rows={2}
              required
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder="Describa brevemente el objeto del documento (ej. Remisión de pericia balística en Causa N° 145/26)"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Destinatario & Solicitante */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Destinatario / Organismo *
              </label>
              <input
                type="text"
                required
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
                placeholder="ej. Juzgado de Instrucción N° 1"
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
                placeholder="ej. Comisario Inspector Gómez"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Observaciones Adicionales
            </label>
            <input
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Datos de entrega, fojas anexas o notas de recibo"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || hasCollisions}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md transition-all active:scale-95"
            >
              {isSubmitting ? 'Asignando...' : isRange ? `Confirmar Rango (${rangeNumbers.length} Folios)` : 'Confirmar Folio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
