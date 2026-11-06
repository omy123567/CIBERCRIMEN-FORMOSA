import Dexie, { Table } from 'dexie';
import {
  Expediente,
  Personal,
  Movil,
  Reparacion,
  Recargo,
  Charla,
  Licencia,
  DynamicCatalog,
  DynamicField,
  AttachmentRecord,
  SgpBackupData,
  InstitutionalConfig,
  PersonaInvestigada,
  SisPolUser,
  SisPolDelegacion,
  NumerarioSerie,
  FolioRegistro,
  CustomRoleDefinition
} from '../types/sgp';
import { initialSgpBackup, initialInstitutionalConfig } from './sgpInitialData';
import {
  PeriodDateRange,
  EntitySelection,
  parseDateToTime,
  isTimestampInPeriod,
  PeriodCounts
} from '../utils/periodFilter';

export class SisPolDatabase extends Dexie {
  expedientes!: Table<Expediente, number>;
  personal!: Table<Personal, number>;
  moviles!: Table<Movil, number>;
  reparaciones!: Table<Reparacion, number>;
  recargos!: Table<Recargo, number>;
  charlas!: Table<Charla, number>;
  licencias!: Table<Licencia, number>;
  personas!: Table<PersonaInvestigada, number>;
  dynamicCatalogs!: Table<DynamicCatalog, number>;
  dynamicFields!: Table<DynamicField, number>;
  attachments!: Table<AttachmentRecord, string>;
  settings!: Table<{ key: string; value: any }, string>;
  users!: Table<SisPolUser, number>;
  delegaciones!: Table<SisPolDelegacion, number>;
  seriesNumerario!: Table<NumerarioSerie, number>;
  foliosNumerario!: Table<FolioRegistro, number>;
  customRoles!: Table<CustomRoleDefinition, number>;

  constructor() {
    super('SisPolDB_Formosa');

    this.version(1).stores({
      expedientes: '++id, anio, nroExpediente, estado, tipoRequerimiento, juzgado, fechaIngreso, fechaVencimiento, delegacionId',
      personal: '++id, jerarquia, apellidoNombre, dni, grupo, disponible, delegacionId',
      moviles: '++id, identificador, dominio, condicion, delegacionId',
      reparaciones: '++id, movilId, fecha, delegacionId',
      recargos: '++id, personalId, fecha, delegacionId',
      charlas: '++id, fecha, localidad, delegacionId',
      licencias: '++id, personalId, anioPeriodo, tipoLicencia, delegacionId',
      personas: '++id, dni, apellidoNombre, delegacionId',
      dynamicCatalogs: '++id, category, value, delegacionId',
      dynamicFields: '++id, entity, fieldKey',
      attachments: 'key, mimeType, name, updatedAt',
      settings: 'key'
    });

    this.version(2).stores({
      expedientes: '++id, anio, nroExpediente, estado, tipoRequerimiento, juzgado, fechaIngreso, fechaVencimiento, delegacionId',
      personal: '++id, jerarquia, apellidoNombre, dni, grupo, disponible, delegacionId',
      moviles: '++id, identificador, dominio, condicion, delegacionId',
      reparaciones: '++id, movilId, fecha, delegacionId',
      recargos: '++id, personalId, fecha, delegacionId',
      charlas: '++id, fecha, localidad, delegacionId',
      licencias: '++id, personalId, anioPeriodo, tipoLicencia, delegacionId',
      personas: '++id, dni, apellidoNombre, delegacionId',
      dynamicCatalogs: '++id, category, value, delegacionId',
      dynamicFields: '++id, entity, fieldKey',
      attachments: 'key, mimeType, name, updatedAt',
      settings: 'key'
    });

    this.version(3).stores({
      expedientes: '++id, anio, nroExpediente, estado, tipoRequerimiento, juzgado, fechaIngreso, fechaVencimiento, delegacionId',
      personal: '++id, jerarquia, apellidoNombre, dni, grupo, disponible, delegacionId',
      moviles: '++id, identificador, dominio, condicion, delegacionId',
      reparaciones: '++id, movilId, fecha, delegacionId',
      recargos: '++id, personalId, fecha, delegacionId',
      charlas: '++id, fecha, localidad, delegacionId',
      licencias: '++id, personalId, anioPeriodo, tipoLicencia, delegacionId',
      personas: '++id, dni, apellidoNombre, delegacionId',
      dynamicCatalogs: '++id, category, value, delegacionId',
      dynamicFields: '++id, entity, fieldKey',
      attachments: 'key, mimeType, name, updatedAt',
      settings: 'key',
      users: '++id, &username, email, rol, delegacionId',
      delegaciones: '++id, &codigo, nombre'
    });

    this.version(4).stores({
      expedientes: '++id, anio, nroExpediente, estado, tipoRequerimiento, juzgado, fechaIngreso, fechaVencimiento, delegacionId',
      personal: '++id, jerarquia, apellidoNombre, dni, grupo, disponible, delegacionId',
      moviles: '++id, identificador, dominio, condicion, delegacionId',
      reparaciones: '++id, movilId, fecha, delegacionId',
      recargos: '++id, personalId, fecha, delegacionId',
      charlas: '++id, fecha, localidad, delegacionId',
      licencias: '++id, personalId, anioPeriodo, tipoLicencia, delegacionId',
      personas: '++id, dni, apellidoNombre, delegacionId',
      dynamicCatalogs: '++id, category, value, delegacionId',
      dynamicFields: '++id, entity, fieldKey',
      attachments: 'key, mimeType, name, updatedAt',
      settings: 'key',
      users: '++id, &username, email, rol, delegacionId',
      delegaciones: '++id, &codigo, nombre',
      seriesNumerario: '++id, nombre, prefijo, anio, delegacionId',
      foliosNumerario: '++id, serieId, numero, rangoId, delegacionId, fecha, destinatario, tipoDocumento'
    });

    this.version(5).stores({
      expedientes: '++id, anio, nroExpediente, estado, tipoRequerimiento, juzgado, fechaIngreso, fechaVencimiento, delegacionId',
      personal: '++id, jerarquia, apellidoNombre, dni, grupo, disponible, delegacionId',
      moviles: '++id, identificador, dominio, condicion, delegacionId',
      reparaciones: '++id, movilId, fecha, delegacionId',
      recargos: '++id, personalId, fecha, delegacionId',
      charlas: '++id, fecha, localidad, delegacionId',
      licencias: '++id, personalId, anioPeriodo, tipoLicencia, delegacionId',
      personas: '++id, dni, apellidoNombre, delegacionId',
      dynamicCatalogs: '++id, category, value, delegacionId',
      dynamicFields: '++id, entity, fieldKey',
      attachments: 'key, mimeType, name, updatedAt',
      settings: 'key',
      users: '++id, &username, email, rol, delegacionId',
      delegaciones: '++id, &codigo, nombre',
      seriesNumerario: '++id, nombre, prefijo, anio, delegacionId',
      foliosNumerario: '++id, serieId, numero, rangoId, delegacionId, fecha, destinatario, tipoDocumento',
      customRoles: '++id, &nombre, canDelete'
    });
  }
}



export const db = new SisPolDatabase();

class SgpManager {
  private isInitialized = false;
  private subscribers: Set<() => void> = new Set();

  public subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  public notify() {
    this.subscribers.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error notifying subscriber:', err);
      }
    });
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await db.open();
      const count = await db.expedientes.count();
      if (count === 0) {
        // Seed initial data
        await this.seedInitial();
      } else {
        // Verify personas count
        const pCount = await db.personas.count();
        if (pCount === 0 && initialSgpBackup.personas?.length) {
          await db.personas.bulkAdd(initialSgpBackup.personas);
        }
      }

      // Ensure default delegations exist
      const delCount = await db.delegaciones.count();
      if (delCount === 0) {
        await this.seedDefaultDelegaciones();
      }

      // Ensure default users exist
      const userCount = await db.users.count();
      if (userCount === 0) {
        await this.seedDefaultUsers();
      }

      // Ensure default numerario series exist
      const seriesCount = await db.seriesNumerario.count();
      if (seriesCount === 0) {
        await this.seedDefaultNumerario();
      }

      this.isInitialized = true;

      // Setup synchronization with central SQLite server
      if (!this.hooksConfigured) {
        this.setupServerSyncHooks();
        this.hooksConfigured = true;
      }

      // Initial pull from central SQLite server
      await this.syncWithServer();
    } catch (err) {
      console.error('Failed to open Dexie database:', err);
    }
  }

  private hooksConfigured = false;

  public async syncWithServer(): Promise<boolean> {
    try {
      const res = await fetch('/api/sync/all');
      if (!res.ok) return false;
      const data = await res.json();

      await db.transaction('rw', [
        db.expedientes,
        db.personal,
        db.moviles,
        db.reparaciones,
        db.recargos,
        db.charlas,
        db.licencias,
        db.personas,
        db.dynamicCatalogs,
        db.delegaciones,
        db.seriesNumerario,
        db.foliosNumerario,
        db.customRoles
      ], async () => {
        if (data.expedientes && Array.isArray(data.expedientes)) {
          await db.expedientes.clear();
          await db.expedientes.bulkAdd(data.expedientes);
        }
        if (data.personal && Array.isArray(data.personal)) {
          await db.personal.clear();
          await db.personal.bulkAdd(data.personal);
        }
        if (data.moviles && Array.isArray(data.moviles)) {
          await db.moviles.clear();
          await db.moviles.bulkAdd(data.moviles);
        }
        if (data.reparaciones && Array.isArray(data.reparaciones)) {
          await db.reparaciones.clear();
          await db.reparaciones.bulkAdd(data.reparaciones);
        }
        if (data.recargos && Array.isArray(data.recargos)) {
          await db.recargos.clear();
          await db.recargos.bulkAdd(data.recargos);
        }
        if (data.charlas && Array.isArray(data.charlas)) {
          await db.charlas.clear();
          await db.charlas.bulkAdd(data.charlas);
        }
        if (data.licencias && Array.isArray(data.licencias)) {
          await db.licencias.clear();
          await db.licencias.bulkAdd(data.licencias);
        }
        if (data.personas && Array.isArray(data.personas)) {
          const parsedPersonas = data.personas.map((p: any) => ({
            ...p,
            expedientesVinculados: typeof p.expedientesVinculados === 'string'
              ? (() => { try { return JSON.parse(p.expedientesVinculados); } catch { return []; } })()
              : (Array.isArray(p.expedientesVinculados) ? p.expedientesVinculados : [])
          }));
          await db.personas.clear();
          await db.personas.bulkAdd(parsedPersonas);
        }
        if (data.dynamicCatalogs && Array.isArray(data.dynamicCatalogs)) {
          await db.dynamicCatalogs.clear();
          await db.dynamicCatalogs.bulkAdd(data.dynamicCatalogs);
        }
        if (data.delegaciones && Array.isArray(data.delegaciones)) {
          await db.delegaciones.clear();
          await db.delegaciones.bulkAdd(data.delegaciones);
        }
        if (data.seriesNumerario && Array.isArray(data.seriesNumerario)) {
          await db.seriesNumerario.clear();
          await db.seriesNumerario.bulkAdd(data.seriesNumerario);
        }
        if (data.foliosNumerario && Array.isArray(data.foliosNumerario)) {
          await db.foliosNumerario.clear();
          await db.foliosNumerario.bulkAdd(data.foliosNumerario);
        }
        if (data.roles && Array.isArray(data.roles)) {
          await db.customRoles.clear();
          await db.customRoles.bulkAdd(data.roles);
        }
      });

      // Also sync users
      try {
        const uRes = await fetch('/api/users');
        if (uRes.ok) {
          const uList = await uRes.json();
          if (Array.isArray(uList) && uList.length > 0) {
            await db.users.clear();
            await db.users.bulkAdd(uList);
          }
        }
      } catch {
        // ignore offline users pull
      }

      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  private setupServerSyncHooks() {
    if (typeof window === 'undefined') return;

    const sendMutation = (endpoint: string, method: string, body?: any) => {
      fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      }).catch(() => {});
    };

    // Expedientes
    db.expedientes.hook('creating', (_primKey, obj) => {
      sendMutation('/api/expedientes', 'POST', obj);
    });
    db.expedientes.hook('updating', (modifications, primKey, obj) => {
      sendMutation(`/api/expedientes/${primKey}`, 'PUT', { ...obj, ...modifications });
    });
    db.expedientes.hook('deleting', (primKey) => {
      sendMutation(`/api/expedientes/${primKey}`, 'DELETE');
    });

    // Personal
    db.personal.hook('creating', (_primKey, obj) => {
      sendMutation('/api/personal', 'POST', obj);
    });
    db.personal.hook('updating', (modifications, primKey, obj) => {
      sendMutation(`/api/personal/${primKey}`, 'PUT', { ...obj, ...modifications });
    });
    db.personal.hook('deleting', (primKey) => {
      sendMutation(`/api/personal/${primKey}`, 'DELETE');
    });

    // Moviles
    db.moviles.hook('creating', (_primKey, obj) => {
      sendMutation('/api/moviles', 'POST', obj);
    });
    db.moviles.hook('updating', (modifications, primKey, obj) => {
      sendMutation(`/api/moviles/${primKey}`, 'PUT', { ...obj, ...modifications });
    });
    db.moviles.hook('deleting', (primKey) => {
      sendMutation(`/api/moviles/${primKey}`, 'DELETE');
    });

    // Folios
    db.foliosNumerario.hook('creating', (_primKey, obj) => {
      const folioToSend = {
        ...obj,
        anio: Number(obj.anio) || new Date().getFullYear()
      };
      sendMutation('/api/numerario/folios', 'POST', folioToSend);
    });
    db.foliosNumerario.hook('updating', (modifications, primKey, obj) => {
      sendMutation(`/api/numerario/folios/${primKey}`, 'PUT', { ...obj, ...modifications });
    });
    db.foliosNumerario.hook('deleting', (primKey) => {
      sendMutation(`/api/numerario/folios/${primKey}`, 'DELETE');
    });

    // Personas Investigadas
    db.personas.hook('creating', (_primKey, obj) => {
      sendMutation('/api/personas', 'POST', obj);
    });
    db.personas.hook('updating', (modifications, primKey, obj) => {
      sendMutation(`/api/personas/${primKey}`, 'PUT', { ...obj, ...modifications });
    });
    db.personas.hook('deleting', (primKey) => {
      sendMutation(`/api/personas/${primKey}`, 'DELETE');
    });

    // Catálogos Dinámicos
    db.dynamicCatalogs.hook('creating', (_primKey, obj) => {
      sendMutation('/api/dynamic-catalogs', 'POST', obj);
    });
    db.dynamicCatalogs.hook('deleting', (primKey) => {
      sendMutation(`/api/dynamic-catalogs/${primKey}`, 'DELETE');
    });

    // Custom Roles
    db.customRoles.hook('creating', (_primKey, obj) => {
      sendMutation('/api/roles', 'POST', obj);
    });
    db.customRoles.hook('updating', (modifications, primKey, obj) => {
      sendMutation(`/api/roles/${primKey}`, 'PUT', { ...obj, ...modifications });
    });
    db.customRoles.hook('deleting', (primKey) => {
      sendMutation(`/api/roles/${primKey}`, 'DELETE');
    });

    // Periodical background pull every 20 seconds
    setInterval(() => {
      this.syncWithServer();
    }, 20000);

    // Pull immediately when user refocuses window
    window.addEventListener('focus', () => {
      this.syncWithServer();
    });
  }


  public async seedDefaultDelegaciones(): Promise<void> {
    const defaultDelegaciones: SisPolDelegacion[] = [
      {
        id: 1,
        nombre: 'Delegación Policía Científica Laguna Blanca',
        codigo: 'DPC-LB',
        ciudad: 'Laguna Blanca'
      },
      {
        id: 2,
        nombre: 'Delegación Policía Científica Clorinda',
        codigo: 'DPC-CLO',
        ciudad: 'Clorinda'
      },
      {
        id: 3,
        nombre: 'Dirección General Policía Científica - Capital',
        codigo: 'DGPC-CAP',
        ciudad: 'Formosa Capital'
      },
      {
        id: 4,
        nombre: 'Delegación Policía Científica Las Lomitas',
        codigo: 'DPC-LOM',
        ciudad: 'Las Lomitas'
      },
      {
        id: 5,
        nombre: 'Delegación Policía Científica Pirané',
        codigo: 'DPC-PIR',
        ciudad: 'Pirané'
      }
    ];
    await db.delegaciones.bulkAdd(defaultDelegaciones);
  }

  public async seedDefaultUsers(): Promise<void> {
    const allModules = [
      'dashboard',
      'expedientes',
      'numerario',
      'ppi',
      'personas',
      'personal',
      'licencias',
      'moviles',
      'recargos',
      'charlas',
      'membrete',
      'catalogos',
      'respaldos',
      'usuarios',
      'modulos'
    ];

    const defaultUsers: SisPolUser[] = [
      {
        id: 1,
        nombreApellido: 'Superintendente Forense D.G.P.C.',
        email: 'superadmin.dgpc@formosa.gov.ar',
        username: 'superadmin',
        password: 'admin123',
        rol: 'superusuario',
        delegacionId: 1,
        canDelete: true,
        allowedModules: allModules,
        allowedDelegacionIds: [1, 2, 3, 4, 5],
        canAdminModules: true
      },
      {
        id: 2,
        nombreApellido: 'Crio. Insp. Lic. Gómez, Roberto M.',
        email: 'pol.delgcrimlagunablanca@formosa.gov.ar',
        username: 'admin.lb',
        password: 'policia2026',
        rol: 'Administrador',
        delegacionId: 1,
        canDelete: true,
        allowedModules: allModules.filter(m => m !== 'modulos'),
        allowedDelegacionIds: [1],
        canAdminModules: false
      },
      {
        id: 3,
        nombreApellido: 'Cabo 1° Sosa, Andrea Beatríz',
        email: 'andrea.sosa@formosa.gov.ar',
        username: 'operador.lb',
        password: 'operador123',
        rol: 'Operador',
        delegacionId: 1,
        canDelete: false,
        allowedModules: ['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas'],
        allowedDelegacionIds: [1],
        canAdminModules: false
      },
      {
        id: 4,
        nombreApellido: 'Comisario Villamayor, Carlos',
        email: 'pol.delgcrimclorinda@formosa.gov.ar',
        username: 'admin.clorinda',
        password: 'policia2026',
        rol: 'Administrador',
        delegacionId: 2,
        canDelete: true,
        allowedModules: allModules.filter(m => m !== 'modulos'),
        allowedDelegacionIds: [2],
        canAdminModules: false
      }
    ];

    await db.users.bulkAdd(defaultUsers);
  }

  public async seedInitial(): Promise<void> {
    await db.transaction('rw', [
      db.expedientes,
      db.personal,
      db.moviles,
      db.reparaciones,
      db.recargos,
      db.charlas,
      db.licencias,
      db.personas,
      db.dynamicCatalogs,
      db.dynamicFields,
      db.settings,
      db.delegaciones,
      db.users
    ], async () => {
      await db.expedientes.clear();
      await db.personal.clear();
      await db.moviles.clear();
      await db.reparaciones.clear();
      await db.recargos.clear();
      await db.charlas.clear();
      await db.licencias.clear();
      await db.personas.clear();
      await db.dynamicCatalogs.clear();
      await db.dynamicFields.clear();
      await db.delegaciones.clear();
      await db.users.clear();

      await db.expedientes.bulkAdd(initialSgpBackup.expedientes);
      await db.personal.bulkAdd(initialSgpBackup.personal);
      await db.moviles.bulkAdd(initialSgpBackup.moviles);
      await db.reparaciones.bulkAdd(initialSgpBackup.reparaciones);
      await db.recargos.bulkAdd(initialSgpBackup.recargos);
      await db.charlas.bulkAdd(initialSgpBackup.charlas);
      await db.licencias.bulkAdd(initialSgpBackup.licencias);
      if (initialSgpBackup.personas?.length) {
        await db.personas.bulkAdd(initialSgpBackup.personas);
      }
      await db.dynamicCatalogs.bulkAdd(initialSgpBackup.dynamicCatalogs);
      await db.settings.put({ key: 'institutionalConfig', value: initialInstitutionalConfig });
      await db.settings.put({ key: 'institutionalConfig_1', value: initialInstitutionalConfig });

      await this.seedDefaultDelegaciones();
      await this.seedDefaultUsers();
    });
    this.notify();
  }

  // --- Attachments / Images in IndexedDB ---
  public async saveAttachment(key: string, dataUrl: string, name: string, mimeType = 'image/jpeg'): Promise<string> {
    await db.attachments.put({
      key,
      dataUrl,
      mimeType,
      name,
      updatedAt: new Date().toISOString()
    });
    return key;
  }

  public async getAttachment(key: string): Promise<string | undefined> {
    if (!key) return undefined;
    if (key.startsWith('data:image')) return key;
    const item = await db.attachments.get(key);
    return item?.dataUrl;
  }

  // --- Settings per Delegation ---
  public async getInstitutionalConfig(delegacionId: number = 1): Promise<InstitutionalConfig> {
    const key = `institutionalConfig_${delegacionId}`;
    const specificItem = await db.settings.get(key);
    if (specificItem?.value) {
      return specificItem.value;
    }

    if (delegacionId === 1) {
      const generalItem = await db.settings.get('institutionalConfig');
      const base = generalItem?.value || initialInstitutionalConfig;
      return base;
    }

    // Generate specific customized config for other delegations
    const del = await db.delegaciones.get(delegacionId);
    const delNombre = del?.nombre || `Delegación Policía Científica ${del?.ciudad || ''}`;
    const delCodigo = del?.codigo || 'DPC';
    const ciudad = del?.ciudad || 'Formosa';

    const customConfig: InstitutionalConfig = {
      ...initialInstitutionalConfig,
      delegacionId,
      subdivision: delNombre.toUpperCase(),
      unitLocation: `${ciudad} - Provincia de Formosa`,
      headerTitle: `POLICÍA DE LA PROVINCIA DE FORMOSA - ${delNombre.toUpperCase()}`,
      siglasDependencia: delCodigo,
      textoPiePaginaPdf: `Documento Reservado de Uso Oficial Interno - ${delNombre}.`,
      headerLines: [
        {
          id: 'line-1',
          text: 'POLICÍA DE LA PROVINCIA DE FORMOSA',
          bold: true,
          underline: false,
          size: 'XL',
          color: 'AZUL_POLICIAL'
        },
        {
          id: 'line-2',
          text: 'DIRECCIÓN GENERAL POLICÍA CIENTÍFICA',
          bold: true,
          underline: false,
          size: 'LG',
          color: 'AZUL_POLICIAL'
        },
        {
          id: 'line-3',
          text: delNombre.toUpperCase(),
          bold: true,
          underline: true,
          size: 'LG',
          color: 'AZUL_POLICIAL'
        },
        {
          id: 'line-4',
          text: `${ciudad} - Provincia de Formosa`,
          bold: false,
          underline: false,
          size: 'SM',
          color: 'GRIS_SUAVE'
        }
      ]
    };

    await db.settings.put({ key, value: customConfig });
    return customConfig;
  }

  public async saveInstitutionalConfig(config: InstitutionalConfig, delegacionId: number = 1): Promise<void> {
    const key = `institutionalConfig_${delegacionId}`;
    await db.settings.put({ key, value: config });
    if (delegacionId === 1) {
      await db.settings.put({ key: 'institutionalConfig', value: config });
    }
    this.notify();
  }

  // --- Multi-User Management ---
  public async getUsers(): Promise<SisPolUser[]> {
    await this.initialize();
    return await db.users.toArray();
  }

  public async addUser(user: SisPolUser): Promise<number> {
    await this.initialize();
    const id = await db.users.add(user);
    this.notify();
    return id;
  }

  public async updateUser(id: number, changes: Partial<SisPolUser>): Promise<void> {
    await this.initialize();
    await db.users.update(id, changes);
    this.notify();
  }

  public async deleteUser(id: number): Promise<void> {
    await this.initialize();
    await db.users.delete(id);
    this.notify();
  }

  public async authenticate(username: string, pass: string): Promise<SisPolUser | null> {
    await this.initialize();
    const u = await db.users.where('username').equals(username.trim()).first();
    if (u && u.password === pass) {
      return u;
    }
    return null;
  }

  public async changePassword(userId: number, newPass: string): Promise<boolean> {
    await this.initialize();
    const u = await db.users.get(userId);
    if (!u) return false;
    await db.users.update(userId, { password: newPass });
    this.notify();
    return true;
  }

  // --- Delegaciones Management ---
  public async getDelegaciones(): Promise<SisPolDelegacion[]> {
    await this.initialize();
    return await db.delegaciones.toArray();
  }

  public async addDelegacion(del: SisPolDelegacion): Promise<number> {
    await this.initialize();
    const id = await db.delegaciones.add(del);
    this.notify();
    return id;
  }

  public async updateDelegacion(id: number, changes: Partial<SisPolDelegacion>): Promise<void> {
    await this.initialize();
    await db.delegaciones.update(id, changes);
    this.notify();
  }

  // --- Independent Numbering for Expedientes ---
  public async getNextExpedienteNumber(delegacionId: number, anio: string = '2026'): Promise<string> {
    const exps = await db.expedientes
      .where('delegacionId')
      .equals(delegacionId)
      .toArray();

    const anioExps = exps.filter(e => e.anio === anio);
    let maxNum = 0;
    anioExps.forEach(e => {
      const match = e.nroExpediente.match(/\d+/);
      if (match) {
        const n = parseInt(match[0], 10);
        if (n > maxNum) maxNum = n;
      }
    });

    const next = maxNum + 1;
    return `${next}/${anio.slice(-2)}`;
  }


  // --- Export Full Backup matching backup_data.json ---
  public async getBackupData(): Promise<SgpBackupData> {
    await this.initialize();
    const personal = await db.personal.toArray();
    const expedientes = await db.expedientes.toArray();
    const dynamicFields = await db.dynamicFields.toArray();
    const dynamicCatalogs = await db.dynamicCatalogs.toArray();
    const recargos = await db.recargos.toArray();
    const charlas = await db.charlas.toArray();
    const moviles = await db.moviles.toArray();
    const reparaciones = await db.reparaciones.toArray();
    const licencias = await db.licencias.toArray();
    const personas = await db.personas.toArray();

    return {
      personal,
      expedientes,
      dynamicFields,
      dynamicCatalogs,
      recargos,
      charlas,
      moviles,
      reparaciones,
      licencias,
      personas
    };
  }

  // --- Restore from SgpBackupData ---
  public async restoreBackupData(data: SgpBackupData): Promise<void> {
    if (!data.personal || !data.expedientes) {
      throw new Error('Estructura de respaldo no válida. Debe contener personal y expedientes.');
    }

    await db.transaction('rw', [
      db.expedientes,
      db.personal,
      db.moviles,
      db.reparaciones,
      db.recargos,
      db.charlas,
      db.licencias,
      db.personas,
      db.dynamicCatalogs,
      db.dynamicFields
    ], async () => {
      await db.personal.clear();
      await db.expedientes.clear();
      await db.moviles.clear();
      await db.reparaciones.clear();
      await db.recargos.clear();
      await db.charlas.clear();
      await db.licencias.clear();
      await db.personas.clear();
      await db.dynamicCatalogs.clear();
      await db.dynamicFields.clear();

      if (data.personal?.length) await db.personal.bulkAdd(data.personal);
      if (data.expedientes?.length) await db.expedientes.bulkAdd(data.expedientes);
      if (data.moviles?.length) await db.moviles.bulkAdd(data.moviles);
      if (data.reparaciones?.length) await db.reparaciones.bulkAdd(data.reparaciones);
      if (data.recargos?.length) await db.recargos.bulkAdd(data.recargos);
      if (data.charlas?.length) await db.charlas.bulkAdd(data.charlas);
      if (data.licencias?.length) await db.licencias.bulkAdd(data.licencias);
      if (data.personas?.length) await db.personas.bulkAdd(data.personas);
      if (data.dynamicCatalogs?.length) await db.dynamicCatalogs.bulkAdd(data.dynamicCatalogs);
      if (data.dynamicFields?.length) await db.dynamicFields.bulkAdd(data.dynamicFields);
    });

    this.notify();
  }

  // --- Purge Data by Period ---
  public async purgeDataByPeriod(
    range: PeriodDateRange,
    entities: EntitySelection,
    delegacionId?: number
  ): Promise<PeriodCounts> {
    const startTime = range.startDate.getTime();
    const endTime = range.endDate.getTime();

    // 1. Sync with server API
    try {
      await fetch('/api/maintenance/purge-period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime,
          endTime,
          entities,
          delegacionId
        })
      });
    } catch (e) {
      console.warn('[Dexie] Warning calling /api/maintenance/purge-period:', e);
    }

    // 2. Perform local deletion in Dexie
    const deletedCounts: PeriodCounts = {
      expedientes: 0,
      foliosNumerario: 0,
      personas: 0,
      licencias: 0,
      recargos: 0,
      reparaciones: 0,
      charlas: 0,
      total: 0
    };

    await db.transaction('rw', [
      db.expedientes,
      db.foliosNumerario,
      db.personas,
      db.licencias,
      db.recargos,
      db.reparaciones,
      db.charlas
    ], async () => {
      if (entities.expedientes) {
        const allExp = await db.expedientes.toArray();
        const toDelete = allExp.filter(e => {
          if (delegacionId && e.delegacionId && e.delegacionId !== delegacionId) return false;
          return isTimestampInPeriod(parseDateToTime(e.fechaIngreso), startTime, endTime);
        });
        if (toDelete.length > 0) {
          await db.expedientes.bulkDelete(toDelete.map(e => e.id!));
          deletedCounts.expedientes = toDelete.length;
        }
      }

      if (entities.foliosNumerario) {
        const allFolios = await db.foliosNumerario.toArray();
        const toDelete = allFolios.filter(f => {
          const t = parseDateToTime(f.fecha || f.fechaAsignacion) || (f.anio ? parseDateToTime(f.anio) : null);
          return isTimestampInPeriod(t, startTime, endTime);
        });
        if (toDelete.length > 0) {
          await db.foliosNumerario.bulkDelete(toDelete.map(f => f.id!));
          deletedCounts.foliosNumerario = toDelete.length;
        }
      }

      if (entities.personas) {
        const allPersonas = await db.personas.toArray();
        const toDelete = allPersonas.filter(p => {
          if (delegacionId && p.delegacionId && p.delegacionId !== delegacionId) return false;
          return isTimestampInPeriod(parseDateToTime(p.fechaRegistro), startTime, endTime);
        });
        if (toDelete.length > 0) {
          await db.personas.bulkDelete(toDelete.map(p => p.id!));
          deletedCounts.personas = toDelete.length;
        }
      }

      if (entities.licencias) {
        const allLic = await db.licencias.toArray();
        const toDelete = allLic.filter(l => {
          if (delegacionId && l.delegacionId && l.delegacionId !== delegacionId) return false;
          const t = parseDateToTime(l.fechaSalida) || parseDateToTime(l.fechaIngreso) || (l.anioPeriodo ? parseDateToTime(l.anioPeriodo) : null);
          return isTimestampInPeriod(t, startTime, endTime);
        });
        if (toDelete.length > 0) {
          await db.licencias.bulkDelete(toDelete.map(l => l.id!));
          deletedCounts.licencias = toDelete.length;
        }
      }

      if (entities.recargos) {
        const allRec = await db.recargos.toArray();
        const toDelete = allRec.filter(r => {
          if (delegacionId && r.delegacionId && r.delegacionId !== delegacionId) return false;
          return isTimestampInPeriod(parseDateToTime(r.fecha), startTime, endTime);
        });
        if (toDelete.length > 0) {
          await db.recargos.bulkDelete(toDelete.map(r => r.id!));
          deletedCounts.recargos = toDelete.length;
        }
      }

      if (entities.reparaciones) {
        const allRep = await db.reparaciones.toArray();
        const toDelete = allRep.filter(r => {
          if (delegacionId && r.delegacionId && r.delegacionId !== delegacionId) return false;
          return isTimestampInPeriod(parseDateToTime(r.fecha), startTime, endTime);
        });
        if (toDelete.length > 0) {
          await db.reparaciones.bulkDelete(toDelete.map(r => r.id!));
          deletedCounts.reparaciones = toDelete.length;
        }
      }

      if (entities.charlas) {
        const allCh = await db.charlas.toArray();
        const toDelete = allCh.filter(c => {
          if (delegacionId && c.delegacionId && c.delegacionId !== delegacionId) return false;
          return isTimestampInPeriod(parseDateToTime(c.fecha), startTime, endTime);
        });
        if (toDelete.length > 0) {
          await db.charlas.bulkDelete(toDelete.map(c => c.id!));
          deletedCounts.charlas = toDelete.length;
        }
      }
    });

    deletedCounts.total = deletedCounts.expedientes + deletedCounts.foliosNumerario + deletedCounts.personas +
      deletedCounts.licencias + deletedCounts.recargos + deletedCounts.reparaciones + deletedCounts.charlas;

    this.notify();
    return deletedCounts;
  }

  // --- Restore Data by Period ---
  public async restoreDataByPeriod(
    data: Partial<SgpBackupData>,
    range: PeriodDateRange,
    entities: EntitySelection,
    mode: 'merge' | 'replace',
    delegacionId?: number
  ): Promise<PeriodCounts> {
    const startTime = range.startDate.getTime();
    const endTime = range.endDate.getTime();

    // 1. Sync with server API
    try {
      await fetch('/api/maintenance/restore-period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime,
          endTime,
          entities,
          mode,
          data,
          delegacionId
        })
      });
    } catch (e) {
      console.warn('[Dexie] Warning calling /api/maintenance/restore-period:', e);
    }

    // 2. If mode === 'replace', purge existing records within this range first
    if (mode === 'replace') {
      await this.purgeDataByPeriod(range, entities, delegacionId);
    }

    const restoredCounts: PeriodCounts = {
      expedientes: 0,
      foliosNumerario: 0,
      personas: 0,
      licencias: 0,
      recargos: 0,
      reparaciones: 0,
      charlas: 0,
      total: 0
    };

    await db.transaction('rw', [
      db.expedientes,
      db.foliosNumerario,
      db.personas,
      db.licencias,
      db.recargos,
      db.reparaciones,
      db.charlas
    ], async () => {
      if (entities.expedientes && data.expedientes?.length) {
        const toAdd = data.expedientes.filter(e => isTimestampInPeriod(parseDateToTime(e.fechaIngreso), startTime, endTime));
        if (toAdd.length > 0) {
          for (const item of toAdd) {
            await db.expedientes.put(item);
          }
          restoredCounts.expedientes = toAdd.length;
        }
      }

      if (entities.foliosNumerario && data.foliosNumerario?.length) {
        const toAdd = data.foliosNumerario.filter((f: any) => {
          const t = parseDateToTime(f.fecha || f.fechaAsignacion) || (f.anio ? parseDateToTime(f.anio) : null);
          return isTimestampInPeriod(t, startTime, endTime);
        });
        if (toAdd.length > 0) {
          for (const item of toAdd) {
            await db.foliosNumerario.put(item);
          }
          restoredCounts.foliosNumerario = toAdd.length;
        }
      }

      if (entities.personas && data.personas?.length) {
        const toAdd = data.personas.filter(p => isTimestampInPeriod(parseDateToTime(p.fechaRegistro), startTime, endTime));
        if (toAdd.length > 0) {
          for (const item of toAdd) {
            await db.personas.put(item);
          }
          restoredCounts.personas = toAdd.length;
        }
      }

      if (entities.licencias && data.licencias?.length) {
        const toAdd = data.licencias.filter(l => {
          const t = parseDateToTime(l.fechaSalida) || parseDateToTime(l.fechaIngreso) || (l.anioPeriodo ? parseDateToTime(l.anioPeriodo) : null);
          return isTimestampInPeriod(t, startTime, endTime);
        });
        if (toAdd.length > 0) {
          for (const item of toAdd) {
            await db.licencias.put(item);
          }
          restoredCounts.licencias = toAdd.length;
        }
      }

      if (entities.recargos && data.recargos?.length) {
        const toAdd = data.recargos.filter(r => isTimestampInPeriod(parseDateToTime(r.fecha), startTime, endTime));
        if (toAdd.length > 0) {
          for (const item of toAdd) {
            await db.recargos.put(item);
          }
          restoredCounts.recargos = toAdd.length;
        }
      }

      if (entities.reparaciones && data.reparaciones?.length) {
        const toAdd = data.reparaciones.filter(r => isTimestampInPeriod(parseDateToTime(r.fecha), startTime, endTime));
        if (toAdd.length > 0) {
          for (const item of toAdd) {
            await db.reparaciones.put(item);
          }
          restoredCounts.reparaciones = toAdd.length;
        }
      }

      if (entities.charlas && data.charlas?.length) {
        const toAdd = data.charlas.filter(c => isTimestampInPeriod(parseDateToTime(c.fecha), startTime, endTime));
        if (toAdd.length > 0) {
          for (const item of toAdd) {
            await db.charlas.put(item);
          }
          restoredCounts.charlas = toAdd.length;
        }
      }
    });

    restoredCounts.total = restoredCounts.expedientes + restoredCounts.foliosNumerario + restoredCounts.personas +
      restoredCounts.licencias + restoredCounts.recargos + restoredCounts.reparaciones + restoredCounts.charlas;

    this.notify();
    return restoredCounts;
  }

  // --- Personas Investigadas / Imputadas Helpers ---
  public async findPersonaByDni(dni: string): Promise<PersonaInvestigada | undefined> {
    const clean = dni.trim().replace(/\D/g, '');
    if (!clean) return undefined;
    return await db.personas.where('dni').equals(clean).first();
  }

  public async upsertPersona(persona: PersonaInvestigada): Promise<number> {
    const cleanDni = persona.dni.trim().replace(/\D/g, '');
    const cleanName = persona.apellidoNombre.trim();
    if (!cleanDni && !cleanName) return 0;

    let existing = cleanDni ? await db.personas.where('dni').equals(cleanDni).first() : undefined;
    if (existing && existing.id) {
      await db.personas.update(existing.id, {
        apellidoNombre: cleanName || existing.apellidoNombre,
        observaciones: persona.observaciones || existing.observaciones,
        expedientesVinculados: Array.from(new Set([
          ...(existing.expedientesVinculados || []),
          ...(persona.expedientesVinculados || [])
        ]))
      });
      return existing.id;
    } else {
      const newId = await db.personas.add({
        ...persona,
        dni: cleanDni,
        apellidoNombre: cleanName,
        fechaRegistro: persona.fechaRegistro || new Date().toLocaleDateString('es-AR'),
        delegacionId: persona.delegacionId || 1
      });
      return newId;
    }
  }

  // --- Combinar Expedientes Registrados y Depuración ---
  public async combineExpedientes(
    sourceIds: number[],
    consolidatedCase: Omit<Expediente, 'id'>,
    personsToSave: PersonaInvestigada[] = []
  ): Promise<number> {
    return await db.transaction('rw', [db.expedientes, db.personas], async () => {
      // 1. Insert single consolidated case
      const createdId = await db.expedientes.add(consolidatedCase);

      // 2. Depurate: Delete source cases from database to prevent redundant records
      await db.expedientes.bulkDelete(sourceIds);

      // 3. Upsert unified persons
      for (const p of personsToSave) {
        if (p.dni || p.apellidoNombre) {
          const expRef = `${consolidatedCase.nroExpediente}/${consolidatedCase.anio}`;
          const existing = p.dni ? await db.personas.where('dni').equals(p.dni.replace(/\D/g, '')).first() : undefined;
          if (existing && existing.id) {
            const vinculados = Array.from(new Set([...(existing.expedientesVinculados || []), expRef]));
            await db.personas.update(existing.id, { expedientesVinculados: vinculados });
          } else {
            await db.personas.add({
              ...p,
              fechaRegistro: new Date().toLocaleDateString('es-AR'),
              expedientesVinculados: [expRef],
              delegacionId: consolidatedCase.delegacionId || 1
            });
          }
        }
      }

      this.notify();
      return createdId;
    });
  }

  // --- Roles y Perfiles de Permisos ---
  public async getRoles(): Promise<CustomRoleDefinition[]> {
    await this.initialize();
    const list = await db.customRoles.toArray();
    if (list.length === 0) {
      return [
        {
          id: 1,
          nombre: 'Operador',
          descripcion: 'Carga de datos operativos, registro de expedientes, personal y consultas',
          canDelete: false,
          allowedModules: ['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas'],
          allDelegacionesAccess: false,
          canAdminModules: false,
          isSystem: true
        },
        {
          id: 2,
          nombre: 'Administrador',
          descripcion: 'Gestión completa de su Delegación, reportes, usuarios y eliminación de registros',
          canDelete: true,
          allowedModules: ['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas', 'membrete', 'catalogos', 'respaldos', 'usuarios'],
          allDelegacionesAccess: false,
          canAdminModules: false,
          isSystem: true
        },
        {
          id: 3,
          nombre: 'superusuario',
          descripcion: 'Acceso irrestricto total a todas las delegaciones, configuración y orden de módulos',
          canDelete: true,
          allowedModules: ['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas', 'membrete', 'catalogos', 'respaldos', 'usuarios', 'modulos'],
          allDelegacionesAccess: true,
          canAdminModules: true,
          isSystem: true
        }
      ];
    }
    return list;
  }

  public async addRole(role: CustomRoleDefinition): Promise<number> {
    await this.initialize();
    const id = await db.customRoles.add({
      ...role,
      createdAt: new Date().toISOString()
    });
    this.notify();
    return id;
  }

  public async updateRole(id: number, changes: Partial<CustomRoleDefinition>): Promise<void> {
    await this.initialize();
    await db.customRoles.update(id, changes);
    this.notify();
  }

  public async deleteRole(id: number): Promise<void> {
    await this.initialize();
    const r = await db.customRoles.get(id);
    if (r?.isSystem) {
      throw new Error('No es posible eliminar roles base del sistema.');
    }
    await db.customRoles.delete(id);
    this.notify();
  }

  // =========================================================================
  // --- Módulo de Numerario y Control de Folios ---
  // =========================================================================

  public async seedDefaultNumerario(delegacionId: number = 1): Promise<void> {
    const defaultSeries: NumerarioSerie[] = [
      {
        nombre: 'Oficio Jefatura',
        prefijo: 'OF-JEF',
        anio: '2026',
        color: 'blue',
        limiteFolios: 1000,
        columnas: 20,
        delegacionId,
        descripcion: 'Numerario correlativo para oficios emitidos por Jefatura de Delegación',
        createdAt: new Date().toISOString()
      },
      {
        nombre: 'Oficio Vicedirección',
        prefijo: 'OF-VICE',
        anio: '2026',
        color: 'indigo',
        limiteFolios: 1000,
        columnas: 20,
        delegacionId,
        descripcion: 'Oficios y comunicaciones de Segunda Jefatura / Subdirección',
        createdAt: new Date().toISOString()
      },
      {
        nombre: 'Memorándums Internos',
        prefijo: 'MEMO',
        anio: '2026',
        color: 'emerald',
        limiteFolios: 1000,
        columnas: 20,
        delegacionId,
        descripcion: 'Memorándums de afectación, comisión y servicios internos',
        createdAt: new Date().toISOString()
      },
      {
        nombre: 'Expedientes y Actuaciones',
        prefijo: 'EXP',
        anio: '2026',
        color: 'amber',
        limiteFolios: 1000,
        columnas: 20,
        delegacionId,
        descripcion: 'Numerario de expedientes administrativos y judiciales',
        createdAt: new Date().toISOString()
      },
      {
        nombre: 'Circulares y Radiomensajes',
        prefijo: 'CIRC',
        anio: '2026',
        color: 'purple',
        limiteFolios: 1000,
        columnas: 20,
        delegacionId,
        descripcion: 'Circulares informativas y radiomensajes generales',
        createdAt: new Date().toISOString()
      }
    ];

    const insertedSeriesIds: number[] = [];
    for (const s of defaultSeries) {
      const id = await db.seriesNumerario.add(s);
      insertedSeriesIds.push(id);
    }

    // Seed sample initial folios in first serie (Oficio Jefatura)
    const serieJefId = insertedSeriesIds[0];
    if (serieJefId) {
      const initialFolios: Omit<FolioRegistro, 'id'>[] = [
        {
          serieId: serieJefId,
          numero: 1,
          anio: 2026,
          caratula: 'Oficio Jefatura N° 01/2026',
          tipoDocumento: 'Oficio Judicial',
          asunto: 'Remisión de Informe Pericial Balístico en Causa N° 121/26',
          destinatario: 'Juzgado de Instrucción N° 1 - Clorinda',
          solicitante: 'Crio. Insp. Gómez, Roberto',
          observaciones: 'Entregado con nota de elevación y firma de recibido.',
          fecha: '15/01/2026',
          hora: '09:30',
          usuarioAsigno: 'admin.lb',
          delegacionId
        },
        {
          serieId: serieJefId,
          numero: 2,
          anio: 2026,
          caratula: 'Oficio Jefatura N° 02/2026',
          tipoDocumento: 'Oficio Judicial',
          asunto: 'Solicitud de Resguardo Fílmico de Cámaras de Seguridad en Vía Pública',
          destinatario: 'Municipalidad de Laguna Blanca',
          solicitante: 'Of. Ppal. Fernández, Esteban',
          observaciones: 'Expediente preliminar por ilícito contra la propiedad.',
          fecha: '20/01/2026',
          hora: '11:15',
          usuarioAsigno: 'admin.lb',
          delegacionId
        },
        {
          serieId: serieJefId,
          numero: 3,
          anio: 2026,
          caratula: 'Oficio Jefatura N° 03/2026',
          tipoDocumento: 'Comunicación Oficial',
          asunto: 'Informe Técnico de Extracción Forense Celular UFED con Hash SHA-256',
          destinatario: 'Fiscalía de Instrucción y Correccional',
          solicitante: 'Of. Ppal. Fernández, Esteban',
          observaciones: 'Evidencia resguardada en sobre lacrado con precinto de seguridad.',
          fecha: '28/01/2026',
          hora: '10:45',
          usuarioAsigno: 'admin.lb',
          delegacionId
        },
        // Range folios 10 to 13
        {
          serieId: serieJefId,
          numero: 10,
          anio: 2026,
          rangoId: 'rng-sample-1',
          rangoInicio: 10,
          rangoFin: 13,
          caratula: 'Oficio Jefatura N° 10/2026 a 13/2026 (Bloque)',
          tipoDocumento: 'Expediente Extenso',
          asunto: 'Expediente Completo y Anexos Periciales de Ciberdelito (Piezas 1 a 4)',
          destinatario: 'Juzgado Federal N° 1 de Formosa',
          solicitante: 'D.G.P.C. Formosa',
          observaciones: 'Rango continuo de 4 folios asignados a la misma causa judicial.',
          fecha: '05/02/2026',
          hora: '08:20',
          usuarioAsigno: 'superadmin',
          delegacionId
        },
        {
          serieId: serieJefId,
          numero: 11,
          anio: 2026,
          rangoId: 'rng-sample-1',
          rangoInicio: 10,
          rangoFin: 13,
          caratula: 'Oficio Jefatura N° 10/2026 a 13/2026 (Bloque)',
          tipoDocumento: 'Expediente Extenso',
          asunto: 'Expediente Completo y Anexos Periciales de Ciberdelito (Pieza 2)',
          destinatario: 'Juzgado Federal N° 1 de Formosa',
          solicitante: 'D.G.P.C. Formosa',
          observaciones: 'Rango continuo de 4 folios asignados a la misma causa judicial.',
          fecha: '05/02/2026',
          hora: '08:20',
          usuarioAsigno: 'superadmin',
          delegacionId
        },
        {
          serieId: serieJefId,
          numero: 12,
          anio: 2026,
          rangoId: 'rng-sample-1',
          rangoInicio: 10,
          rangoFin: 13,
          caratula: 'Oficio Jefatura N° 10/2026 a 13/2026 (Bloque)',
          tipoDocumento: 'Expediente Extenso',
          asunto: 'Expediente Completo y Anexos Periciales de Ciberdelito (Pieza 3)',
          destinatario: 'Juzgado Federal N° 1 de Formosa',
          solicitante: 'D.G.P.C. Formosa',
          observaciones: 'Rango continuo de 4 folios asignados a la misma causa judicial.',
          fecha: '05/02/2026',
          hora: '08:20',
          usuarioAsigno: 'superadmin',
          delegacionId
        },
        {
          serieId: serieJefId,
          numero: 13,
          anio: 2026,
          rangoId: 'rng-sample-1',
          rangoInicio: 10,
          rangoFin: 13,
          caratula: 'Oficio Jefatura N° 10/2026 a 13/2026 (Bloque)',
          tipoDocumento: 'Expediente Extenso',
          asunto: 'Expediente Completo y Anexos Periciales de Ciberdelito (Pieza 4)',
          destinatario: 'Juzgado Federal N° 1 de Formosa',
          solicitante: 'D.G.P.C. Formosa',
          observaciones: 'Rango continuo de 4 folios asignados a la misma causa judicial.',
          fecha: '05/02/2026',
          hora: '08:20',
          usuarioAsigno: 'superadmin',
          delegacionId
        }
      ];

      for (const fol of initialFolios) {
        await db.foliosNumerario.add(fol);
      }
    }
  }

  public async getSeriesNumerario(delegacionId: number = 1): Promise<NumerarioSerie[]> {
    await this.initialize();
    let series = await db.seriesNumerario.where('delegacionId').equals(delegacionId).toArray();
    if (series.length === 0) {
      await this.seedDefaultNumerario(delegacionId);
      series = await db.seriesNumerario.where('delegacionId').equals(delegacionId).toArray();
    }
    return series;
  }

  public async addSerieNumerario(serie: NumerarioSerie): Promise<number> {
    await this.initialize();
    const id = await db.seriesNumerario.add({
      ...serie,
      createdAt: serie.createdAt || new Date().toISOString()
    });
    this.notify();
    return id;
  }

  public async updateSerieNumerario(id: number, changes: Partial<NumerarioSerie>): Promise<void> {
    await this.initialize();
    await db.seriesNumerario.update(id, changes);
    this.notify();
  }

  public async deleteSerieNumerario(id: number): Promise<void> {
    await this.initialize();
    await db.transaction('rw', [db.seriesNumerario, db.foliosNumerario], async () => {
      await db.foliosNumerario.where('serieId').equals(id).delete();
      await db.seriesNumerario.delete(id);
    });
    this.notify();
  }

  public async getFoliosBySerie(serieId: number): Promise<FolioRegistro[]> {
    await this.initialize();
    return await db.foliosNumerario.where('serieId').equals(serieId).toArray();
  }

  public async getAllFolios(delegacionId: number = 1): Promise<FolioRegistro[]> {
    await this.initialize();
    return await db.foliosNumerario.where('delegacionId').equals(delegacionId).toArray();
  }

  public async assignFolio(folio: Omit<FolioRegistro, 'id'>): Promise<number> {
    await this.initialize();
    // Validate if number already assigned in this serie
    const existing = await db.foliosNumerario
      .where('[serieId+numero]')
      .equals([folio.serieId, folio.numero])
      .first()
      .catch(async () => {
        // Fallback filter
        const all = await db.foliosNumerario.where('serieId').equals(folio.serieId).toArray();
        return all.find(f => f.numero === folio.numero);
      });

    if (existing) {
      throw new Error(`El folio N° ${folio.numero} ya se encuentra ocupado en esta serie.`);
    }

    const folioToSave = {
      ...folio,
      anio: Number(folio.anio) || new Date().getFullYear()
    };
    const id = await db.foliosNumerario.add(folioToSave);
    this.notify();
    return id;
  }

  public async assignFoliosRange(folios: Omit<FolioRegistro, 'id'>[]): Promise<void> {
    await this.initialize();
    if (!folios.length) return;
    const serieId = folios[0].serieId;

    // Check collisions
    const existing = await db.foliosNumerario.where('serieId').equals(serieId).toArray();
    const occupiedNumbers = new Set(existing.map(f => f.numero));

    const collisions = folios.filter(f => occupiedNumbers.has(f.numero));
    if (collisions.length > 0) {
      const numbersList = collisions.map(c => c.numero).join(', ');
      throw new Error(`Los siguientes folios ya están ocupados en esta serie: ${numbersList}`);
    }

    const foliosToSave = folios.map(f => ({
      ...f,
      anio: Number(f.anio) || new Date().getFullYear()
    }));
    await db.foliosNumerario.bulkAdd(foliosToSave);
    this.notify();
  }

  public async updateFolio(id: number, changes: Partial<FolioRegistro>): Promise<void> {
    await this.initialize();
    await db.foliosNumerario.update(id, changes);
    this.notify();
  }

  public async liberarFolio(folioId: number, liberarRangoCompleto: boolean = false): Promise<void> {
    await this.initialize();
    const fol = await db.foliosNumerario.get(folioId);
    if (!fol) return;

    if (liberarRangoCompleto && fol.rangoId) {
      await db.foliosNumerario.where('rangoId').equals(fol.rangoId).delete();
    } else {
      await db.foliosNumerario.delete(folioId);
    }
    this.notify();
  }

  public async reiniciarNumerarioSerie(serieId: number): Promise<void> {
    await this.initialize();
    await db.foliosNumerario.where('serieId').equals(serieId).delete();
    this.notify();
  }
}

export const sgpManager = new SgpManager();
export const syncWithServer = () => sgpManager.syncWithServer();
