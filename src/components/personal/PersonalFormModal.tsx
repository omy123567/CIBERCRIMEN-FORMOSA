import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Save,
  User,
  Shield,
  Phone,
  MapPin,
  Upload,
  FileText,
  Trash2,
  Eye,
  Camera,
  Crop,
  CreditCard,
  Mail,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Clock,
  IdCard
} from 'lucide-react';
import { Personal, DynamicCatalog, PersonalCustomFields, DocumentoPersonal } from '../../types/sgp';
import { ImageEditorModal } from '../common/ImageEditorModal';
import { AttachmentZoomModal } from '../common/AttachmentZoomModal';

interface PersonalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (person: Personal) => void;
  initialData?: Personal | null;
  catalogs: DynamicCatalog[];
}

const TIPO_DOCS = [
  { value: 'DNI_FRENTE', label: 'D.N.I. (Frente)' },
  { value: 'DNI_DORSO', label: 'D.N.I. (Dorso)' },
  { value: 'CREDENCIAL', label: 'Credencial / Placa Policial' },
  { value: 'LICENCIA_CONDUCIR', label: 'Licencia de Conducir' },
  { value: 'CERTIFICADO_MEDICO', label: 'Certificado Médico' },
  { value: 'CURSO', label: 'Certificado de Curso / Capacitación' },
  { value: 'FOJA_SERVICIO', label: 'Foja de Servicio / Legajo' },
  { value: 'OTRO', label: 'Otro Documento' }
];

const CATEGORIAS_LICENCIA = [
  { id: 'A1', label: 'A1 - Ciclomotores hasta 50cc' },
  { id: 'A2', label: 'A2 - Motos hasta 150cc' },
  { id: 'A3', label: 'A3 - Motos de cualquier cilindrada' },
  { id: 'B1', label: 'B1 - Automóviles y utilitarios hasta 3500kg' },
  { id: 'B2', label: 'B2 - Automóviles con acoplado' },
  { id: 'C1', label: 'C1 - Camiones sin acoplado' },
  { id: 'D1', label: 'D1 - Transporte de pasajeros hasta 8 plazas' },
  { id: 'D2', label: 'D2 - Transporte de más de 8 plazas' },
  { id: 'E1', label: 'E1 - Camiones articulados / acoplados' },
  { id: 'F', label: 'F - Vehículos adaptados' }
];

const ESTADOS_CIVILES = ['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Unión Convivencial'];

export const PersonalFormModal: React.FC<PersonalFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  catalogs
}) => {
  const jerarquias = catalogs.filter((c) => c.category === 'Jerarquias').map((c) => c.value);
  const grupos = catalogs.filter((c) => c.category === 'Grupos').map((c) => c.value);
  const localidades = catalogs.filter((c) => c.category === 'Localidades').map((c) => c.value);
  const armaMarcas = catalogs.filter((c) => c.category === 'Arma Marcas').map((c) => c.value);
  const armaModelos = catalogs.filter((c) => c.category === 'Arma Modelo').map((c) => c.value);
  const chalecoTallas = catalogs.filter((c) => c.category === 'Chaleco Tallas').map((c) => c.value);

  // Active Tab: 1 = DATOS PERSONALES, 2 = LICENCIA CONDUCIR, 3 = EQUIPAMIENTO, 4 = ANEXAR DOCS
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(1);

  // TAB 1: DATOS PERSONALES
  const [jerarquia, setJerarquia] = useState('');
  const [plaza, setPlaza] = useState('');
  const [apellidoNombre, setApellidoNombre] = useState('');
  const [dni, setDni] = useState('');
  const [sexo, setSexo] = useState<'M' | 'F' | 'OTRO'>('M');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [estadoCivil, setEstadoCivil] = useState('Soltero/a');
  const [fechaIngreso, setFechaIngreso] = useState('01/02/2018');
  const [domicilio, setDomicilio] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contactoEmergencia, setContactoEmergencia] = useState('');
  const [grupo, setGrupo] = useState('');
  const [chapaPlaca, setChapaPlaca] = useState('');
  const [disponible, setDisponible] = useState(true);
  const [motivoNoDisponible, setMotivoNoDisponible] = useState('');

  // TAB 2: LICENCIA DE CONDUCIR Y DOCUMENTACION
  const [licenciaNumero, setLicenciaNumero] = useState('');
  const [licenciaCategorias, setLicenciaCategorias] = useState<string[]>(['B1']);
  const [licenciaVencimiento, setLicenciaVencimiento] = useState('');
  const [licenciaEstado, setLicenciaEstado] = useState<'VIGENTE' | 'VENCIDA' | 'NO_POSEE'>('VIGENTE');
  const [obraSocial, setObraSocial] = useState('I.A.S.E.P.');
  const [numeroCredencial, setNumeroCredencial] = useState('');

  // TAB 3: EQUIPAMIENTO A CARGO
  const [armaMarca, setArmaMarca] = useState('');
  const [armaModelo, setArmaModelo] = useState('');
  const [armaSerie, setArmaSerie] = useState('');
  const [armaCalibre, setArmaCalibre] = useState('9x19 mm Parabellum');
  const [armaEstado, setArmaEstado] = useState<'ASIGNADA' | 'RETENIDA' | 'SECUESTRADA'>('ASIGNADA');
  const [armaMotivoRetencion, setArmaMotivoRetencion] = useState('');

  const [chalecoSerie, setChalecoSerie] = useState('');
  const [chalecoTalla, setChalecoTalla] = useState('');
  const [chalecoEstado, setChalecoEstado] = useState<'ASIGNADO' | 'RETENIDO' | 'SECUESTRADA'>('ASIGNADO');
  const [chalecoMotivoRetencion, setChalecoMotivoRetencion] = useState('');

  // TAB 4: ANEXAR DOCUMENTACION
  const [documentosAdjuntos, setDocumentosAdjuntos] = useState<DocumentoPersonal[]>([]);
  const [newDocTipo, setNewDocTipo] = useState<DocumentoPersonal['tipo']>('DNI_FRENTE');
  const [newDocTitulo, setNewDocTitulo] = useState('');

  // Image editing modal state
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingImageSrc, setEditingImageSrc] = useState<string | null>(null);

  // Attachment zoom modal state
  const [zoomDoc, setZoomDoc] = useState<{ src: string; title: string } | null>(null);

  // Seniority calculation strictly in calendar years: anioReferencia - anioIngreso (never months)
  const antiguedadAnios = useMemo(() => {
    if (!fechaIngreso) return 0;
    let anioIngreso = 0;
    if (fechaIngreso.includes('/')) {
      const parts = fechaIngreso.split('/');
      anioIngreso = parseInt(parts[2] || parts[0], 10);
    } else if (fechaIngreso.includes('-')) {
      const parts = fechaIngreso.split('-');
      anioIngreso = parseInt(parts[0], 10);
    }
    if (!anioIngreso || isNaN(anioIngreso)) return 0;
    const anioActual = new Date().getFullYear();
    const diff = anioActual - anioIngreso;
    return diff > 0 ? diff : 0;
  }, [fechaIngreso]);

  useEffect(() => {
    if (initialData) {
      setJerarquia(initialData.jerarquia || '');
      setPlaza(initialData.plaza || '');
      setApellidoNombre(initialData.apellidoNombre || '');
      setDni(initialData.dni || '');
      setFechaNacimiento(initialData.fechaNacimiento || '');
      setFechaIngreso(initialData.fechaIngreso || '');
      setGrupo(initialData.grupo || '');
      setContactoEmergencia(initialData.contactoEmergencia || '');
      setDisponible(initialData.disponible);
      setMotivoNoDisponible(initialData.motivoNoDisponible || '');

      if (initialData.customFieldsJson) {
        try {
          const c: PersonalCustomFields = JSON.parse(initialData.customFieldsJson);
          setTelefono(c.telefono || '');
          setDomicilio(c.domicilio || '');
          setLocalidad(c.localidad || '');
          setChapaPlaca(c.chapaPlaca || '');
          const s = (c.sexo || 'M').toUpperCase();
          if (s.startsWith('F')) setSexo('F');
          else if (s === 'OTRO') setSexo('OTRO');
          else setSexo('M');

          setEstadoCivil(c.estadoCivil || 'Soltero/a');
          setEmail(c.email || '');

          setLicenciaNumero(c.licenciaConducirNumero || '');
          setLicenciaCategorias(c.licenciaConducirCategorias || ['B1']);
          setLicenciaVencimiento(c.licenciaConducirVencimiento || '');
          const le = (c.licenciaConducirEstado || 'VIGENTE').toUpperCase();
          if (le === 'VENCIDA') setLicenciaEstado('VENCIDA');
          else if (le === 'NO_POSEE') setLicenciaEstado('NO_POSEE');
          else setLicenciaEstado('VIGENTE');
          setObraSocial(c.obraSocial || 'I.A.S.E.P.');
          setNumeroCredencial(c.numeroCredencial || '');

          setArmaMarca(c.armaMarca || armaMarcas[0] || 'Bersa');
          setArmaModelo(c.armaModelo || armaModelos[0] || 'Thunder 9 Pro');
          setArmaSerie(c.armaSerie || '');
          setArmaCalibre(c.armaCalibre || '9x19 mm Parabellum');
          setArmaEstado(c.armaEstado || 'ASIGNADA');
          setArmaMotivoRetencion(c.armaMotivoRetencion || '');

          setChalecoSerie(c.chalecoSerie || '');
          setChalecoTalla(c.chalecoTalla || c.chalecoAsignado || chalecoTallas[1] || 'Talla M');
          setChalecoEstado(c.chalecoEstado || 'ASIGNADO');
          setChalecoMotivoRetencion(c.chalecoMotivoRetencion || '');

          if (Array.isArray(c.documentosAdjuntos)) {
            setDocumentosAdjuntos(c.documentosAdjuntos);
          } else {
            setDocumentosAdjuntos([]);
          }
        } catch {
          setDocumentosAdjuntos([]);
        }
      } else {
        setDocumentosAdjuntos([]);
      }
    } else {
      setJerarquia(jerarquias[0] || 'Oficial Principal');
      setPlaza(`PL-${String(Math.floor(Math.random() * 900) + 100)}`);
      setApellidoNombre('');
      setDni('');
      setSexo('M');
      setFechaNacimiento('15/05/1990');
      setEstadoCivil('Soltero/a');
      setFechaIngreso('01/02/2018');
      setGrupo(grupos[0] || 'Guardia A');
      setContactoEmergencia('');
      setDisponible(true);
      setMotivoNoDisponible('');
      setTelefono('');
      setEmail('');
      setDomicilio('');
      setLocalidad(localidades[0] || 'Laguna Blanca');
      setChapaPlaca('');

      setLicenciaNumero('');
      setLicenciaCategorias(['B1']);
      setLicenciaVencimiento('2028-06-30');
      setLicenciaEstado('VIGENTE');
      setObraSocial('I.A.S.E.P.');
      setNumeroCredencial('');

      setArmaMarca(armaMarcas[0] || 'Bersa');
      setArmaModelo(armaModelos[0] || 'Thunder 9 Pro');
      setArmaSerie('');
      setArmaCalibre('9x19 mm Parabellum');
      setArmaEstado('ASIGNADA');
      setArmaMotivoRetencion('');

      setChalecoSerie('');
      setChalecoTalla(chalecoTallas[1] || 'Talla M');
      setChalecoEstado('ASIGNADO');
      setChalecoMotivoRetencion('');

      setDocumentosAdjuntos([]);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const toggleCategoriaLicencia = (catId: string) => {
    setLicenciaCategorias((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const docTypeLabel = TIPO_DOCS.find((t) => t.value === newDocTipo)?.label || 'Documento';
      const nuevoDoc: DocumentoPersonal = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tipo: newDocTipo,
        titulo: newDocTitulo.trim() || docTypeLabel,
        fechaSubida: new Date().toLocaleDateString('es-AR'),
        dataUrl
      };

      setDocumentosAdjuntos((prev) => [...prev, nuevoDoc]);
      setNewDocTitulo('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveDoc = (id: string) => {
    setDocumentosAdjuntos((prev) => prev.filter((d) => d.id !== id));
  };

  const handleStartEditImage = (doc: DocumentoPersonal) => {
    setEditingDocId(doc.id);
    setEditingImageSrc(doc.dataUrl);
  };

  const handleSaveEditedImage = (newImageBase64: string) => {
    if (!editingDocId) return;
    setDocumentosAdjuntos((prev) =>
      prev.map((d) => (d.id === editingDocId ? { ...d, dataUrl: newImageBase64 } : d))
    );
    setEditingDocId(null);
    setEditingImageSrc(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let existingCustom: any = {};
    if (initialData?.customFieldsJson) {
      try {
        existingCustom = JSON.parse(initialData.customFieldsJson);
      } catch {
        // ignore
      }
    }

    const customFields: PersonalCustomFields = {
      ...existingCustom,
      telefono,
      domicilio,
      localidad,
      chapaPlaca,
      sexo,
      estadoCivil,
      email,
      licenciaConducirNumero: licenciaNumero,
      licenciaConducirCategorias: licenciaCategorias,
      licenciaConducirVencimiento: licenciaVencimiento,
      licenciaConducirEstado: licenciaEstado,
      obraSocial,
      numeroCredencial,
      armaMarca,
      armaModelo,
      armaSerie,
      armaCalibre,
      armaEstado,
      armaMotivoRetencion,
      armaAsignada: armaSerie ? `${armaMarca} ${armaModelo} (Serie ${armaSerie})` : `${armaMarca} ${armaModelo}`,
      chalecoSerie,
      chalecoTalla,
      chalecoEstado,
      chalecoMotivoRetencion,
      chalecoAsignado: chalecoSerie ? `${chalecoTalla} (Serie ${chalecoSerie})` : chalecoTalla,
      documentosAdjuntos
    };

    const person: Personal = {
      id: initialData?.id,
      jerarquia: jerarquia || 'Oficial Principal',
      plaza: plaza || 'PL-000',
      apellidoNombre: apellidoNombre.trim(),
      dni: dni.replace(/\D/g, ''),
      fechaNacimiento,
      fechaIngreso,
      grupo: grupo || 'Guardia A',
      contactoEmergencia,
      disponible,
      motivoNoDisponible: disponible ? '' : motivoNoDisponible,
      customFieldsJson: JSON.stringify(customFields),
      delegacionId: 1
    };

    onSave(person);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/10 text-blue-600 rounded-lg">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {initialData ? `Editar Legajo: ${initialData.apellidoNombre}` : 'Nuevo Efectivo Policial'}
                </h2>
                <span className="text-xs text-slate-500">
                  D.D.P.C.L.B. Laguna Blanca • Formosa
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/50 px-4 gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab(1)}
              className={`px-3 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 1
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-lg'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              -DATOS PERSONALES-
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(2)}
              className={`px-3 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 2
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-lg'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              -LICENCIA DE CONDUCIR Y DOC.-
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(3)}
              className={`px-3 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 3
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-lg'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              -EQUIPAMIENTO A CARGO-
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(4)}
              className={`px-3 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 4
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-lg'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              -ANEXAR DOCUMENTACIÓN-
              {documentosAdjuntos.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px]">
                  {documentosAdjuntos.length}
                </span>
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* TAB 1: DATOS PERSONALES */}
            {activeTab === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Apellido y Nombres (*)
                    </label>
                    <input
                      type="text"
                      value={apellidoNombre}
                      onChange={(e) => setApellidoNombre(e.target.value)}
                      placeholder="ej. PEREZ, Juan Carlos"
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      D.N.I. (Solo números) (*)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={dni}
                      onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                      placeholder="ej. 32450891"
                      required
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Sexo
                    </label>
                    <select
                      value={sexo}
                      onChange={(e) => setSexo(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Jerarquía (*)
                    </label>
                    <select
                      value={jerarquia}
                      onChange={(e) => setJerarquia(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {jerarquias.map((j, i) => (
                        <option key={i} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Plaza / Revista (*)
                    </label>
                    <input
                      type="text"
                      value={plaza}
                      onChange={(e) => setPlaza(e.target.value)}
                      placeholder="ej. PL-012"
                      required
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Chapa / Placa
                    </label>
                    <input
                      type="text"
                      value={chapaPlaca}
                      onChange={(e) => setChapaPlaca(e.target.value)}
                      placeholder="ej. CHP-4421"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Fecha de Nacimiento
                    </label>
                    <input
                      type="text"
                      value={fechaNacimiento}
                      onChange={(e) => setFechaNacimiento(e.target.value)}
                      placeholder="DD/MM/AAAA"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Estado Civil
                    </label>
                    <select
                      value={estadoCivil}
                      onChange={(e) => setEstadoCivil(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {ESTADOS_CIVILES.map((ec, i) => (
                        <option key={i} value={ec}>{ec}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Fecha de Ingreso a la Fuerza (*)
                    </label>
                    <input
                      type="text"
                      value={fechaIngreso}
                      onChange={(e) => setFechaIngreso(e.target.value)}
                      placeholder="DD/MM/AAAA"
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Seniority automatic highlight box */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-300 block">
                        Antigüedad en la Fuerza (Cálculo estricto en años calendario)
                      </span>
                      <span className="text-[11px] text-blue-700 dark:text-blue-400">
                        {antiguedadAnios > 0
                          ? `${antiguedadAnios} años de servicio cumplidos`
                          : 'Ingreso reciente (< 1 año)'}
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-blue-600 text-white font-mono font-bold text-xs rounded-lg">
                    {antiguedadAnios} AÑOS
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Domicilio Particular
                    </label>
                    <input
                      type="text"
                      value={domicilio}
                      onChange={(e) => setDomicilio(e.target.value)}
                      placeholder="ej. Barrio San Cayetano, Manzana 12 Casa 4"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Localidad
                    </label>
                    <select
                      value={localidad}
                      onChange={(e) => setLocalidad(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {localidades.map((loc, i) => (
                        <option key={i} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Teléfono de Contacto
                    </label>
                    <input
                      type="text"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="ej. 3718-456789"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email Institucional / Personal
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ej. oficial@policia.gob.ar"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contacto de Emergencia
                    </label>
                    <input
                      type="text"
                      value={contactoEmergencia}
                      onChange={(e) => setContactoEmergencia(e.target.value)}
                      placeholder="Nombre y Teléfono familiar"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Grupo / Guardia Operativa
                    </label>
                    <select
                      value={grupo}
                      onChange={(e) => setGrupo(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {grupos.map((g, i) => (
                        <option key={i} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={disponible}
                        onChange={(e) => setDisponible(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span className={disponible ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                        Disponible para el Servicio Activo
                      </span>
                    </label>
                  </div>
                </div>

                {!disponible && (
                  <div>
                    <label className="block text-xs font-semibold text-rose-600 mb-1">
                      Motivo de No Disponibilidad (*)
                    </label>
                    <input
                      type="text"
                      value={motivoNoDisponible}
                      onChange={(e) => setMotivoNoDisponible(e.target.value)}
                      placeholder="ej. Licencia Médica / Comisión fuera de la jurisdicción"
                      required={!disponible}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-rose-300 bg-rose-50/50 dark:bg-rose-950/20 text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: LICENCIA DE CONDUCIR Y DOCUMENTACION */}
            {activeTab === 2 && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    Licencia Nacional de Conducir
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        N° de Licencia
                      </label>
                      <input
                        type="text"
                        value={licenciaNumero}
                        onChange={(e) => setLicenciaNumero(e.target.value)}
                        placeholder="N° Licencia o DNI"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Fecha de Vencimiento
                      </label>
                      <input
                        type="date"
                        value={licenciaVencimiento}
                        onChange={(e) => setLicenciaVencimiento(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Estado de la Licencia
                      </label>
                      <select
                        value={licenciaEstado}
                        onChange={(e) => setLicenciaEstado(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="VIGENTE">Vigente (Habilitada)</option>
                        <option value="VENCIDA">Vencida</option>
                        <option value="NO_POSEE">No posee</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Categorías Habilitadas
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CATEGORIAS_LICENCIA.map((cat) => (
                        <label
                          key={cat.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            licenciaCategorias.includes(cat.id)
                              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-900 dark:text-blue-300 font-semibold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={licenciaCategorias.includes(cat.id)}
                            onChange={() => toggleCategoriaLicencia(cat.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                          />
                          <span className="truncate">{cat.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {licenciaCategorias.length > 0 && (
                    <div className="text-[11px] text-slate-500 font-mono bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                      Resumen Categorías:{' '}
                      <span className="font-bold text-blue-600">{licenciaCategorias.join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <IdCard className="w-4 h-4 text-emerald-600" />
                    Obra Social y Afiliación
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Obra Social
                      </label>
                      <input
                        type="text"
                        value={obraSocial}
                        onChange={(e) => setObraSocial(e.target.value)}
                        placeholder="ej. I.A.S.E.P."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        N° de Credencial / Afiliado
                      </label>
                      <input
                        type="text"
                        value={numeroCredencial}
                        onChange={(e) => setNumeroCredencial(e.target.value)}
                        placeholder="ej. 00-1234567-0"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: EQUIPAMIENTO A CARGO */}
            {activeTab === 3 && (
              <div className="space-y-4">
                {/* Armamento */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      Armamento Asignado
                    </h3>
                    <select
                      value={armaEstado}
                      onChange={(e) => setArmaEstado(e.target.value as any)}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${
                        armaEstado === 'ASIGNADA'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}
                    >
                      <option value="ASIGNADA">Asignada / En Poder</option>
                      <option value="RETENIDA">Retenida en Sala de Armas</option>
                      <option value="SECUESTRADA">Secuestrada Judicialmente</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Marca
                      </label>
                      <input
                        type="text"
                        value={armaMarca}
                        onChange={(e) => setArmaMarca(e.target.value)}
                        placeholder="ej. Bersa"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Modelo
                      </label>
                      <input
                        type="text"
                        value={armaModelo}
                        onChange={(e) => setArmaModelo(e.target.value)}
                        placeholder="ej. Thunder 9 Pro"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        N° de Serie
                      </label>
                      <input
                        type="text"
                        value={armaSerie}
                        onChange={(e) => setArmaSerie(e.target.value)}
                        placeholder="ej. 12-B09871"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Calibre
                      </label>
                      <input
                        type="text"
                        value={armaCalibre}
                        onChange={(e) => setArmaCalibre(e.target.value)}
                        placeholder="ej. 9x19 mm"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {armaEstado !== 'ASIGNADA' && (
                    <div>
                      <label className="block text-xs font-semibold text-rose-600 mb-1">
                        Motivo de Retención / Secuestro del Arma (*)
                      </label>
                      <input
                        type="text"
                        value={armaMotivoRetencion}
                        onChange={(e) => setArmaMotivoRetencion(e.target.value)}
                        placeholder="ej. Medida cautelar causa sumarial / Licencia psiquiátrica"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-rose-300 bg-rose-50/50 dark:bg-rose-950/20 text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Chaleco */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      Chaleco Balístico Asignado
                    </h3>
                    <select
                      value={chalecoEstado}
                      onChange={(e) => setChalecoEstado(e.target.value as any)}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${
                        chalecoEstado === 'ASIGNADO'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}
                    >
                      <option value="ASIGNADO">Asignado / En Poder</option>
                      <option value="RETENIDO">Retenido / Depósito</option>
                      <option value="SECUESTRADA">Secuestrado Judicialmente</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        N° de Serie del Chaleco
                      </label>
                      <input
                        type="text"
                        value={chalecoSerie}
                        onChange={(e) => setChalecoSerie(e.target.value)}
                        placeholder="ej. CHL-2023-8812"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Talla
                      </label>
                      <select
                        value={chalecoTalla}
                        onChange={(e) => setChalecoTalla(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        {chalecoTallas.map((t, i) => (
                          <option key={i} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {chalecoEstado !== 'ASIGNADO' && (
                    <div>
                      <label className="block text-xs font-semibold text-rose-600 mb-1">
                        Motivo de Retención del Chaleco
                      </label>
                      <input
                        type="text"
                        value={chalecoMotivoRetencion}
                        onChange={(e) => setChalecoMotivoRetencion(e.target.value)}
                        placeholder="ej. Devolución por pase a otra dependencia"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-rose-300 bg-rose-50/50 dark:bg-rose-950/20 text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: ANEXAR DOCUMENTACION */}
            {activeTab === 4 && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    Cargar Nuevo Documento o Imagen
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tipo de Documento
                      </label>
                      <select
                        value={newDocTipo}
                        onChange={(e) => setNewDocTipo(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        {TIPO_DOCS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Título / Descripción del Adjunto
                      </label>
                      <input
                        type="text"
                        value={newDocTitulo}
                        onChange={(e) => setNewDocTitulo(e.target.value)}
                        placeholder="ej. Frente DNI o Certificado Curso RCP"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-all active:scale-95">
                      <Camera className="w-4 h-4" />
                      <span>Seleccionar Imagen (Galería o Cámara)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Soporta JPG, PNG, WEBP (Se almacena offline de forma segura)
                    </span>
                  </div>
                </div>

                {/* Document Gallery */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Documentos Anexados ({documentosAdjuntos.length})
                  </h4>

                  {documentosAdjuntos.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                      No hay imágenes ni documentación adjunta para este efectivo.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {documentosAdjuntos.map((doc) => (
                        <div
                          key={doc.id}
                          className="group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
                        >
                          <div className="h-28 w-full bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center relative">
                            <img
                              src={doc.dataUrl}
                              alt={doc.titulo}
                              className="h-full w-full object-cover"
                            />
                            {/* Hover overlay with action buttons */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white transition-opacity">
                              <button
                                type="button"
                                onClick={() => setZoomDoc({ src: doc.dataUrl || '', title: doc.titulo || 'Documento' })}
                                className="p-1.5 bg-blue-600 rounded-lg hover:bg-blue-700"
                                title="Ver con Zoom"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEditImage(doc)}
                                className="p-1.5 bg-emerald-600 rounded-lg hover:bg-emerald-700"
                                title="Editar Imagen (Recorte/Brillo/Girar)"
                              >
                                <Crop className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveDoc(doc.id)}
                                className="p-1.5 bg-rose-600 rounded-lg hover:bg-rose-700"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                                {doc.titulo}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {doc.fechaSubida} • {doc.tipo}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Legajo</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Image Editor Modal for attached documents */}
      {editingImageSrc && (
        <ImageEditorModal
          isOpen={true}
          imageSrc={editingImageSrc}
          onClose={() => {
            setEditingDocId(null);
            setEditingImageSrc(null);
          }}
          onSave={handleSaveEditedImage}
          title="Editar Documento Adjunto"
        />
      )}

      {/* Attachment Zoom Modal */}
      {zoomDoc && (
        <AttachmentZoomModal
          isOpen={true}
          imageSrc={zoomDoc.src}
          title={zoomDoc.title}
          onClose={() => setZoomDoc(null)}
        />
      )}
    </>
  );
};
