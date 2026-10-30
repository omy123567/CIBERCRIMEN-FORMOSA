export type ExpedienteEstado = 'Iniciado' | 'En Trámite' | 'Diligenciado' | 'Elevado' | 'Archivado';
export type ExpedientePrioridad = 'Normal' | 'Urgente' | 'Muy Urgente';

export interface EvidencePerson {
  id: string;
  fullName: string;
  dni: string; // Exclusivamente numérico
}

export interface PersonalPolicialInvolucrado {
  id?: string;
  jerarquia: string; // Requerido
  plaza: string; // Requerido (Plaza policial/legajo/credencial)
  apellidoNombre: string; // Requerido
  dni?: string;
  destinoActual?: string;
  situacionRevista?: string; // Actividad, Disponibilidad, Pasiva, Retiro
  observaciones?: string;
}

export interface ExpedienteCustomFields {
  imagenOficioUri?: string;
  imagenReciboUri?: string;
  seHizoTareaRealizada?: boolean;
  resumenTareaRealizada?: string;
  isFaltaOficio?: boolean;
  oficioOrigen?: string;
  anioOficio?: string;
  letrasOficio?: string;
  dependenciaSolicitante?: string;
  personalACargo?: string;
  isPPI?: boolean;
  ppiJerarquia?: string;
  ppiPlaza?: string;
  ppiApellidoNombre?: string;
  ppiDni?: string;
  ppiDetalles?: string;
  personalPolicialInvolucrado?: PersonalPolicialInvolucrado[];
  evidencePersons?: EvidencePerson[];
  condicionElevacion?: 'No entregado' | 'Entregado';
  horaElevacion?: string;
  personalRecibeAjeno?: string;
  parentCaseId?: number;
  groupedCaseIds?: number[];
  cadenaCustodiaHash?: string;
  resguardoFilmico?: boolean;
}

export interface Expediente {
  id?: number;
  anio: string; // ej. "2026"
  nroExpediente: string; // ej. "121", "154/26"
  caratula: string;
  juzgado: string;
  dependencia: string;
  dependenciaSolicitante?: string;
  tipoOficio: string;
  tipoRequerimiento: string; // CRÍTICO: Resguardo de Evidencia, Descarga Fílmica, etc.
  tipoRequerimientoDetalle?: string;
  fechaIngreso: string; // DD/MM/AAAA
  fechaVencimiento: string; // DD/MM/AAAA
  plazoDias: number;
  personalAsignado: string;
  estado: ExpedienteEstado;
  prioridad: ExpedientePrioridad;
  fechaElevacion: string; // DD/MM/AAAA
  horaElevacion?: string;
  nroNotaElevacion: string;
  personalRecibeAjeno?: string;
  observaciones: string;
  customFieldsJson: string; // JSON de ExpedienteCustomFields
  delegacionId: number;
}

export interface DocumentoPersonal {
  id: string;
  tipo: string; // e.g. "DNI Frente", "Credencial / Placa", etc.
  nombre?: string;
  titulo?: string;
  dataUrl: string;
  fechaCarga?: string;
  fechaSubida?: string;
}

export interface PersonaInvestigada {
  id?: number;
  apellidoNombre: string;
  dni: string;
  observaciones?: string;
  fechaRegistro?: string; // DD/MM/AAAA
  expedientesVinculados?: string[];
  delegacionId?: number;
}

export interface PersonalCustomFields {
  telefono?: string;
  domicilio?: string;
  localidad?: string;
  chapaPlaca?: string;
  armaAsignada?: string;
  chalecoAsignado?: string;
  periodosManuales?: Record<string, { dias: number; estado: 'AUTOMÁTICO' | 'MANUAL' | 'VENCIDA' | 'SIN DÍAS' }>;
  documentosAdjuntos?: DocumentoPersonal[];
  // Pestaña Datos Personales
  sexo?: 'Masculino' | 'Femenino' | 'Otro' | 'M' | 'F' | 'OTRO';
  estadoCivil?: 'Soltero/a' | 'Casado/a' | 'Divorciado/a' | 'Viudo/a' | 'Unión Convivencial' | string;
  email?: string;
  // Pestaña Licencia de Conducir y Documentación
  licenciaConducirNumero?: string;
  licenciaConducirCategorias?: string[];
  licenciaConducirResumen?: string;
  licenciaConducirVencimiento?: string;
  licenciaConducirEstado?: 'Vigente' | 'Vencida' | 'Por Vencer' | 'VIGENTE' | 'VENCIDA' | 'NO_POSEE';
  obraSocial?: string;
  numeroCredencial?: string;
  // Pestaña Equipamiento a Cargo
  armaMarca?: string;
  armaModelo?: string;
  armaSerie?: string;
  armaCalibre?: string;
  armaEstado?: 'ASIGNADA' | 'RETENIDA' | 'SECUESTRADA';
  armaMotivoRetencion?: string;
  armaRetenidaSecuestrada?: boolean;
  motivoRetencionArma?: string;
  chalecoSerie?: string;
  chalecoTalla?: string;
  chalecoEstado?: 'ASIGNADO' | 'RETENIDO' | 'SECUESTRADA';
  chalecoMotivoRetencion?: string;
  chalecoRetenidoSecuestrado?: boolean;
  motivoRetencionChaleco?: string;
}

export interface Personal {
  id?: number;
  jerarquia: string;
  plaza: string;
  apellidoNombre: string;
  dni: string;
  fechaNacimiento: string; // DD/MM/AAAA
  fechaIngreso: string; // DD/MM/AAAA - FUNDAMENTAL para antigüedad
  grupo: string; // "Guardia A", "Guardia B", "Servicio Externo", "Administración"
  contactoEmergencia: string;
  disponible: boolean;
  motivoNoDisponible: string;
  customFieldsJson: string; // JSON de PersonalCustomFields
  delegacionId: number;
}

export type MovilCondicion = 'En Servicio' | 'Fuera de Servicio' | 'Taller' | 'En Reserva';

export interface Movil {
  id?: number;
  identificador: string; // ej. "M-101"
  marca: string;
  modelo: string;
  dominio: string; // Patente
  chasis: string;
  motor: string;
  condicion: MovilCondicion;
  kmActual: string;
  kmUltimoService: string;
  kmProximoService: string;
  vencimientoRto: string; // DD/MM/AAAA
  vencimientoSeguro: string; // DD/MM/AAAA
  companiaSeguro: string;
  numeroPoliza: string;
  observaciones: string;
  delegacionId: number;
}

export interface Reparacion {
  id?: number;
  movilId: number;
  fecha: string; // DD/MM/AAAA
  tallerMecanico: string;
  descripcion: string;
  repuestosCambiados: string;
  costoTotal: number;
  kmMomento: string;
  observaciones: string;
  delegacionId: number;
}

export interface Recargo {
  id?: number;
  personalId: number;
  personalNombre: string;
  personalJerarquia: string;
  fecha: string; // DD/MM/AAAA
  horarioDesde: string; // HH:mm
  horarioHasta: string; // HH:mm
  totalHoras: string;
  tipoRecargo: string;
  lugarDestino: string;
  observaciones: string;
  delegacionId: number;
}

export interface Charla {
  id?: number;
  fecha: string; // DD/MM/AAAA
  lugarInstitucion: string;
  localidad: string;
  temaTratado: string;
  personalDesignado: string;
  cantidadAsistentes: number;
  observaciones: string;
  delegacionId: number;
}

export type TipoLicencia =
  | 'Anual'
  | 'Invernal'
  | 'Extraordinaria'
  | 'Examen'
  | 'Fallecimiento Familiar'
  | 'Matrimonio'
  | 'Atención Familiar';

export interface Licencia {
  id?: number;
  personalId: number;
  jerarquia: string;
  plaza: string;
  apellidoNombre: string;
  dni: string;
  fechaIngreso: string;
  tipoLicencia: TipoLicencia;
  anioPeriodo: number; // ej. 2026
  diasHabilesTomados: number;
  sumaDiasViaje: boolean;
  disposicionViaje: string;
  diasPermitidosViaje: number;
  fueInterrumpida: boolean;
  fechaInterrupcion: string; // DD/MM/AAAA
  motivoInterrupcion: string;
  diasRestantesDevueltos: number;
  observaciones: string;
  periodosDetalleJson: string; // ej. '{"2024": 7, "2025": 14}'
  fechaSalida: string; // "" - omitida de la UI
  fechaReanudacion: string; // "" - omitida de la UI
  delegacionId: number;
}

export interface DynamicCatalog {
  id?: number;
  category:
    | 'Juzgado'
    | 'Dependencias'
    | 'Requerimiento'
    | 'Oficio'
    | 'Jerarquias'
    | 'Grupos'
    | 'Tipos de Recargo'
    | 'Tarea Realizada'
    | 'Localidades'
    | 'Arma Marcas'
    | 'Arma Modelo'
    | 'Chaleco Tallas'
    | 'Tipo Movil'
    | 'Marca Movil'
    | 'Modelo Movil'
    | 'Aseguradoras'
    | string;
  value: string;
  orderIndex?: number;
  delegacionId?: number;
}

export interface DynamicField {
  id?: number;
  entity: 'EXPEDIENTE' | 'PERSONAL' | 'MOVIL' | 'REPARACION' | 'RECARGO' | 'CHARLA' | 'LICENCIA';
  fieldKey: string;
  fieldLabel: string;
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN';
  optionsJson?: string;
  required?: boolean;
}

export interface AttachmentRecord {
  key: string; // e.g. "app_attachment://exp_121_oficio.jpg" or "exp_121_oficio.jpg"
  dataUrl: string;
  mimeType: string;
  name: string;
  updatedAt: string;
}

export interface SgpBackupData {
  personal: Personal[];
  expedientes: Expediente[];
  dynamicFields: DynamicField[];
  dynamicCatalogs: DynamicCatalog[];
  recargos: Recargo[];
  charlas: Charla[];
  moviles: Movil[];
  reparaciones: Reparacion[];
  licencias: Licencia[];
  personas?: PersonaInvestigada[];
}

export interface MembreteLine {
  id: string;
  text: string;
  bold: boolean;
  underline: boolean;
  size: 'XL' | 'LG' | 'MD' | 'SM' | 'XS'; // Título (XL), Subtítulo (LG), Normal (MD), Chico (SM), Mini (XS)
  color: 'AZUL_POLICIAL' | 'GRIS_OSCURO' | 'GRIS_SUAVE' | 'NEGRO';
}

export interface InstitutionalConfig {
  systemName: string; // e.g. "SGP SisPol" or customizable name
  systemFullName: string; // e.g. "SGP / SisPol - Sistema de Gestión Policial"
  province: string;
  policeForce: string;
  division: string;
  subdivision: string;
  unitLocation: string;
  headerTitle: string;
  footerTitle: string;
  footerName: string;
  delegacionId: number;
  logoDataUrl?: string;
  logoLeftUrl?: string; // Logo izquierdo (Escudo Policía de Formosa)
  logoRightUrl?: string; // Logo derecho (Escudo D.G.P.C.)
  mottoLeft?: string; // "La seguridad pública es una construcción colectiva"
  mottoRight?: string; // "D.G.P.C."
  addressLine1?: string; // "Calle San Martín e H. Irigoyen - Bº Centro - Laguna Blanca - C.P. 3613"
  addressLine2?: string; // "Tel.: 3704-040169 / E-mail: pol.delgcrimlagunablanca@formosa.gov.ar"
  telefonosCorreos?: string; // Teléfonos y Correos Institucionales
  siglasDependencia?: string; // e.g. "DPC-LB" (Aparece en: 3812 /2026-DPC-LB)
  textoPiePaginaPdf?: string; // "Documento Reservado de Uso Oficial Interno - Delegación Policía Científica Laguna Blanca."
  headerLines?: MembreteLine[]; // Líneas de texto centrales dinámicas
}

export type UserRole = 'Operador' | 'Administrador' | 'superusuario';

export interface SisPolUser {
  id?: number;
  nombreApellido: string;
  email: string;
  username: string;
  password: string;
  rol: UserRole;
  delegacionId: number;
  canDelete: boolean;
  allowedModules?: string[];
  allowedDelegacionIds?: number[];
  canAdminModules?: boolean;
}

export interface SisPolDelegacion {
  id?: number;
  nombre: string;
  codigo: string;
  ciudad: string;
  configJson?: string;
}

export interface NavModuleItem {
  id: string;
  label: string;
  iconName: string;
  order: number;
  enabled: boolean;
  parentModuleId?: string | null;
}

export interface NumerarioSerie {
  id?: number;
  nombre: string;
  prefijo: string;
  anio: string;
  color: string;
  limiteFolios: number;
  columnas: number;
  delegacionId: number;
  descripcion?: string;
  createdAt?: string;
}

export interface FolioRegistro {
  id?: number;
  serieId: number;
  numero: number;
  rangoInicio?: number;
  rangoFin?: number;
  rangoId?: string;
  caratula: string;
  tipoDocumento: string;
  asunto: string;
  destinatario: string;
  solicitante?: string;
  observaciones?: string;
  fecha: string;
  hora: string;
  usuarioAsigno?: string;
  delegacionId: number;
}


