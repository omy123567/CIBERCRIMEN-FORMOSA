export type PersonnelStatus = 'Activo' | 'Licencia' | 'Comision';

export interface LeaveRecord {
  id: string;
  type: 'Médica' | 'Anual Reglamentaria' | 'Extraordinaria' | 'Maternidad/Paternidad' | 'Duelo' | 'Razones Particulares';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  diagnosis?: string;
  certificateNumber?: string;
  observations?: string;
}

export interface Personnel {
  id: string;
  rank: string; // Jerarquía (Oficial Principal, Sargento, etc.)
  lastName: string;
  firstName: string;
  dni: string;
  address: string;
  locality: string;
  phone: string;
  emergencyContact: string;
  groupSection: string; // Grupo / Turno / Guardia / Secretaría
  status: PersonnelStatus;
  licenseNumber?: string; // Legajo o placa policial
  observations?: string;
  leaves?: LeaveRecord[];
  createdAt: string;
}

export interface EvidencePerson {
  id: string;
  fullName: string;
  dni: string; // Numerical only
}

export interface PPIInfo {
  isInvolved: boolean;
  rank?: string;
  fullName?: string;
  dni?: string;
  badgeNumber?: string;
  roleInCase?: string; // e.g., Imputado, Denunciante, Testigo
}

export interface ElevationInfo {
  isDelivered: boolean;
  deliveryDate?: string;
  elevatedBy?: string; // Personal policial que elevó
  receivedBy?: string; // Mesa de entradas receptora
  receiptNumber?: string;
  receiptImage?: string; // Base64
}

export interface CaseFile {
  id: string;
  caseNumber: string; // N° Expediente
  officialLetterNumber: string; // N° Oficio / Letras
  originCaratula: string; // Expediente Origen / Carátula
  registrationDate: string; // YYYY-MM-DD
  courtJurisdiction: string; // Juzgado / Fiscalía
  requestingAgency: string; // Dependencia Solicitante
  letterType: string; // Tipo de Oficio (Investigativo, Notificación, Allanamiento, etc.)
  requirementType: string; // Tipo de Requerimiento (Resguardo de Evidencia, Escalamiento, etc.)
  taskDone: string; // Tarea Realizada
  summary: string; // Resumen del caso
  observations?: string;
  elevation: ElevationInfo;
  ppi: PPIInfo;
  
  // Resguardo de evidencia personas
  evidencePersons: EvidencePerson[];
  
  // Falta de oficio flag & related
  isFaltaOficio: boolean;
  oficioReceived?: boolean;
  parentCaseId?: string; // If grouped into another case
  groupedCaseIds?: string[]; // If this case resulted from grouping
  
  // Attachments
  attachedImages: {
    id: string;
    name: string;
    dataUrl: string;
    uploadDate: string;
  }[];
  
  createdAt: string;
}

export type VehicleCondition = 'Bueno' | 'Regular' | 'Malo';
export type VehicleOperationalStatus = 'En Servicio' | 'En Taller Mecánico' | 'Fuera de Servicio' | 'Baja definitiva';
export type VehicleType = 'Patrullero' | 'Camioneta' | 'Utilitario' | 'Motovehículo' | 'Camión' | 'Otro';

export interface MechanicalRepair {
  id: string;
  vehicleId: string;
  date: string;
  mileage: number;
  interventionType: 'Mecánica' | 'Chapa y Pintura' | 'Electricidad' | 'Neumáticos' | 'Frenos' | 'Service Periódico' | 'Otro';
  workshopProvider: string;
  description: string;
  cost: number;
  partsReplaced: string;
  receiptImage?: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  type: VehicleType;
  brand: string;
  model: string;
  plate: string; // Dominio / Patente
  internalNumber: string; // N° Móvil / Interno (e.g. "M-14")
  assignedDepartment: string; // Dependencia asignada
  currentMileage: number;
  condition: VehicleCondition;
  operationalStatus: VehicleOperationalStatus;
  
  // Service
  lastServiceDate?: string;
  lastServiceMileage?: number;
  nextServiceMileage: number;
  
  // Documentation
  rtoExpiryDate: string; // Revisión Técnica Obligatoria
  insuranceCompany: string;
  insurancePolicyNumber: string;
  insuranceExpiryDate: string;
  
  createdAt: string;
}

export interface OvertimeDuty {
  id: string;
  date: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  totalHours: number;
  dutyType: string; // Operativo Nocturno, Prevención Bancaria, etc.
  location: string;
  assignedPersonnelIds: string[];
  attendedPersonnelIds: string[];
  hourlyRate?: number;
  notes?: string;
  approvedBy?: string;
  status: 'Programado' | 'En Curso' | 'Completado' | 'Cancelado';
  createdAt: string;
}

export interface TrainingLecture {
  id: string;
  date: string;
  title: string;
  topic: string;
  instructor: string;
  instructorRank?: string;
  location: string;
  attendeePersonnelIds: string[];
  hoursDuration: number;
  observations?: string;
  createdAt: string;
}

export interface SystemCatalogs {
  ranks: string[];
  letterTypes: string[];
  requirementTypes: string[];
  taskTypes: string[];
  courts: string[];
  requestingAgencies: string[];
  groupSections: string[];
  vehicleTypes: string[];
  repairTypes: string[];
  overtimeTypes: string[];
}

export interface LetterheadConfig {
  unitName: string;
  institutionalSubtitle: string;
  jurisdiction: string;
  stationAddress: string;
  stationPhone: string;
  logoDataUrl?: string; // Custom badge/shield
  footerOfficerTitle: string; // e.g. "Jefe de División Operativa"
  footerOfficerName: string;
}

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  autoSync: boolean;
  lastSyncTimestamp?: string;
  isConnected: boolean;
}

export interface AppDatabase {
  personnel: Personnel[];
  cases: CaseFile[];
  vehicles: Vehicle[];
  repairs: MechanicalRepair[];
  overtime: OvertimeDuty[];
  trainings: TrainingLecture[];
  catalogs: SystemCatalogs;
  letterhead: LetterheadConfig;
  supabaseConfig: SupabaseConfig;
}
