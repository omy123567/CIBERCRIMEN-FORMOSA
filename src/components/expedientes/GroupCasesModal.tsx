import React, { useState, useEffect } from 'react';
import { X, Layers, Save, CheckSquare } from 'lucide-react';
import { Expediente, DynamicCatalog, EvidencePerson } from '../../types/sgp';

interface GroupCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCases: Expediente[];
  catalogs: DynamicCatalog[];
  onConfirmGroup: (
    newCaseData: Omit<Expediente, 'id'>,
    extractedSummary: string
  ) => void;
}

export const GroupCasesModal: React.FC<GroupCasesModalProps> = ({
  isOpen,
  onClose,
  selectedCases,
  catalogs,
  onConfirmGroup
}) => {
  const juzgados = catalogs.filter((c) => c.category === 'Juzgado').map((c) => c.value);
  const dependencias = catalogs.filter((c) => c.category === 'Dependencias').map((c) => c.value);
  const oficios = catalogs.filter((c) => c.category === 'Oficio').map((c) => c.value);

  const [nroExpediente, setNroExpediente] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear().toString());
  const [oficioOrigen, setOficioOrigen] = useState('');
  const [juzgado, setJuzgado] = useState(juzgados[0] || 'Juzgado de Instrucción y Correccional N° 1 - Clorinda');
  const [dependencia, setDependencia] = useState(dependencias[0] || 'D.D.P.C.L.B. (Delegación Laguna Blanca)');
  const [tipoOficio, setTipoOficio] = useState(oficios[0] || 'Oficio Judicial');
  const [resumen, setResumen] = useState('');
  const [allEvidencePersons, setAllEvidencePersons] = useState<EvidencePerson[]>([]);

  useEffect(() => {
    if (isOpen && selectedCases.length > 0) {
      // 1. Extract all persons and DNIs from selected cases
      const gatheredPersons: EvidencePerson[] = [];
      selectedCases.forEach((c) => {
        if (c.customFieldsJson) {
          try {
            const custom = JSON.parse(c.customFieldsJson);
            if (custom.evidencePersons && Array.isArray(custom.evidencePersons)) {
              custom.evidencePersons.forEach((p: EvidencePerson) => {
                if (p.fullName || p.dni) {
                  gatheredPersons.push(p);
                }
              });
            }
          } catch {
            // ignore
          }
        }
      });

      setAllEvidencePersons(gatheredPersons);

      // 2. Format strict summary string
      let formattedText = `Nómina de personas consolidadas (${gatheredPersons.length}):\n`;
      if (gatheredPersons.length > 0) {
        gatheredPersons.forEach((p, idx) => {
          formattedText += `${idx + 1}. ${p.fullName} (DNI: ${p.dni || 'S/D'})\n`;
        });
      } else {
        formattedText += 'Sin personas registradas previamente en los resguardos individuales.\n';
      }

      formattedText += `\nCasos preliminares agrupados: ${selectedCases.map((c) => `FO-${c.nroExpediente}`).join(', ')}`;
      setResumen(formattedText);
      setNroExpediente('');
      setAnio(new Date().getFullYear().toString());
      setOficioOrigen('');
    }
  }, [isOpen, selectedCases]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!nroExpediente) {
      alert('Por favor ingrese el N° de Expediente asignado por el juzgado.');
      return;
    }

    const today = new Date().toLocaleDateString('es-AR');
    const customFields = {
      isFaltaOficio: false,
      oficioOrigen,
      anioOficio: anio,
      evidencePersons: allEvidencePersons,
      condicionElevacion: 'No entregado' as const
    };

    const newCaseData: Omit<Expediente, 'id'> = {
      anio,
      nroExpediente,
      caratula: `Causa Consolidada s/ ${allEvidencePersons.map((p) => p.fullName).slice(0, 3).join(', ')}`,
      juzgado,
      dependencia,
      tipoOficio,
      tipoRequerimiento: 'Resguardo de Evidencia Digital',
      fechaIngreso: today,
      fechaVencimiento: '',
      plazoDias: 10,
      personalAsignado: selectedCases[0]?.personalAsignado || 'Personal de Turno',
      estado: 'En Trámite',
      prioridad: 'Urgente',
      fechaElevacion: '',
      nroNotaElevacion: '',
      observaciones: resumen,
      customFieldsJson: JSON.stringify(customFields),
      delegacionId: 1
    };

    onConfirmGroup(newCaseData, resumen);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 text-blue-600 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Agrupar Casos en un Único Oficio Formal
              </h3>
              <p className="text-xs text-slate-500">
                Consolidar {selectedCases.length} casos preliminares en un expediente judicial
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Cases pill preview */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Casos a consolidar:
          </span>{' '}
          <span className="text-blue-600 dark:text-blue-400 font-mono">
            {selectedCases.map((c) => `${c.nroExpediente} (${c.tipoRequerimiento})`).join(' • ')}
          </span>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nuevo N° Expediente Judicial (*)
            </label>
            <input
              type="text"
              value={nroExpediente}
              onChange={(e) => setNroExpediente(e.target.value)}
              placeholder="ej. 145/26"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Año (*)
            </label>
            <input
              type="text"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              N° Oficio / Origen
            </label>
            <input
              type="text"
              value={oficioOrigen}
              onChange={(e) => setOficioOrigen(e.target.value)}
              placeholder="ej. OF-512/26"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Juzgado Interviniente
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
        </div>

        {/* Resumen with extracted names and DNIs */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Resumen Consolidado (Nómina de Personas y DNIs extraída automáticamente):
          </label>
          <textarea
            value={resumen}
            onChange={(e) => setResumen(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            * Puede editar el texto antes de confirmar. Los casos individuales preservarán su registro histórico.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Confirmar Agrupación</span>
          </button>
        </div>
      </div>
    </div>
  );
};
