import React, { useState, useEffect } from 'react';
import { X, Layers, Save, Plus, Trash2, Search, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Expediente, DynamicCatalog, EvidencePerson, Personal, PersonaInvestigada, ExpedienteCustomFields } from '../../types/sgp';
import { sgpManager } from '../../db/dexieDb';

interface CombinarExpedientesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCases: Expediente[];
  catalogs: DynamicCatalog[];
  personalList: Personal[];
  onConfirmCombine: (
    consolidatedCase: Omit<Expediente, 'id'>,
    sourceCaseIds: number[],
    personsToSave: PersonaInvestigada[]
  ) => void;
}

export const CombinarExpedientesModal: React.FC<CombinarExpedientesModalProps> = ({
  isOpen,
  onClose,
  selectedCases,
  catalogs,
  personalList,
  onConfirmCombine
}) => {
  const juzgados = catalogs.filter((c) => c.category === 'Juzgado').map((c) => c.value);
  const dependencias = catalogs.filter((c) => c.category === 'Dependencias').map((c) => c.value);
  const requerimientos = catalogs.filter((c) => c.category === 'Requerimiento').map((c) => c.value);
  const oficios = catalogs.filter((c) => c.category === 'Oficio').map((c) => c.value);
  const jerarquias = catalogs.filter((c) => c.category === 'Jerarquias').map((c) => c.value);

  // Form Fields - Same as registering an individual case
  const [personalACargo, setPersonalACargo] = useState('');
  const [dependenciaSolicitante, setDependenciaSolicitante] = useState('');
  const [nroExpediente, setNroExpediente] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear().toString());
  const [fechaExpediente, setFechaExpediente] = useState(new Date().toLocaleDateString('es-AR'));
  const [tipoOficio, setTipoOficio] = useState(oficios[0] || 'Oficio Judicial');
  const [oficioOrigen, setOficioOrigen] = useState('');
  const [anioOficio, setAnioOficio] = useState(new Date().getFullYear().toString());
  const [letrasOficio, setLetrasOficio] = useState('');
  const [dependencia, setDependencia] = useState(dependencias[0] || 'D.D.P.C.L.B. (Delegación Laguna Blanca)');
  const [juzgado, setJuzgado] = useState(juzgados[0] || 'Juzgado de Instrucción y Correccional N° 1 - Clorinda');
  const [tipoRequerimiento, setTipoRequerimiento] = useState(requerimientos[0] || 'Resguardo de Evidencia Digital');
  const [resumen, setResumen] = useState('');
  const [isPPI, setIsPPI] = useState(false);
  const [ppiJerarquia, setPpiJerarquia] = useState('');
  const [ppiPlaza, setPpiPlaza] = useState('');
  const [ppiApellidoNombre, setPpiApellidoNombre] = useState('');
  const [ppiDni, setPpiDni] = useState('');
  const [ppiDetalles, setPpiDetalles] = useState('');
  const [seHizoTareaRealizada, setSeHizoTareaRealizada] = useState(false);
  const [resumenTareaRealizada, setResumenTareaRealizada] = useState('');

  // Consolidated & Editable Evidence Persons list
  const [evidencePersons, setEvidencePersons] = useState<EvidencePerson[]>([]);

  // Function to build/update summary from persons and combined tasks
  const buildSummaryFromData = (persons: EvidencePerson[]) => {
    let text = `Causa Unificada y Consolidada (${selectedCases.length} expedientes/casos combinados):\n\n`;

    // Tasks and details from grouped cases
    text += `1. REGISTROS FUSIONADOS:\n`;
    selectedCases.forEach((c, idx) => {
      text += ` • [Caso ${idx + 1}] Exp/Oficio: ${c.nroExpediente}/${c.anio} - ${c.tipoRequerimiento} (${c.dependencia})\n`;
      if (c.caratula && c.caratula !== c.tipoRequerimiento) {
        text += `   Detalle previo: ${c.caratula}\n`;
      }
    });

    text += `\n2. NÓMINA TOTAL DE PERSONAS E IMPUTADOS VINCULADOS (${persons.length}):\n`;
    if (persons.length > 0) {
      persons.forEach((p, idx) => {
        text += ` • ${idx + 1}. ${p.fullName || 'S/N'} - DNI: ${p.dni || 'S/D'}\n`;
      });
    } else {
      text += ` • Sin personas individualizadas en las actuaciones preliminares.\n`;
    }

    return text;
  };

  useEffect(() => {
    if (isOpen && selectedCases.length > 0) {
      // 1. Gather all persons without duplicates (by DNI or normalized name)
      const personMap = new Map<string, EvidencePerson>();
      let foundPPI = false;
      let foundTarea = false;
      let ppiJ = '';
      let ppiP = '';
      let ppiA = '';
      let ppiD = '';
      let ppiDet = '';

      selectedCases.forEach((c) => {
        if (c.customFieldsJson) {
          try {
            const custom: ExpedienteCustomFields = JSON.parse(c.customFieldsJson);
            if (custom.isPPI) {
              foundPPI = true;
              if (custom.ppiJerarquia && !ppiJ) ppiJ = custom.ppiJerarquia;
              if (custom.ppiPlaza && !ppiP) ppiP = custom.ppiPlaza;
              if (custom.ppiApellidoNombre && !ppiA) ppiA = custom.ppiApellidoNombre;
              if (custom.ppiDni && !ppiD) ppiD = custom.ppiDni;
              if (custom.ppiDetalles && !ppiDet) ppiDet = custom.ppiDetalles;
            }
            if (custom.seHizoTareaRealizada) foundTarea = true;

            if (custom.evidencePersons && Array.isArray(custom.evidencePersons)) {
              custom.evidencePersons.forEach((p) => {
                const key = p.dni ? p.dni.replace(/\D/g, '') : p.fullName.toLowerCase().trim();
                if (key && !personMap.has(key)) {
                  personMap.set(key, { ...p, id: p.id || `ev_${Date.now()}_${Math.random()}` });
                }
              });
            }
          } catch {
            // ignore
          }
        }
      });

      const gathered = Array.from(personMap.values());
      setEvidencePersons(gathered);

      // Default fields from primary or first case
      const first = selectedCases[0];
      let firstCustom: any = {};
      try {
        firstCustom = first.customFieldsJson ? JSON.parse(first.customFieldsJson) : {};
      } catch {
        // ignore
      }

      setPersonalACargo(firstCustom.personalACargo || first.personalAsignado || personalList[0]?.apellidoNombre || '');
      setDependenciaSolicitante(firstCustom.dependenciaSolicitante || first.dependencia || dependencias[0] || '');
      setNroExpediente(first.nroExpediente.startsWith('FO-') ? '' : first.nroExpediente);
      setAnio(first.anio || new Date().getFullYear().toString());
      setJuzgado(first.juzgado || juzgados[0]);
      setDependencia(first.dependencia || dependencias[0]);
      setTipoOficio(first.tipoOficio || oficios[0]);
      setTipoRequerimiento(first.tipoRequerimiento || 'Resguardo de Evidencia Digital');
      setOficioOrigen(firstCustom.oficioOrigen || '');
      setLetrasOficio(firstCustom.letrasOficio || '');
      setIsPPI(foundPPI);
      setPpiJerarquia(ppiJ || jerarquias[0] || 'Sargento');
      setPpiPlaza(ppiP || '');
      setPpiApellidoNombre(ppiA || '');
      setPpiDni(ppiD || '');
      setPpiDetalles(ppiDet || '');
      setSeHizoTareaRealizada(foundTarea);

      // Auto-generate summary
      const generatedSummary = buildSummaryFromData(gathered);
      setResumen(generatedSummary);
    }
  }, [isOpen, selectedCases]);

  if (!isOpen) return null;

  const handleAddPerson = () => {
    setEvidencePersons((prev) => [
      ...prev,
      { id: `ev_${Date.now()}_${Math.random()}`, fullName: '', dni: '' }
    ]);
  };

  const handleUpdatePerson = (idx: number, field: 'fullName' | 'dni', val: string) => {
    setEvidencePersons((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: field === 'dni' ? val.replace(/\D/g, '') : val };
      return copy;
    });
  };

  const handleSearchPersonDni = async (idx: number) => {
    const p = evidencePersons[idx];
    if (!p.dni) return;
    const found = await sgpManager.findPersonaByDni(p.dni);
    if (found) {
      handleUpdatePerson(idx, 'fullName', found.apellidoNombre);
    } else {
      alert(`No se encontró persona con DNI ${p.dni} en el registro de Personas. Ingrese el Apellido y Nombre para darlo de alta.`);
    }
  };

  const handleRemovePerson = (idx: number) => {
    setEvidencePersons((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRefreshSummaryWithPersons = () => {
    const updated = buildSummaryFromData(evidencePersons);
    setResumen(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nroExpediente.trim()) {
      alert('Por favor ingrese el N° de Expediente asignado para la causa consolidada.');
      return;
    }

    if (isPPI) {
      if (!ppiJerarquia.trim()) {
        alert('Para causas con Personal Policial Involucrado (PPI), debe ingresar la Jerarquía del efectivo.');
        return;
      }
      if (!ppiPlaza.trim()) {
        alert('Para causas con Personal Policial Involucrado (PPI), debe ingresar la Plaza / Legajo policial.');
        return;
      }
      if (!ppiApellidoNombre.trim()) {
        alert('Para causas con Personal Policial Involucrado (PPI), debe ingresar el Apellido y Nombre del efectivo.');
        return;
      }
    }

    const customFields: ExpedienteCustomFields = {
      personalACargo,
      dependenciaSolicitante,
      isFaltaOficio: false,
      oficioOrigen,
      anioOficio,
      letrasOficio,
      isPPI,
      ppiJerarquia: isPPI ? ppiJerarquia.trim() : undefined,
      ppiPlaza: isPPI ? ppiPlaza.trim() : undefined,
      ppiApellidoNombre: isPPI ? ppiApellidoNombre.trim() : undefined,
      ppiDni: isPPI ? ppiDni.trim() : undefined,
      ppiDetalles: isPPI ? ppiDetalles.trim() : undefined,
      seHizoTareaRealizada,
      resumenTareaRealizada: seHizoTareaRealizada ? resumenTareaRealizada : undefined,
      evidencePersons,
      condicionElevacion: 'No entregado',
      groupedCaseIds: selectedCases.map((c) => c.id!).filter(Boolean)
    };

    const consolidated: Omit<Expediente, 'id'> = {
      nroExpediente: nroExpediente.trim(),
      anio: anio.trim() || new Date().getFullYear().toString(),
      caratula: `Causa Consolidada: ${resumen.split('\n')[0] || nroExpediente}`,
      juzgado,
      dependencia,
      tipoOficio,
      tipoRequerimiento,
      fechaIngreso: fechaExpediente || new Date().toLocaleDateString('es-AR'),
      fechaVencimiento: '',
      plazoDias: 10,
      personalAsignado: personalACargo,
      estado: 'En Trámite',
      prioridad: 'Urgente',
      fechaElevacion: '',
      nroNotaElevacion: '',
      observaciones: resumen,
      customFieldsJson: JSON.stringify(customFields),
      delegacionId: 1
    };

    const sourceIds = selectedCases.map((c) => c.id!).filter(Boolean);
    const personsToSave: PersonaInvestigada[] = evidencePersons.map((p) => ({
      apellidoNombre: p.fullName,
      dni: p.dni
    }));

    onConfirmCombine(consolidated, sourceIds, personsToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 text-blue-600 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Combinar y Unificar Expedientes Registrados
              </h2>
              <p className="text-xs text-slate-500">
                Fusión en un único expediente judicial y depuración de registros redundantes en la base de datos
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Fusion Notice Banner */}
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <span className="font-bold block">
                Unificación en un Único Registro Oficial
              </span>
              <p>
                Se combinarán <strong>{selectedCases.length} casos</strong> ({selectedCases.map((c) => c.nroExpediente).join(', ')}). Al confirmar, el sistema guardará este expediente consolidado y <strong>depurará automáticamente los registros de origen</strong> para evitar duplicidad.
              </p>
            </div>
          </div>

          {/* Section: A Cargo y Solicitante */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Personal a Cargo de la Instrucción (*)
              </label>
              <input
                type="text"
                list="combine-personal-list"
                value={personalACargo}
                onChange={(e) => setPersonalACargo(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <datalist id="combine-personal-list">
                {personalList.map((p) => (
                  <option key={p.id} value={`${p.jerarquia} ${p.apellidoNombre}`} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dependencia Solicitante (*)
              </label>
              <select
                value={dependenciaSolicitante}
                onChange={(e) => setDependenciaSolicitante(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {dependencias.map((d, i) => (
                  <option key={i} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Datos Oficiales del Expediente Unificado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nuevo N° de Expediente Judicial (*)
              </label>
              <input
                type="text"
                value={nroExpediente}
                onChange={(e) => setNroExpediente(e.target.value)}
                placeholder="ej. 145/26"
                required
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                required
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fecha Registro
              </label>
              <input
                type="text"
                value={fechaExpediente}
                onChange={(e) => setFechaExpediente(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Oficio
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                N° Oficio / Origen
              </label>
              <input
                type="text"
                value={oficioOrigen}
                onChange={(e) => setOficioOrigen(e.target.value)}
                placeholder="ej. OF-512"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Letras Oficio
              </label>
              <input
                type="text"
                value={letrasOficio}
                onChange={(e) => setLetrasOficio(e.target.value)}
                placeholder="SEC. CRIM."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Requerimiento
              </label>
              <select
                value={tipoRequerimiento}
                onChange={(e) => setTipoRequerimiento(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {requerimientos.map((r, i) => (
                  <option key={i} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* CHECKBOX: ¿Causa con personal policial involucrado? */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPPI}
                onChange={(e) => setIsPPI(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
              />
              <div className="flex-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  ¿Causa con personal policial involucrado?
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tildar si hay efectivos policiales investigados o involucrados en la causa consolidada
                </p>
              </div>
            </label>

            {isPPI && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                {personalList && personalList.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-900/50">
                    <span className="text-[11px] font-bold text-purple-900 dark:text-purple-300 whitespace-nowrap">
                      Autocompletar con:
                    </span>
                    <select
                      onChange={(e) => {
                        const p = personalList.find((item) => item.id?.toString() === e.target.value);
                        if (p) {
                          setPpiJerarquia(p.jerarquia || '');
                          setPpiPlaza(p.plaza || '');
                          setPpiApellidoNombre(p.apellidoNombre || '');
                          setPpiDni(p.dni || '');
                        }
                      }}
                      defaultValue=""
                      className="flex-1 text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-md text-slate-800 dark:text-slate-200"
                    >
                      <option value="">Seleccionar efectivo de la lista de Personal...</option>
                      {personalList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.jerarquia} - {p.apellidoNombre} ({p.plaza || 'Sin Plaza'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Jerarquía <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <select
                      value={ppiJerarquia}
                      onChange={(e) => setPpiJerarquia(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="">Seleccionar...</option>
                      {jerarquias.map((j, i) => (
                        <option key={i} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Plaza Policial <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={ppiPlaza}
                      onChange={(e) => setPpiPlaza(e.target.value)}
                      placeholder="Ej. PL-084 / LEG-102"
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Apellido y Nombre <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={ppiApellidoNombre}
                      onChange={(e) => setPpiApellidoNombre(e.target.value)}
                      placeholder="Apellido, Nombres"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      DNI Efectivo
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ppiDni}
                      onChange={(e) => setPpiDni(e.target.value.replace(/\D/g, ''))}
                      placeholder="Solo números"
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Observaciones / Actuaciones Sumarias del Efectivo
                  </label>
                  <input
                    type="text"
                    value={ppiDetalles}
                    onChange={(e) => setPpiDetalles(e.target.value)}
                    placeholder="Ej. Sumario administrativo interno / Actuación preliminar judicial"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Evidence Persons Unification Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-blue-200 dark:border-blue-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase">
                  Personas Unificadas en la Causa ({evidencePersons.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Extraídas y desduplicadas de los expedientes combinados. Puede editar o agregar nuevas.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshSummaryWithPersons}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 rounded-lg transition-colors"
                  title="Reconstruir texto del resumen con la nómina actual de personas"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Actualizar con Personas</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddPerson}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Persona</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {evidencePersons.map((p, idx) => (
                <div key={p.id || idx} className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-mono text-slate-400 w-5 text-right">{idx + 1}.</span>
                  <input
                    type="text"
                    value={p.fullName}
                    onChange={(e) => handleUpdatePerson(idx, 'fullName', e.target.value)}
                    placeholder="Apellido y Nombre Completo"
                    className="flex-1 px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={p.dni}
                      onChange={(e) => handleUpdatePerson(idx, 'dni', e.target.value)}
                      placeholder="DNI"
                      className="w-28 px-2.5 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleSearchPersonDni(idx)}
                      className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded"
                      title="Buscar DNI en módulo Personas"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePerson(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {evidencePersons.length === 0 && (
                <div className="text-xs text-slate-400 italic py-2 text-center">
                  Sin personas cargadas. Haga clic en "+ Añadir Persona" para registrar involucrados.
                </div>
              )}
            </div>
          </div>

          {/* Section: Resumen Consolidado con botón Actualizar con Personas */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Resumen / Carátula Consolidada (*)
              </label>
              <button
                type="button"
                onClick={handleRefreshSummaryWithPersons}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Actualizar con Personas</span>
              </button>
            </div>
            <textarea
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
              rows={6}
              required
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Caso Unificado y Depurar Anteriores</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
