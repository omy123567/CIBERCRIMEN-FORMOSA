import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  Upload,
  Camera,
  Trash2,
  Plus,
  ShieldAlert,
  FileCheck2,
  Calendar,
  Clock,
  Eye,
  Search,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Expediente, ExpedienteCustomFields, EvidencePerson, DynamicCatalog, Personal } from '../../types/sgp';
import { sgpManager } from '../../db/dexieDb';
import { AttachmentZoomModal } from '../common/AttachmentZoomModal';

interface ExpedienteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expediente: Expediente) => void;
  initialData?: Expediente | null;
  catalogs: DynamicCatalog[];
  personalList: Personal[];
}

export const ExpedienteFormModal: React.FC<ExpedienteFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  catalogs,
  personalList
}) => {
  // Catalogs helpers
  const juzgados = catalogs.filter((c) => c.category === 'Juzgado').map((c) => c.value);
  const dependencias = catalogs.filter((c) => c.category === 'Dependencias').map((c) => c.value);
  const requerimientos = catalogs.filter((c) => c.category === 'Requerimiento').map((c) => c.value);
  const oficios = catalogs.filter((c) => c.category === 'Oficio').map((c) => c.value);
  const tareas = catalogs.filter((c) => c.category === 'Tarea Realizada').map((c) => c.value);
  const jerarquias = catalogs.filter((c) => c.category === 'Jerarquias').map((c) => c.value);

  // Form State
  const [personalACargo, setPersonalACargo] = useState('');
  const [dependenciaSolicitante, setDependenciaSolicitante] = useState('');
  const [isFaltaOficio, setIsFaltaOficio] = useState(false);
  const [nroExpediente, setNroExpediente] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear().toString());
  const [fechaExpediente, setFechaExpediente] = useState('');
  const [tipoOficio, setTipoOficio] = useState('');
  const [oficioOrigen, setOficioOrigen] = useState('');
  const [anioOficio, setAnioOficio] = useState(new Date().getFullYear().toString());
  const [letrasOficio, setLetrasOficio] = useState('');
  const [dependencia, setDependencia] = useState('');
  const [juzgado, setJuzgado] = useState('');
  const [tipoRequerimiento, setTipoRequerimiento] = useState('');
  const [resumen, setResumen] = useState('');
  const [caratula, setCaratula] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // PPI (Personal Policial Involucrado)
  const [isPPI, setIsPPI] = useState(false);
  const [ppiJerarquia, setPpiJerarquia] = useState('');
  const [ppiPlaza, setPpiPlaza] = useState('');
  const [ppiApellidoNombre, setPpiApellidoNombre] = useState('');
  const [ppiDni, setPpiDni] = useState('');
  const [ppiDetalles, setPpiDetalles] = useState('');

  // Tarea Realizada
  const [seHizoTareaRealizada, setSeHizoTareaRealizada] = useState(false);
  const [resumenTareaRealizada, setResumenTareaRealizada] = useState('');

  // Evidence Persons for Resguardo de Evidencia
  const [evidencePersons, setEvidencePersons] = useState<EvidencePerson[]>([]);

  // Attachments
  const [imagenOficioUri, setImagenOficioUri] = useState<string | undefined>('');
  const [imagenReciboUri, setImagenReciboUri] = useState<string | undefined>('');

  // Zoom Modal state
  const [zoomModalImage, setZoomModalImage] = useState<{ url: string; title: string } | null>(null);

  // Elevación
  const [condicionElevacion, setCondicionElevacion] = useState<'No entregado' | 'Entregado'>('No entregado');
  const [fechaElevacion, setFechaElevacion] = useState('');
  const [horaElevacion, setHoraElevacion] = useState('');
  const [personalRecibeAjeno, setPersonalRecibeAjeno] = useState('');

  // Priority & Deadlines
  const [prioridad, setPrioridad] = useState<'Normal' | 'Urgente' | 'Muy Urgente'>('Normal');
  const [plazoDias, setPlazoDias] = useState<number>(10);
  const [fechaVencimiento, setFechaVencimiento] = useState('');

  // File Inputs
  const oficioInputRef = useRef<HTMLInputElement>(null);
  const reciboInputRef = useRef<HTMLInputElement>(null);

  // Populate data when opening
  useEffect(() => {
    if (initialData) {
      setNroExpediente(initialData.nroExpediente || '');
      setAnio(initialData.anio || '2026');
      setCaratula(initialData.caratula || '');
      setJuzgado(initialData.juzgado || '');
      setDependencia(initialData.dependencia || '');
      setTipoOficio(initialData.tipoOficio || '');
      setTipoRequerimiento(initialData.tipoRequerimiento || '');
      setObservaciones(initialData.observaciones || '');
      setPrioridad(initialData.prioridad || 'Normal');
      setPlazoDias(initialData.plazoDias || 10);
      setFechaVencimiento(initialData.fechaVencimiento || '');

      // Parse custom fields
      if (initialData.customFieldsJson) {
        try {
          const c: ExpedienteCustomFields = JSON.parse(initialData.customFieldsJson);
          setPersonalACargo(c.personalACargo || initialData.personalAsignado || '');
          setDependenciaSolicitante(c.dependenciaSolicitante || '');
          setIsFaltaOficio(!!c.isFaltaOficio);
          setOficioOrigen(c.oficioOrigen || '');
          setAnioOficio(c.anioOficio || initialData.anio || '2026');
          setLetrasOficio(c.letrasOficio || '');
          setResumen(initialData.caratula || '');
          setIsPPI(!!c.isPPI);
          setPpiJerarquia(c.ppiJerarquia || '');
          setPpiPlaza(c.ppiPlaza || '');
          setPpiApellidoNombre(c.ppiApellidoNombre || '');
          setPpiDni(c.ppiDni || '');
          setPpiDetalles(c.ppiDetalles || '');
          setSeHizoTareaRealizada(!!c.seHizoTareaRealizada);
          setResumenTareaRealizada(c.resumenTareaRealizada || '');
          setEvidencePersons(c.evidencePersons || []);
          setImagenOficioUri(c.imagenOficioUri || '');
          setImagenReciboUri(c.imagenReciboUri || '');
          setCondicionElevacion(c.condicionElevacion || (initialData.estado === 'Elevado' ? 'Entregado' : 'No entregado'));
          setFechaElevacion(initialData.fechaElevacion || '');
          setHoraElevacion(c.horaElevacion || '');
          setPersonalRecibeAjeno(c.personalRecibeAjeno || initialData.personalRecibeAjeno || '');
        } catch {
          // ignore
        }
      }
      setFechaExpediente(initialData.fechaIngreso || '');
    } else {
      // New record defaults
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear().toString();
      const todayFormatted = `${dd}/${mm}/${yyyy}`;

      const target = new Date();
      target.setDate(target.getDate() + 10);
      const vdd = String(target.getDate()).padStart(2, '0');
      const vmm = String(target.getMonth() + 1).padStart(2, '0');
      const vyyyy = target.getFullYear().toString();

      setNroExpediente('');
      setAnio(yyyy);
      setFechaExpediente(todayFormatted);
      setAnioOficio(yyyy);
      setPersonalACargo('');
      setDependenciaSolicitante(dependencias[0] || 'Comisaría Laguna Blanca');
      setIsFaltaOficio(false);
      setTipoOficio(oficios[0] || 'Oficio Judicial');
      setOficioOrigen('');
      setLetrasOficio('');
      setDependencia(dependencias[0] || 'D.D.P.C.L.B. (Delegación Laguna Blanca)');
      setJuzgado(juzgados[0] || 'Juzgado de Instrucción y Correccional N° 1 - Clorinda');
      setTipoRequerimiento(requerimientos[0] || 'Resguardo de Evidencia Digital');
      setResumen('');
      setCaratula('');
      setObservaciones('');
      setIsPPI(false);
      setPpiJerarquia(jerarquias[0] || 'Sargento');
      setPpiPlaza('');
      setPpiApellidoNombre('');
      setPpiDni('');
      setPpiDetalles('');
      setSeHizoTareaRealizada(false);
      setResumenTareaRealizada('');
      setEvidencePersons([]);
      setImagenOficioUri('');
      setImagenReciboUri('');
      setCondicionElevacion('No entregado');
      setFechaElevacion('');
      setHoraElevacion('');
      setPersonalRecibeAjeno('');
      setPrioridad('Normal');
      setPlazoDias(10);
      setFechaVencimiento(`${vdd}/${vmm}/${vyyyy}`);
    }
  }, [initialData, isOpen]);

  // Dynamic evidence persons functions
  const handleAddEvidencePerson = () => {
    const newPerson: EvidencePerson = { id: `p-${Date.now()}`, fullName: '', dni: '' };
    setEvidencePersons([...evidencePersons, newPerson]);
  };

  const handleUpdateEvidencePerson = (index: number, field: 'fullName' | 'dni', value: string) => {
    const updated = [...evidencePersons];
    if (field === 'dni') {
      updated[index].dni = value.replace(/\D/g, '');
    } else {
      updated[index].fullName = value;
    }
    setEvidencePersons(updated);
  };

  const handleSearchPersonaByDni = async (index: number) => {
    const p = evidencePersons[index];
    if (!p.dni) {
      alert('Ingrese los números del DNI a buscar.');
      return;
    }
    const found = await sgpManager.findPersonaByDni(p.dni);
    if (found) {
      handleUpdateEvidencePerson(index, 'fullName', found.apellidoNombre);
    } else {
      alert(`No se encontró persona con DNI ${p.dni} en el módulo Personas. Escriba el Apellido y Nombre para registrarla automáticamente.`);
    }
  };

  const handleRemoveEvidencePerson = (index: number) => {
    setEvidencePersons(evidencePersons.filter((_, i) => i !== index));
  };

  const handleAutoUpdateResumenWithPersons = () => {
    let text = `${tipoRequerimiento || 'Resguardo de Evidencia'}`;
    if (evidencePersons.length > 0) {
      const roster = evidencePersons
        .map((p, i) => `${i + 1}. ${p.fullName || 'S/N'} (DNI: ${p.dni || 'S/D'})`)
        .join('; ');
      text += ` s/ ${roster}`;
    }
    setResumen(text);
    setCaratula(text);
  };

  // Image Upload helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'oficio' | 'recibo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      if (target === 'oficio') {
        setImagenOficioUri(dataUrl);
      } else {
        setImagenReciboUri(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const isResguardoSpecial =
    tipoRequerimiento.toLowerCase().includes('resguardo') ||
    tipoRequerimiento.toLowerCase().includes('evidencia') ||
    tipoRequerimiento.toLowerCase().includes('film') ||
    tipoRequerimiento.toLowerCase().includes('escalamiento');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation for "SIN OFICIO" (Falta de Oficio)
    if (isFaltaOficio) {
      if (!personalACargo.trim()) {
        alert('Personal a cargo de la Instrucción es requerido para registrar un caso Sin Oficio.');
        return;
      }
      if (!dependenciaSolicitante) {
        alert('Dependencia Solicitante es requerida para registrar un caso Sin Oficio.');
        return;
      }
      if (!fechaExpediente) {
        alert('Fecha de Realización es requerida para registrar un caso Sin Oficio.');
        return;
      }
      if (!tipoRequerimiento) {
        alert('Tipo de Requerimiento es requerido para registrar un caso Sin Oficio.');
        return;
      }
      if (!resumen.trim()) {
        alert('El campo Resumen es requerido para registrar un caso Sin Oficio.');
        return;
      }
    } else {
      if (!nroExpediente.trim()) {
        alert('El N° de Expediente es requerido.');
        return;
      }
    }

    // Validation for PPI: Requerir Jerarquía, Plaza, Apellido y Nombre
    if (isPPI) {
      if (!ppiJerarquia?.trim()) {
        alert('Para causas con Personal Policial Involucrado (PPI), debe ingresar la Jerarquía del efectivo.');
        return;
      }
      if (!ppiPlaza?.trim()) {
        alert('Para causas con Personal Policial Involucrado (PPI), debe ingresar la Plaza policial / Legajo del efectivo.');
        return;
      }
      if (!ppiApellidoNombre?.trim()) {
        alert('Para causas con Personal Policial Involucrado (PPI), debe ingresar el Apellido y Nombre del efectivo.');
        return;
      }
    }

    let estado: Expediente['estado'] = 'En Trámite';
    if (condicionElevacion === 'Entregado') {
      estado = 'Elevado';
    } else if (isFaltaOficio) {
      estado = 'Iniciado';
    }

    const assignedNumber = nroExpediente.trim() || `FO-${Date.now().toString().slice(-4)}`;

    const customFields: ExpedienteCustomFields = {
      personalACargo,
      dependenciaSolicitante,
      isFaltaOficio,
      oficioOrigen: isFaltaOficio ? (oficioOrigen || 'S/N') : oficioOrigen,
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
      imagenOficioUri,
      imagenReciboUri,
      condicionElevacion,
      horaElevacion: condicionElevacion === 'Entregado' ? horaElevacion : undefined,
      personalRecibeAjeno: condicionElevacion === 'Entregado' ? personalRecibeAjeno : undefined,
      resguardoFilmico: tipoRequerimiento.toLowerCase().includes('film')
    };

    const finalCaratula = caratula || resumen || `Expte. N° ${assignedNumber}/${anio} - ${tipoRequerimiento}`;

    const expedienteData: Expediente = {
      id: initialData?.id,
      anio: anio || '2026',
      nroExpediente: assignedNumber,
      caratula: finalCaratula,
      juzgado: isFaltaOficio ? (juzgado || 'A determinar por oficio') : (juzgado || 'Juzgado de Instrucción y Correccional N° 1 - Clorinda'),
      dependencia: dependencia || dependenciaSolicitante || 'D.D.P.C.L.B. (Delegación Laguna Blanca)',
      tipoOficio: isFaltaOficio ? 'Sin Oficio / Preliminar' : (tipoOficio || 'Oficio Judicial'),
      tipoRequerimiento: tipoRequerimiento || 'Resguardo de Evidencia Digital',
      fechaIngreso: fechaExpediente || new Date().toLocaleDateString('es-AR'),
      fechaVencimiento: fechaVencimiento || '',
      plazoDias: Number(plazoDias) || 10,
      personalAsignado: personalACargo || 'Personal de Turno',
      estado,
      prioridad,
      fechaElevacion: condicionElevacion === 'Entregado' ? fechaElevacion : '',
      horaElevacion: condicionElevacion === 'Entregado' ? horaElevacion : '',
      nroNotaElevacion: '',
      personalRecibeAjeno: condicionElevacion === 'Entregado' ? personalRecibeAjeno : '',
      observaciones: observaciones || resumen,
      customFieldsJson: JSON.stringify(customFields),
      delegacionId: 1
    };

    // Auto-save any newly entered persons to the Personas module
    if (evidencePersons.length > 0) {
      for (const p of evidencePersons) {
        if (p.fullName || p.dni) {
          await sgpManager.upsertPersona({
            apellidoNombre: p.fullName,
            dni: p.dni,
            expedientesVinculados: [`${assignedNumber}/${anio}`]
          });
        }
      }
    }

    onSave(expedienteData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Modal Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-lg">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {initialData ? 'Editar Expediente / Caso' : isFaltaOficio ? 'Registrar Caso Sin Oficio (Falta de Oficio)' : 'Nuevo Expediente Judicial'}
                </h2>
                <span className="text-xs text-slate-500">
                  SGP SisPol • D.D.P.C.L.B. Laguna Blanca
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Toggle Falta de Oficio Banner */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFaltaOficio}
                  onChange={(e) => setIsFaltaOficio(e.target.checked)}
                  className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                    Caso "SIN OFICIO" (Falta de Oficio / Preliminar)
                  </span>
                  <span className="text-[11px] text-amber-700 dark:text-amber-300">
                    {isFaltaOficio
                      ? 'Requerirá: Instructor, Solicitante, Fecha Realización, Requerimiento y Resumen. Los datos de oficio se cargarán al recepcionar el documento.'
                      : 'Marcar si la labor pericial o resguardo se inició antes de la llegada del oficio formal.'}
                  </span>
                </div>
              </label>
            </div>

            {/* SECCIÓN 1: -A Cargo y Solicitante- */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                -A Cargo y Solicitante-
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Personal a Cargo de la Instrucción {isFaltaOficio ? '(*)' : ''}
                  </label>
                  <input
                    type="text"
                    list="personal-list-instructores"
                    value={personalACargo}
                    onChange={(e) => setPersonalACargo(e.target.value)}
                    required={isFaltaOficio}
                    placeholder="Seleccionar o escribir instructor..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <datalist id="personal-list-instructores">
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Seleccione Dependencia...</option>
                    {dependencias.map((d, i) => (
                      <option key={i} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: -Expediente & Documentación Judicial- */}
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  -Expediente Judicial-
                </span>
                {isFaltaOficio && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded">
                    Identificador provisional FO automático
                  </span>
                )}
              </div>

              {!isFaltaOficio ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="col-span-1 sm:col-span-3">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Expediente (*)
                      </label>
                      <input
                        type="text"
                        value={nroExpediente}
                        onChange={(e) => setNroExpediente(e.target.value)}
                        placeholder="ej. 121"
                        required
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
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
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Fecha Expediente
                      </label>
                      <input
                        type="text"
                        value={fechaExpediente}
                        onChange={(e) => setFechaExpediente(e.target.value)}
                        placeholder="DD/MM/AAAA"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tipo de Oficio
                      </label>
                      <select
                        value={tipoOficio}
                        onChange={(e) => setTipoOficio(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        {oficios.map((o, i) => (
                          <option key={i} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Oficio (de origen)
                      </label>
                      <input
                        type="text"
                        value={oficioOrigen}
                        onChange={(e) => setOficioOrigen(e.target.value)}
                        placeholder="ej. OF-340/26"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Año Oficio
                      </label>
                      <input
                        type="text"
                        value={anioOficio}
                        onChange={(e) => setAnioOficio(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
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
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Juzgado / Fiscalía Interviniente
                    </label>
                    <select
                      value={juzgado}
                      onChange={(e) => setJuzgado(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {juzgados.map((j, i) => (
                        <option key={i} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Fecha de Realización de la Tarea (*)
                    </label>
                    <input
                      type="text"
                      value={fechaExpediente}
                      onChange={(e) => setFechaExpediente(e.target.value)}
                      placeholder="DD/MM/AAAA"
                      required={isFaltaOficio}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div className="flex items-center">
                    <p className="text-xs text-slate-400 italic">
                      * El número de expediente, oficio judicial, letras y juzgado se completarán al presionar "Recepcionar Oficio".
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN 3: Requerimiento & Resumen */}
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Requerimiento (*)
                </label>
                <select
                  value={tipoRequerimiento}
                  onChange={(e) => setTipoRequerimiento(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {requerimientos.map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* SECCIÓN DINÁMICA DE PERSONAS EN RESGUARDO DE EVIDENCIA */}
              {isResguardoSpecial && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase">
                        Personas en Resguardo de Evidencia ({evidencePersons.length})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Permite buscar por DNI en el módulo Personas y autocompletar el Resumen
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAutoUpdateResumenWithPersons}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 rounded-lg transition-colors"
                        title="Actualizar el resumen con la lista de personas"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Actualizar Resumen</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAddEvidencePerson}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir Persona</span>
                      </button>
                    </div>
                  </div>

                  {evidencePersons.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-2 text-center">
                      Sin personas cargadas. Haga clic en "+ Añadir Persona" para cargar imputados o investigados.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {evidencePersons.map((p, idx) => (
                        <div key={p.id || idx} className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                          <span className="text-xs font-mono text-slate-400 w-5 text-right">{idx + 1}.</span>
                          <input
                            type="text"
                            value={p.fullName}
                            onChange={(e) => handleUpdateEvidencePerson(idx, 'fullName', e.target.value)}
                            placeholder="Apellido y Nombre Completo"
                            className="flex-1 px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={p.dni}
                              onChange={(e) => handleUpdateEvidencePerson(idx, 'dni', e.target.value)}
                              placeholder="DNI"
                              className="w-28 px-2.5 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleSearchPersonaByDni(idx)}
                              className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded"
                              title="Buscar en registro de Personas"
                            >
                              <Search className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveEvidencePerson(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Quitar persona"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Resumen / Carátula Judicial {isFaltaOficio ? '(*)' : ''}
                  </label>
                  {isResguardoSpecial && evidencePersons.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoUpdateResumenWithPersons}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Actualizar con Personas</span>
                    </button>
                  )}
                </div>
                <textarea
                  value={resumen}
                  onChange={(e) => {
                    setResumen(e.target.value);
                    setCaratula(e.target.value);
                  }}
                  required={isFaltaOficio}
                  rows={4}
                  placeholder="Descripción detallada de la actuación, carátula o asunto judicial..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
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
                    Tildar si hay efectivos policiales investigados o involucrados en la causa
                  </p>
                </div>
              </label>

              {isPPI && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  {/* Quick Select from Personal */}
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

            {/* CHECKBOX: ¿Se ejecutó una Tarea Realizada? */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seHizoTareaRealizada}
                  onChange={(e) => setSeHizoTareaRealizada(e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <div className="flex-1">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    ¿Se ejecutó una Tarea Realizada?
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Marcar si se concluyó una labor operativa específica
                  </p>
                </div>
              </label>

              {seHizoTareaRealizada && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tarea Realizada / Conclusión Operativa
                  </label>
                  <select
                    value={resumenTareaRealizada}
                    onChange={(e) => setResumenTareaRealizada(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Seleccionar Tarea Concluida...</option>
                    {tareas.map((t, i) => (
                      <option key={i} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* SECCIÓN 4: -Contenido Adjunto- (Imagen del Oficio y Recibo con Zoom) */}
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                -Contenido Adjunto-
              </div>

              {/* Oficio Image */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Imagen del Oficio
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    ref={oficioInputRef}
                    onChange={(e) => handleFileChange(e, 'oficio')}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => oficioInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-100/80 dark:bg-emerald-950/60 hover:bg-emerald-200 rounded-xl transition-colors"
                  >
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>Galería / Archivo</span>
                  </button>

                  {imagenOficioUri ? (
                    <div className="flex items-center gap-3 ml-auto">
                      <div
                        onClick={() => setZoomModalImage({ url: imagenOficioUri, title: `Oficio Judicial - ${nroExpediente || 'S/N'}` })}
                        className="cursor-pointer group relative w-16 h-16 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700"
                        title="Ver en pantalla completa con zoom"
                      >
                        <img src={imagenOficioUri} alt="Oficio" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImagenOficioUri('')}
                        className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Ningún archivo cargado</span>
                  )}
                </div>
              </div>

              {/* Recibo Image */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Imagen del Recibo de Elevación
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    ref={reciboInputRef}
                    onChange={(e) => handleFileChange(e, 'recibo')}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => reciboInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-800 dark:text-blue-200 bg-blue-100/80 dark:bg-blue-950/60 hover:bg-blue-200 rounded-xl transition-colors"
                  >
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>Galería / Archivo</span>
                  </button>

                  {imagenReciboUri ? (
                    <div className="flex items-center gap-3 ml-auto">
                      <div
                        onClick={() => setZoomModalImage({ url: imagenReciboUri, title: `Recibo de Elevación - ${nroExpediente || 'S/N'}` })}
                        className="cursor-pointer group relative w-16 h-16 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700"
                        title="Ver en pantalla completa con zoom"
                      >
                        <img src={imagenReciboUri} alt="Recibo" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImagenReciboUri('')}
                        className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Ningún recibo cargado</span>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN 5: -Elevación del Expediente- */}
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  -Elevación del Expediente-
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  condicionElevacion === 'Entregado'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                }`}>
                  {condicionElevacion}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Condición de Elevación:
                </label>
                <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCondicionElevacion('No entregado')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      condicionElevacion === 'No entregado'
                        ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-sm border border-rose-200 dark:border-rose-900'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    No entregado
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondicionElevacion('Entregado')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      condicionElevacion === 'Entregado'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm border border-blue-200 dark:border-blue-900'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Entregado
                  </button>
                </div>
              </div>

              {condicionElevacion === 'Entregado' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Fecha de Elevación
                    </label>
                    <input
                      type="text"
                      value={fechaElevacion}
                      onChange={(e) => setFechaElevacion(e.target.value)}
                      placeholder="DD/MM/AAAA"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Hora de Elevación
                    </label>
                    <input
                      type="text"
                      value={horaElevacion}
                      onChange={(e) => setHoraElevacion(e.target.value)}
                      placeholder="HH:mm"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Personal Recibe (Ajeno)
                    </label>
                    <input
                      type="text"
                      value={personalRecibeAjeno}
                      onChange={(e) => setPersonalRecibeAjeno(e.target.value)}
                      placeholder="Nombre receptor"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{initialData ? 'Guardar Cambios' : isFaltaOficio ? 'Registrar Caso Sin Oficio' : 'Guardar Expediente'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Global Zoom Modal for Oficio / Recibo */}
      {zoomModalImage && (
        <AttachmentZoomModal
          isOpen={!!zoomModalImage}
          onClose={() => setZoomModalImage(null)}
          imageUrl={zoomModalImage.url}
          title={zoomModalImage.title}
        />
      )}
    </>
  );
};
