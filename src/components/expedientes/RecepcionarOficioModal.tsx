import React, { useState } from 'react';
import { X, CheckCircle, FileText, Upload, Save, Building, Scale, Calendar } from 'lucide-react';
import { Expediente, DynamicCatalog, ExpedienteCustomFields } from '../../types/sgp';
import { db, sgpManager } from '../../db/dexieDb';

interface RecepcionarOficioModalProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: Expediente | null;
  catalogs: DynamicCatalog[];
  onSuccess: () => void;
}

export const RecepcionarOficioModal: React.FC<RecepcionarOficioModalProps> = ({
  isOpen,
  onClose,
  expediente,
  catalogs,
  onSuccess
}) => {
  const juzgados = catalogs.filter((c) => c.category === 'Juzgado').map((c) => c.value);
  const oficios = catalogs.filter((c) => c.category === 'Oficio').map((c) => c.value);

  const [nroExpediente, setNroExpediente] = useState('');
  const [nroOficio, setNroOficio] = useState('');
  const [anioOficio, setAnioOficio] = useState(new Date().getFullYear().toString());
  const [letrasOficio, setLetrasOficio] = useState('');
  const [tipoOficio, setTipoOficio] = useState(oficios[0] || 'Oficio Judicial');
  const [juzgado, setJuzgado] = useState(juzgados[0] || 'Juzgado de Instrucción y Correccional N° 1 - Clorinda');
  const [imagenOficioUri, setImagenOficioUri] = useState<string>('');

  if (!isOpen || !expediente) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImagenOficioUri(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nroOficio.trim() || !nroExpediente.trim()) {
      alert('Por favor complete el N° de Oficio y N° de Expediente asignados.');
      return;
    }

    let custom: ExpedienteCustomFields = {};
    try {
      custom = expediente.customFieldsJson ? JSON.parse(expediente.customFieldsJson) : {};
    } catch {
      // ignore
    }

    custom.isFaltaOficio = false;
    custom.oficioOrigen = nroOficio.trim();
    custom.anioOficio = anioOficio;
    custom.letrasOficio = letrasOficio.trim();
    if (imagenOficioUri) {
      custom.imagenOficioUri = imagenOficioUri;
    }

    const todayStr = new Date().toLocaleDateString('es-AR');

    const updatedCase: Expediente = {
      ...expediente,
      nroExpediente: nroExpediente.trim(),
      anio: anioOficio,
      juzgado,
      tipoOficio,
      estado: 'En Trámite',
      observaciones: (expediente.observaciones ? expediente.observaciones + '\n' : '') +
        `[OFICIO RECEPCIONADO: Oficio N° ${nroOficio}/${anioOficio} ${letrasOficio} del ${juzgado} ingresado formalmente el ${todayStr}]`,
      customFieldsJson: JSON.stringify(custom)
    };

    await db.expedientes.put(updatedCase);
    sgpManager.notify();
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Recepcionar Oficio Judicial
              </h3>
              <p className="text-xs text-slate-500">
                Formalizar caso preliminar {expediente.nroExpediente} con documento judicial
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Case Info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Requerimiento:</span>
            <span className="font-bold text-slate-900 dark:text-white">{expediente.tipoRequerimiento}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Dependencia Solicitante:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{expediente.dependencia}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Instructor a Cargo:</span>
            <span className="font-mono text-blue-600 dark:text-blue-400">{expediente.personalAsignado}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleConfirm} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                N° de Expediente Asignado (*)
              </label>
              <input
                type="text"
                value={nroExpediente}
                onChange={(e) => setNroExpediente(e.target.value)}
                placeholder="ej. 142/26"
                required
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Oficio (*)
              </label>
              <select
                value={tipoOficio}
                onChange={(e) => setTipoOficio(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {oficios.map((o, i) => (
                  <option key={i} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                N° de Oficio (*)
              </label>
              <input
                type="text"
                value={nroOficio}
                onChange={(e) => setNroOficio(e.target.value)}
                placeholder="ej. 518"
                required
                className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Año (*)
              </label>
              <input
                type="text"
                value={anioOficio}
                onChange={(e) => setAnioOficio(e.target.value)}
                placeholder="2026"
                required
                className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Letras
              </label>
              <input
                type="text"
                value={letrasOficio}
                onChange={(e) => setLetrasOficio(e.target.value)}
                placeholder="SEC. CRIM."
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Juzgado / Fiscalía Emisora (*)
            </label>
            <select
              value={juzgado}
              onChange={(e) => setJuzgado(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {juzgados.map((j, i) => (
                <option key={i} value={j}>{j}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Adjuntar Imagen del Oficio Recepcionado
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Subir Foto del Oficio</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {imagenOficioUri && (
                <span className="text-xs text-emerald-600 font-bold">
                  ✓ Imagen cargada
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Marcar Oficio Recepcionado</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
