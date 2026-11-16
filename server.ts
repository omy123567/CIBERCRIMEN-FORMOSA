import express, { Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { initialCatalogsList, initialInstitutionalConfig, initialSgpBackup } from './src/db/sgpInitialData.ts';
import { SisPolDelegacion, SisPolUser } from './src/types/sgp.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory & SQLite database path
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_PATH = path.join(DATA_DIR, 'sispol.sqlite');

// Initialize better-sqlite3 with lightweight, fast settings
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('cache_size = -64000'); // 64MB memory cache for instant queries
db.pragma('temp_store = MEMORY');
db.pragma('synchronous = NORMAL');

// -------------------------------------------------------------
// Database Schema Initialization
// -------------------------------------------------------------
function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS delegaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      ciudad TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      nombreApellido TEXT NOT NULL,
      rol TEXT NOT NULL,
      delegacionId INTEGER NOT NULL,
      canDelete INTEGER NOT NULL DEFAULT 0,
      allowedModules TEXT NOT NULL,
      allowedDelegacionIds TEXT,
      canAdminModules INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS institutional_configs (
      delegacionId INTEGER PRIMARY KEY,
      configJson TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expedientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anio INTEGER NOT NULL,
      nroExpediente TEXT NOT NULL,
      fechaIngreso TEXT NOT NULL,
      fechaVencimiento TEXT,
      tipoRequerimiento TEXT NOT NULL,
      juzgado TEXT NOT NULL,
      caratula TEXT NOT NULL,
      estado TEXT NOT NULL,
      customFieldsJson TEXT,
      delegacionId INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS personal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jerarquia TEXT NOT NULL,
      plaza TEXT NOT NULL,
      apellidoNombre TEXT NOT NULL,
      dni TEXT NOT NULL,
      fechaNacimiento TEXT NOT NULL,
      fechaIngreso TEXT NOT NULL,
      grupo TEXT NOT NULL,
      contactoEmergencia TEXT,
      disponible INTEGER NOT NULL DEFAULT 1,
      motivoNoDisponible TEXT,
      customFieldsJson TEXT,
      delegacionId INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS moviles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identificador TEXT NOT NULL,
      marca TEXT NOT NULL,
      modelo TEXT NOT NULL,
      tipo TEXT,
      dominio TEXT NOT NULL,
      chasis TEXT,
      motor TEXT,
      condicion TEXT NOT NULL,
      kmActual TEXT,
      kmUltimoService TEXT,
      kmProximoService TEXT,
      vencimientoRto TEXT,
      vencimientoSeguro TEXT,
      companiaSeguro TEXT,
      numeroPoliza TEXT,
      observaciones TEXT,
      delegacionId INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reparaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      movilId INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      tallerMecanico TEXT,
      descripcion TEXT NOT NULL,
      repuestosCambiados TEXT,
      costoTotal REAL,
      kmMomento TEXT,
      observaciones TEXT,
      delegacionId INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recargos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      personalId INTEGER NOT NULL,
      personalNombre TEXT,
      personalJerarquia TEXT,
      fecha TEXT NOT NULL,
      horarioDesde TEXT,
      horarioHasta TEXT,
      totalHoras TEXT,
      tipoRecargo TEXT NOT NULL,
      lugarDestino TEXT,
      observaciones TEXT,
      delegacionId INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS charlas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      hora TEXT,
      lugarInstitucion TEXT NOT NULL,
      localidad TEXT NOT NULL,
      temaTratado TEXT NOT NULL,
      personalDesignado TEXT,
      observaciones TEXT,
      delegacionId INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS licencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      personalId INTEGER NOT NULL,
      jerarquia TEXT,
      plaza TEXT,
      apellidoNombre TEXT,
      dni TEXT,
      fechaIngreso TEXT,
      tipoLicencia TEXT NOT NULL,
      anioPeriodo INTEGER NOT NULL,
      diasHabilesTomados INTEGER NOT NULL DEFAULT 0,
      sumaDiasViaje INTEGER DEFAULT 0,
      disposicionViaje TEXT,
      diasPermitidosViaje INTEGER DEFAULT 0,
      fueInterrumpida INTEGER DEFAULT 0,
      fechaInterrupcion TEXT,
      motivoInterrupcion TEXT,
      diasRestantesDevueltos INTEGER DEFAULT 0,
      observaciones TEXT,
      periodosDetalleJson TEXT,
      fechaSalida TEXT,
      delegacionId INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS personas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apellidoNombre TEXT NOT NULL,
      dni TEXT NOT NULL,
      observaciones TEXT,
      fechaRegistro TEXT,
      expedientesVinculados TEXT,
      delegacionId INTEGER
    );

    CREATE TABLE IF NOT EXISTS dynamic_catalogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      value TEXT NOT NULL,
      delegacionId INTEGER
    );

    CREATE TABLE IF NOT EXISTS series_numerario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      prefijo TEXT NOT NULL,
      anio INTEGER NOT NULL,
      limiteFolios INTEGER NOT NULL,
      columnas INTEGER NOT NULL DEFAULT 20,
      color TEXT,
      delegacionId INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS folios_numerario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serieId INTEGER NOT NULL,
      numero INTEGER NOT NULL,
      rangoId TEXT,
      anio INTEGER NOT NULL DEFAULT 2026,
      caratula TEXT NOT NULL,
      asunto TEXT NOT NULL,
      destinatario TEXT NOT NULL,
      solicitante TEXT,
      observaciones TEXT,
      tipoDocumento TEXT NOT NULL,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      usuarioAsigno TEXT NOT NULL,
      delegacionId INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      descripcion TEXT,
      canDelete INTEGER NOT NULL DEFAULT 0,
      allowedModules TEXT NOT NULL,
      allDelegacionesAccess INTEGER NOT NULL DEFAULT 0,
      canAdminModules INTEGER NOT NULL DEFAULT 0,
      isSystem INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      fechaDia TEXT NOT NULL,
      hora TEXT NOT NULL,
      categoria TEXT NOT NULL,
      operacion TEXT NOT NULL,
      modulo TEXT NOT NULL,
      entidad TEXT,
      entidadId TEXT,
      descripcion TEXT NOT NULL,
      detallesJson TEXT,
      usuario TEXT NOT NULL,
      usuarioNombre TEXT,
      usuarioRol TEXT,
      delegacionId INTEGER,
      ipAddress TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_expedientes_fecha ON expedientes(fechaIngreso);
    CREATE INDEX IF NOT EXISTS idx_folios_fecha ON folios_numerario(fecha, anio);
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      valueJson TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_recargos_fecha ON recargos(fecha);
    CREATE INDEX IF NOT EXISTS idx_licencias_fechas ON licencias(fechaSalida, fechaIngreso);
    CREATE INDEX IF NOT EXISTS idx_reparaciones_fecha ON reparaciones(fecha);
    CREATE INDEX IF NOT EXISTS idx_charlas_fecha ON charlas(fecha);
    CREATE INDEX IF NOT EXISTS idx_personas_fecha ON personas(fechaRegistro);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_fechaDia ON audit_logs(fechaDia);
    CREATE INDEX IF NOT EXISTS idx_audit_categoria ON audit_logs(categoria);
  `);

  // Ensure tipo column exists on moviles and hora exists on charlas if created in earlier version
  try { db.exec('ALTER TABLE moviles ADD COLUMN tipo TEXT'); } catch {}
  try { db.exec('ALTER TABLE charlas ADD COLUMN hora TEXT'); } catch {}

  // Ensure granular permission columns exist on users and custom_roles
  const granularCols = [
    'ALTER TABLE users ADD COLUMN canCreate INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE users ADD COLUMN canEdit INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE users ADD COLUMN readOnly INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE users ADD COLUMN canExport INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE users ADD COLUMN canResetCounters INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE custom_roles ADD COLUMN canCreate INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE custom_roles ADD COLUMN canEdit INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE custom_roles ADD COLUMN readOnly INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE custom_roles ADD COLUMN canExport INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE custom_roles ADD COLUMN canResetCounters INTEGER NOT NULL DEFAULT 0'
  ];
  for (const sql of granularCols) {
    try { db.exec(sql); } catch {}
  }

  // Ensure administrators and superusers have proper flags
  try {
    db.prepare("UPDATE users SET canAdminModules = 1, canCreate = 1, canEdit = 1, readOnly = 0, canExport = 1, canResetCounters = 1 WHERE rol = 'Administrador' OR rol = 'superusuario'").run();
    db.prepare("UPDATE custom_roles SET canAdminModules = 1, canCreate = 1, canEdit = 1, readOnly = 0, canExport = 1, canResetCounters = 1 WHERE nombre = 'Administrador' OR nombre = 'superusuario'").run();
  } catch {}

  // Seed / ensure all standard & extended roles exist idempotently
  const defaultRoles = [
    {
      nombre: 'Solo Lectura',
      descripcion: 'Consulta visual de módulos autorizados sin permisos de carga, edición ni eliminación',
      canCreate: 0,
      canEdit: 0,
      canDelete: 0,
      readOnly: 1,
      canExport: 1,
      canResetCounters: 0,
      allowedModules: JSON.stringify(['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas']),
      allDelegacionesAccess: 0,
      canAdminModules: 0,
      isSystem: 1
    },
    {
      nombre: 'Cargador de Datos',
      descripcion: 'Alta de nuevos registros operativos (expedientes, folios, charlas) sin editar ni eliminar',
      canCreate: 1,
      canEdit: 0,
      canDelete: 0,
      readOnly: 0,
      canExport: 1,
      canResetCounters: 0,
      allowedModules: JSON.stringify(['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas']),
      allDelegacionesAccess: 0,
      canAdminModules: 0,
      isSystem: 1
    },
    {
      nombre: 'Operador',
      descripcion: 'Carga y modificación de datos operativos, registro de expedientes, personal y consultas',
      canCreate: 1,
      canEdit: 1,
      canDelete: 0,
      readOnly: 0,
      canExport: 1,
      canResetCounters: 0,
      allowedModules: JSON.stringify(['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas']),
      allDelegacionesAccess: 0,
      canAdminModules: 0,
      isSystem: 1
    },
    {
      nombre: 'Perito Forense',
      descripcion: 'Especialista de laboratorio y gabinete con carga y edición de evidencias, informes y numerario',
      canCreate: 1,
      canEdit: 1,
      canDelete: 0,
      readOnly: 0,
      canExport: 1,
      canResetCounters: 0,
      allowedModules: JSON.stringify(['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'charlas']),
      allDelegacionesAccess: 0,
      canAdminModules: 0,
      isSystem: 0
    },
    {
      nombre: 'Jefe de Turno',
      descripcion: 'Supervisión de guardia, asignación de folios, recargos de servicio y reinicio controlado de series',
      canCreate: 1,
      canEdit: 1,
      canDelete: 0,
      readOnly: 0,
      canExport: 1,
      canResetCounters: 1,
      allowedModules: JSON.stringify(['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas']),
      allDelegacionesAccess: 0,
      canAdminModules: 0,
      isSystem: 0
    },
    {
      nombre: 'Auditor',
      descripcion: 'Supervisión multi-delegación en modo solo lectura y exportación de reportes institucionales',
      canCreate: 0,
      canEdit: 0,
      canDelete: 0,
      readOnly: 1,
      canExport: 1,
      canResetCounters: 0,
      allowedModules: JSON.stringify(['dashboard', 'tareas', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas']),
      allDelegacionesAccess: 1,
      canAdminModules: 0,
      isSystem: 0
    },
    {
      nombre: 'Administrador',
      descripcion: 'Gestión completa de su Delegación, reportes, usuarios y eliminación de registros',
      canCreate: 1,
      canEdit: 1,
      canDelete: 1,
      readOnly: 0,
      canExport: 1,
      canResetCounters: 1,
      allowedModules: JSON.stringify(['dashboard', 'tareas', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas', 'membrete', 'catalogos', 'respaldos', 'usuarios']),
      allDelegacionesAccess: 0,
      canAdminModules: 1,
      isSystem: 1
    },
    {
      nombre: 'superusuario',
      descripcion: 'Acceso irrestricto total a todas las delegaciones, auditoría de acciones y administrador de módulos',
      canCreate: 1,
      canEdit: 1,
      canDelete: 1,
      readOnly: 0,
      canExport: 1,
      canResetCounters: 1,
      allowedModules: JSON.stringify(['dashboard', 'tareas', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas', 'membrete', 'catalogos', 'respaldos', 'usuarios', 'modulos', 'auditoria']),
      allDelegacionesAccess: 1,
      canAdminModules: 1,
      isSystem: 1
    }
  ];

  const insertRole = db.prepare(`
    INSERT OR IGNORE INTO custom_roles (nombre, descripcion, canCreate, canEdit, canDelete, readOnly, canExport, canResetCounters, allowedModules, allDelegacionesAccess, canAdminModules, isSystem, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  for (const r of defaultRoles) {
    insertRole.run(
      r.nombre,
      r.descripcion,
      r.canCreate,
      r.canEdit,
      r.canDelete,
      r.readOnly,
      r.canExport,
      r.canResetCounters,
      r.allowedModules,
      r.allDelegacionesAccess,
      r.canAdminModules,
      r.isSystem
    );
  }

  // Seed default delegations if empty
  const countDel = db.prepare('SELECT count(*) as count FROM delegaciones').get() as { count: number };
  if (countDel.count === 0) {
    const defaultDelegaciones: SisPolDelegacion[] = [
      { id: 1, codigo: 'DPC-LB', nombre: 'Delegación Policía Científica Laguna Blanca', ciudad: 'Laguna Blanca' },
      { id: 2, codigo: 'DPC-CLO', nombre: 'Delegación Policía Científica Clorinda', ciudad: 'Clorinda' },
      { id: 3, codigo: 'DGPC-CAP', nombre: 'Dirección General Policía Científica - Capital', ciudad: 'Formosa Capital' },
      { id: 4, codigo: 'DPC-LOM', nombre: 'Delegación Policía Científica Las Lomitas', ciudad: 'Las Lomitas' },
      { id: 5, codigo: 'DPC-PIR', nombre: 'Delegación Policía Científica Pirané', ciudad: 'Pirané' }
    ];

    const insertDel = db.prepare('INSERT INTO delegaciones (id, codigo, nombre, ciudad) VALUES (?, ?, ?, ?)');
    for (const d of defaultDelegaciones) {
      insertDel.run(d.id, d.codigo, d.nombre, d.ciudad);
    }
  }

  // Seed default users if empty
  const countUsers = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (countUsers.count === 0) {
    const allModules = [
      'dashboard', 'expedientes', 'numerario', 'ppi', 'personas',
      'personal', 'licencias', 'moviles', 'recargos', 'charlas',
      'membrete', 'catalogos', 'respaldos', 'usuarios', 'modulos'
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
        allowedDelegacionIds: [1, 2, 3, 4, 5],
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
        allowedDelegacionIds: [1, 2, 3, 4, 5],
        canAdminModules: false
      }
    ];

    const insertUser = db.prepare(`
      INSERT INTO users (id, username, email, password, nombreApellido, rol, delegacionId, canDelete, allowedModules, allowedDelegacionIds, canAdminModules)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const u of defaultUsers) {
      insertUser.run(
        u.id,
        u.username,
        u.email,
        u.password,
        u.nombreApellido,
        u.rol,
        u.delegacionId,
        u.canDelete ? 1 : 0,
        JSON.stringify(u.allowedModules),
        JSON.stringify(u.allowedDelegacionIds || [u.delegacionId]),
        u.canAdminModules ? 1 : 0
      );
    }
  }

  // Seed default institutional configs if empty
  const countConfigs = db.prepare('SELECT count(*) as count FROM institutional_configs').get() as { count: number };
  if (countConfigs.count === 0) {
    const insertConfig = db.prepare('INSERT INTO institutional_configs (delegacionId, configJson) VALUES (?, ?)');
    insertConfig.run(1, JSON.stringify(initialInstitutionalConfig));
  }

  // Seed default catalogs if empty
  const countCats = db.prepare('SELECT count(*) as count FROM dynamic_catalogs').get() as { count: number };
  if (countCats.count === 0) {
    const insertCat = db.prepare('INSERT INTO dynamic_catalogs (category, value, delegacionId) VALUES (?, ?, ?)');
    for (const c of initialCatalogsList) {
      insertCat.run(c.category, c.value, c.delegacionId || null);
    }
  }

  // Ensure admin user exists with requested credentials (admin / adminpassword)
  try {
    const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    if (!adminExists) {
      const allModules = [
        'dashboard', 'expedientes', 'numerario', 'ppi', 'personas',
        'personal', 'licencias', 'moviles', 'recargos', 'charlas',
        'membrete', 'catalogos', 'respaldos', 'usuarios', 'modulos'
      ];
      db.prepare(`
        INSERT INTO users (username, email, password, nombreApellido, rol, delegacionId, canDelete, allowedModules, allowedDelegacionIds, canAdminModules)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'admin',
        'admin@sisdic.gob.ar',
        'adminpassword',
        'Administrador General S.I.S.D.I.C.',
        'superusuario',
        1,
        1,
        JSON.stringify(allModules),
        JSON.stringify([1, 2, 3, 4, 5]),
        1
      );
    }
  } catch (err) {
    console.warn('[Admin user check]:', err);
  }

  // Seed default series numerario if empty
  const countSeries = db.prepare('SELECT count(*) as count FROM series_numerario').get() as { count: number };
  if (countSeries.count === 0) {
    const insertSerie = db.prepare(`
      INSERT INTO series_numerario (nombre, prefijo, anio, limiteFolios, columnas, color, delegacionId)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const defaultSeries = [
      { nombre: 'Oficios Jefatura', prefijo: 'OF-JEF', anio: 2026, limiteFolios: 1000, columnas: 20, color: 'blue' },
      { nombre: 'Oficios Vicedirección', prefijo: 'OF-VIC', anio: 2026, limiteFolios: 1000, columnas: 20, color: 'indigo' },
      { nombre: 'Memorándums', prefijo: 'MEMO', anio: 2026, limiteFolios: 1000, columnas: 20, color: 'emerald' },
      { nombre: 'Circulares', prefijo: 'CIRC', anio: 2026, limiteFolios: 1000, columnas: 20, color: 'amber' },
      { nombre: 'Dictámenes Técnicos Forenses', prefijo: 'DICT-TEC', anio: 2026, limiteFolios: 1000, columnas: 20, color: 'purple' }
    ];

    for (let delId = 1; delId <= 5; delId++) {
      for (const s of defaultSeries) {
        insertSerie.run(s.nombre, s.prefijo, s.anio, s.limiteFolios, s.columnas, s.color, delId);
      }
    }
  }
}

// -------------------------------------------------------------
// Audit & Traceability Helpers (30-day rolling retention)
// -------------------------------------------------------------
const AUDIT_RETENTION_DAYS = 30;

function purgeOldAuditLogs(): number {
  try {
    const cutoffIso = new Date(Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const info = db.prepare('DELETE FROM audit_logs WHERE timestamp < ?').run(cutoffIso);
    return info.changes || 0;
  } catch {
    return 0;
  }
}

function getAuditActorFromReq(req: Request) {
  const rawUser = req.header('x-audit-user') || (req.body && req.body._auditUser) || 'sistema';
  const rawName = req.header('x-audit-user-name') || (req.body && req.body._auditUserName) || '';
  const rawRole = req.header('x-audit-user-role') || (req.body && req.body._auditUserRole) || '';
  const rawDel = req.header('x-audit-delegacion') || (req.body && req.body.delegacionId);
  const decodeSafe = (v: string) => {
    try { return decodeURIComponent(v); } catch { return v; }
  };
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'local';
  return {
    usuario: decodeSafe(String(rawUser)).trim() || 'sistema',
    usuarioNombre: decodeSafe(String(rawName)).trim() || undefined,
    usuarioRol: decodeSafe(String(rawRole)).trim() || undefined,
    delegacionId: rawDel ? parseInt(String(rawDel), 10) || 1 : 1,
    ipAddress: ip
  };
}

function recordAuditLog(entry: {
  categoria: string;
  operacion: string;
  modulo: string;
  entidad?: string;
  entidadId?: string;
  descripcion: string;
  detalles?: any;
  usuario: string;
  usuarioNombre?: string;
  usuarioRol?: string;
  delegacionId?: number;
  ipAddress?: string;
}) {
  try {
    const now = new Date();
    const timestamp = now.toISOString();
    const fechaDia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const hora = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const detallesJson = entry.detalles !== undefined ? JSON.stringify(entry.detalles).slice(0, 8000) : null;

    db.prepare(`
      INSERT INTO audit_logs (timestamp, fechaDia, hora, categoria, operacion, modulo, entidad, entidadId, descripcion, detallesJson, usuario, usuarioNombre, usuarioRol, delegacionId, ipAddress)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      timestamp,
      fechaDia,
      hora,
      entry.categoria,
      entry.operacion,
      entry.modulo,
      entry.entidad || null,
      entry.entidadId || null,
      entry.descripcion,
      detallesJson,
      entry.usuario || 'sistema',
      entry.usuarioNombre || null,
      entry.usuarioRol || null,
      entry.delegacionId || 1,
      entry.ipAddress || null
    );
  } catch (err) {
    console.warn('[AuditLog Insert Error]:', err);
  }
}

// -------------------------------------------------------------
// REST API Routes Configuration
// -------------------------------------------------------------
function setupApiRoutes(app: express.Express) {
  // Purge logs older than 30 days on boot and periodically every 6 hours
  purgeOldAuditLogs();
  setInterval(() => {
    purgeOldAuditLogs();
  }, 6 * 60 * 60 * 1000);

  // Automatic Audit Trail Middleware for standard CRUD mutations
  app.use('/api', (req: Request, res: Response, next) => {
    const method = req.method.toUpperCase();
    if (!['POST', 'PUT', 'DELETE'].includes(method)) {
      return next();
    }

    const reqPath = req.path;
    const skipPaths = [
      '/auth/login',
      '/auth/change-password',
      '/audit-logs',
      '/audit-logs/purge-expired',
      '/maintenance/purge-period',
      '/maintenance/clear-all',
      '/maintenance/restore-period'
    ];
    if (skipPaths.includes(reqPath) || /^\/numerario\/series\/\d+\/reset$/.test(reqPath)) {
      return next();
    }

    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const actor = getAuditActorFromReq(req);

      let modulo = 'Sistema';
      let entidad = reqPath.replace(/^\//, '').split('/')[0] || 'general';
      let categoria = method === 'POST' ? 'CREACION' : method === 'PUT' ? 'MODIFICACION' : 'ELIMINACION';
      let operacion = `${method}_${entidad.toUpperCase()}`;
      let entidadId = reqPath.split('/').pop();
      if (entidadId && isNaN(Number(entidadId))) entidadId = undefined;
      if (!entidadId && req.body?.id) entidadId = String(req.body.id);

      let descripcion = `${method} en ${reqPath}`;
      const body = req.body || {};

      if (reqPath.startsWith('/expedientes')) {
        modulo = 'Expedientes & Evidencias';
        entidad = 'expedientes';
        const label = body.nroExpediente ? `${body.nroExpediente}/${body.anio || ''}` : (entidadId ? `#${entidadId}` : '');
        if (method === 'POST') {
          operacion = 'ALTA_EXPEDIENTE';
          descripcion = `Registro de expediente ${label} (${body.caratula || body.tipoRequerimiento || 'Sin carátula'})`;
        } else if (method === 'PUT') {
          operacion = 'MODIFICAR_EXPEDIENTE';
          descripcion = `Modificación de expediente ${label} — Estado: ${body.estado || 'Actualizado'}`;
        } else {
          operacion = 'ELIMINAR_EXPEDIENTE';
          descripcion = `Eliminación de expediente ID #${entidadId || '?'}`;
        }
      } else if (reqPath.startsWith('/personal')) {
        modulo = 'Personal & Legajos';
        entidad = 'personal';
        const name = body.apellidoNombre ? `${body.jerarquia || ''} ${body.apellidoNombre}`.trim() : `ID #${entidadId || '?'}`;
        if (method === 'POST') {
          operacion = 'ALTA_PERSONAL';
          descripcion = `Alta de efectivo policial: ${name} (DNI ${body.dni || 'S/D'})`;
        } else if (method === 'PUT') {
          operacion = 'MODIFICAR_PERSONAL';
          descripcion = `Actualización de legajo policial: ${name}`;
        } else {
          operacion = 'ELIMINAR_PERSONAL';
          descripcion = `Baja / eliminación de efectivo policial ID #${entidadId || '?'}`;
        }
      } else if (reqPath.startsWith('/licencias')) {
        modulo = 'Licencias & Cuatrienio';
        entidad = 'licencias';
        if (method === 'POST') {
          operacion = 'IMPUTAR_LICENCIA';
          descripcion = `Carga de licencia ${body.tipoLicencia || ''} para ${body.apellidoNombre || 'Efectivo'} (${body.diasHabilesTomados || 0} días)`;
        } else if (method === 'PUT') {
          operacion = 'MODIFICAR_LICENCIA';
          descripcion = `Modificación de licencia ID #${entidadId || '?'} (${body.apellidoNombre || ''})`;
        } else {
          operacion = 'ELIMINAR_LICENCIA';
          descripcion = `Eliminación de registro de licencia ID #${entidadId || '?'}`;
        }
      } else if (reqPath.startsWith('/numerario/folios/range')) {
        modulo = 'Numerario & Control de Folios';
        entidad = 'folios_numerario';
        const count = Array.isArray(body.folios) ? body.folios.length : 0;
        operacion = 'ASIGNAR_RANGO_FOLIOS';
        descripcion = `Asignación múltiple de ${count} folio(s) en numerario`;
      } else if (reqPath.startsWith('/numerario/folios')) {
        modulo = 'Numerario & Control de Folios';
        entidad = 'folios_numerario';
        if (method === 'POST') {
          operacion = 'ASIGNAR_FOLIO';
          descripcion = `Asignación de folio N° ${body.numero || '?'}/${body.anio || ''} (${body.tipoDocumento || ''}) — ${body.asunto || body.caratula || ''}`;
        } else if (method === 'PUT') {
          operacion = 'MODIFICAR_FOLIO';
          descripcion = `Modificación de folio ID #${entidadId || '?'} (${body.asunto || ''})`;
        } else {
          operacion = 'LIBERAR_FOLIO';
          descripcion = `Liberación / eliminación de folio ID #${entidadId || '?'}`;
        }
      } else if (reqPath.startsWith('/numerario/series')) {
        modulo = 'Numerario & Control de Folios';
        entidad = 'series_numerario';
        if (method === 'POST') {
          operacion = 'CREAR_SERIE_FOLIO';
          descripcion = `Creación de tipo de folio / serie "${body.nombre || ''}" (${body.prefijo || ''})`;
        } else if (method === 'PUT') {
          operacion = 'MODIFICAR_SERIE_FOLIO';
          descripcion = `Edición de serie "${body.nombre || ''}" (${body.prefijo || ''}, límite ${body.limiteFolios || '?'})`;
        } else {
          operacion = 'ELIMINAR_SERIE_FOLIO';
          descripcion = `Eliminación de serie de folios ID #${entidadId || '?'}`;
        }
      } else if (reqPath.startsWith('/moviles')) {
        modulo = 'Parque Automotor';
        entidad = 'moviles';
        if (method === 'POST') {
          operacion = 'ALTA_MOVIL';
          descripcion = `Alta de móvil policial ${body.identificador || ''} (${body.marca || ''} ${body.modelo || ''} - ${body.dominio || ''})`;
        } else if (method === 'PUT') {
          operacion = 'MODIFICAR_MOVIL';
          descripcion = `Actualización de móvil ${body.identificador || `#${entidadId}`}`;
        } else {
          operacion = 'ELIMINAR_MOVIL';
          descripcion = `Eliminación de móvil ID #${entidadId || '?'}`;
        }
      } else if (reqPath.startsWith('/reparaciones')) {
        modulo = 'Parque Automotor';
        entidad = 'reparaciones';
        operacion = method === 'POST' ? 'ALTA_REPARACION' : method === 'PUT' ? 'MODIFICAR_REPARACION' : 'ELIMINAR_REPARACION';
        descripcion = `${method === 'POST' ? 'Registro' : method === 'PUT' ? 'Edición' : 'Eliminación'} de reparación/mantenimiento ${body.descripcion || `ID #${entidadId || '?'}`}`;
      } else if (reqPath.startsWith('/recargos')) {
        modulo = 'Recargos de Servicio';
        entidad = 'recargos';
        operacion = method === 'POST' ? 'ALTA_RECARGO' : method === 'PUT' ? 'MODIFICAR_RECARGO' : 'ELIMINAR_RECARGO';
        descripcion = `${method === 'POST' ? 'Registro' : method === 'PUT' ? 'Edición' : 'Eliminación'} de recargo (${body.personalNombre || `ID #${entidadId || '?'}`})`;
      } else if (reqPath.startsWith('/charlas')) {
        modulo = 'Charlas y Prevención';
        entidad = 'charlas';
        operacion = method === 'POST' ? 'ALTA_CHARLA' : method === 'PUT' ? 'MODIFICAR_CHARLA' : 'ELIMINAR_CHARLA';
        descripcion = `${method === 'POST' ? 'Registro' : method === 'PUT' ? 'Edición' : 'Eliminación'} de charla preventiva (${body.temaTratado || body.lugarInstitucion || `ID #${entidadId || '?'}`})`;
      } else if (reqPath.startsWith('/personas')) {
        modulo = 'Personas (Evidencias)';
        entidad = 'personas';
        operacion = method === 'POST' ? 'ALTA_PERSONA' : method === 'PUT' ? 'MODIFICAR_PERSONA' : 'ELIMINAR_PERSONA';
        descripcion = `${method === 'POST' ? 'Registro' : method === 'PUT' ? 'Edición' : 'Eliminación'} de persona (${body.apellidoNombre || `ID #${entidadId || '?'}`})`;
      } else if (reqPath.startsWith('/users')) {
        modulo = 'Usuarios y Roles';
        entidad = 'users';
        categoria = 'SEGURIDAD';
        operacion = method === 'POST' ? 'CREAR_USUARIO' : method === 'PUT' ? 'MODIFICAR_USUARIO' : 'ELIMINAR_USUARIO';
        descripcion = `${method === 'POST' ? 'Creación' : method === 'PUT' ? 'Modificación' : 'Eliminación'} de usuario ${body.username ? `"${body.username}" (Rol: ${body.rol})` : `ID #${entidadId || '?'}`}`;
      } else if (reqPath.startsWith('/roles')) {
        modulo = 'Usuarios y Roles';
        entidad = 'custom_roles';
        categoria = 'SEGURIDAD';
        operacion = method === 'POST' ? 'CREAR_ROL' : method === 'PUT' ? 'MODIFICAR_ROL' : 'ELIMINAR_ROL';
        descripcion = `${method === 'POST' ? 'Creación' : method === 'PUT' ? 'Modificación de permisos' : 'Eliminación'} de rol ${body.nombre ? `"${body.nombre}"` : `ID #${entidadId || '?'}`}`;
      } else if (reqPath.startsWith('/dynamic-catalogs')) {
        modulo = 'Catálogos Dinámicos';
        entidad = 'dynamic_catalogs';
        operacion = method === 'POST' ? 'AGREGAR_CATALOGO' : 'ELIMINAR_CATALOGO';
        descripcion = `${method === 'POST' ? `Alta de opción "${body.value}" en catálogo "${body.category}"` : `Eliminación de opción de catálogo ID #${entidadId || '?'}`}`;
      } else if (reqPath.startsWith('/institutional-config')) {
        modulo = 'Membrete Oficial';
        entidad = 'institutional_configs';
        categoria = 'MODIFICACION';
        operacion = 'ACTUALIZAR_MEMBRETE';
        descripcion = `Actualización de configuración institucional / membrete (Delegación #${reqPath.split('/').pop()})`;
      } else if (reqPath.startsWith('/settings/nav-modules')) {
        modulo = 'Administrador de Módulos';
        entidad = 'app_settings';
        categoria = 'MODIFICACION';
        operacion = 'PERSONALIZAR_MODULOS';
        const modCount = Array.isArray(body) ? body.length : 0;
        descripcion = `Actualización de estructura, orden o carpetas de módulos (${modCount} elementos)`;
      }

      const safeBody = typeof body === 'object' && body !== null
        ? { ...body, password: body.password ? '***' : undefined }
        : undefined;

      recordAuditLog({
        categoria,
        operacion,
        modulo,
        entidad,
        entidadId,
        descripcion,
        detalles: safeBody,
        usuario: actor.usuario,
        usuarioNombre: actor.usuarioNombre,
        usuarioRol: actor.usuarioRol,
        delegacionId: actor.delegacionId,
        ipAddress: actor.ipAddress
      });
    });

    next();
  });

  // Healthcheck
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      engine: 'S.I.S.D.I.C. SQLite Central Server',
      database: DB_PATH,
      timestamp: new Date().toISOString()
    });
  });

  // Delegaciones
  app.get('/api/delegaciones', (_req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM delegaciones ORDER BY id ASC').all();
    res.json(rows);
  });

  // Institutional Config
  app.get('/api/institutional-config/:delegacionId', (req: Request, res: Response) => {
    const delId = parseInt(req.params.delegacionId, 10);
    const row = db.prepare('SELECT configJson FROM institutional_configs WHERE delegacionId = ?').get(delId) as { configJson: string } | undefined;
    if (row) {
      try {
        return res.json(JSON.parse(row.configJson));
      } catch {
        return res.json(initialInstitutionalConfig);
      }
    }
    // Fallback to initial config with updated delegacionId
    res.json({ ...initialInstitutionalConfig, delegacionId: delId });
  });

  app.post('/api/institutional-config/:delegacionId', (req: Request, res: Response) => {
    const delId = parseInt(req.params.delegacionId, 10);
    const config = req.body;
    const stmt = db.prepare(`
      INSERT INTO institutional_configs (delegacionId, configJson)
      VALUES (?, ?)
      ON CONFLICT(delegacionId) DO UPDATE SET configJson = excluded.configJson
    `);
    stmt.run(delId, JSON.stringify(config));
    res.json({ success: true });
  });

  // Users & Auth
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }
    const cleanUser = String(username).trim();
    const cleanPass = String(password).trim();
    const actorIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'local';

    // Flexible case-insensitive login query
    let user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND password = ?').get(cleanUser, cleanPass) as any;

    // Also support common administrative aliases (admin -> admin123, adminpassword, admin)
    if (!user && (cleanUser.toLowerCase() === 'admin' || cleanUser.toLowerCase() === 'superadmin')) {
      if (cleanPass === 'admin123' || cleanPass === 'adminpassword' || cleanPass === 'admin' || cleanPass === 'policia2026') {
        user = db.prepare("SELECT * FROM users WHERE LOWER(username) = 'superadmin' OR LOWER(username) = 'admin' LIMIT 1").get() as any;
      }
    }

    if (!user) {
      recordAuditLog({
        categoria: 'ACCESO',
        operacion: 'LOGIN_FALLIDO',
        modulo: 'Autenticación',
        entidad: 'users',
        descripcion: `Intento de inicio de sesión fallido para usuario "${cleanUser}"`,
        detalles: { usernameIntentado: cleanUser },
        usuario: cleanUser || 'desconocido',
        delegacionId: 1,
        ipAddress: actorIp
      });
      return res.status(401).json({ error: 'Credenciales inválidas. Verifique usuario y contraseña.' });
    }

    let parsedAllowedModules: string[] = [];
    try {
      parsedAllowedModules = typeof user.allowedModules === 'string' ? JSON.parse(user.allowedModules) : (user.allowedModules || []);
    } catch {
      parsedAllowedModules = [];
    }

    let parsedAllowedDelegacionIds: number[] = [];
    try {
      parsedAllowedDelegacionIds = typeof user.allowedDelegacionIds === 'string' ? JSON.parse(user.allowedDelegacionIds) : (user.allowedDelegacionIds || [user.delegacionId || 1]);
    } catch {
      parsedAllowedDelegacionIds = [user.delegacionId || 1];
    }

    const isSuper = user.rol === 'superusuario';
    const isReadOnly = isSuper ? false : Boolean(user.readOnly);

    recordAuditLog({
      categoria: 'ACCESO',
      operacion: 'LOGIN_EXITOSO',
      modulo: 'Autenticación',
      entidad: 'users',
      entidadId: String(user.id),
      descripcion: `Inicio de sesión exitoso: ${user.nombreApellido} (${user.username}) — Rol: ${user.rol}`,
      detalles: { delegacionId: user.delegacionId, rol: user.rol, readOnly: isReadOnly },
      usuario: user.username,
      usuarioNombre: user.nombreApellido,
      usuarioRol: user.rol,
      delegacionId: user.delegacionId || 1,
      ipAddress: actorIp
    });

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      nombreApellido: user.nombreApellido,
      rol: user.rol,
      delegacionId: user.delegacionId,
      canCreate: isSuper ? true : (isReadOnly ? false : (user.canCreate !== undefined ? Boolean(user.canCreate) : true)),
      canEdit: isSuper ? true : (isReadOnly ? false : (user.canEdit !== undefined ? Boolean(user.canEdit) : true)),
      canDelete: isSuper ? true : (isReadOnly ? false : Boolean(user.canDelete)),
      readOnly: isReadOnly,
      canExport: isSuper ? true : (user.canExport !== undefined ? Boolean(user.canExport) : true),
      canResetCounters: isSuper ? true : (isReadOnly ? false : Boolean(user.canResetCounters)),
      allowedModules: parsedAllowedModules,
      allowedDelegacionIds: parsedAllowedDelegacionIds,
      canAdminModules: isSuper ? true : (isReadOnly ? false : Boolean(user.canAdminModules))
    });
  });

  app.post('/api/auth/change-password', (req: Request, res: Response) => {
    const { userId, oldPassword, newPassword } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND password = ?').get(userId, oldPassword) as any;
    if (!user) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta' });
    }
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newPassword, userId);

    const actor = getAuditActorFromReq(req);
    recordAuditLog({
      categoria: 'SEGURIDAD',
      operacion: 'CAMBIO_CLAVE',
      modulo: 'Autenticación',
      entidad: 'users',
      entidadId: String(user.id),
      descripcion: `Actualización de contraseña del usuario ${user.username} (${user.nombreApellido})`,
      usuario: actor.usuario !== 'sistema' ? actor.usuario : user.username,
      usuarioNombre: actor.usuarioNombre || user.nombreApellido,
      usuarioRol: actor.usuarioRol || user.rol,
      delegacionId: user.delegacionId || 1,
      ipAddress: actor.ipAddress
    });

    res.json({ success: true, message: 'Contraseña actualizada exitosamente' });
  });

  app.get('/api/users', (_req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM users ORDER BY id ASC').all() as any[];
    const parsed = rows.map((u) => {
      const isSuper = u.rol === 'superusuario';
      const isReadOnly = isSuper ? false : Boolean(u.readOnly);
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        password: u.password,
        nombreApellido: u.nombreApellido,
        rol: u.rol,
        delegacionId: u.delegacionId,
        canCreate: isSuper ? true : (isReadOnly ? false : (u.canCreate !== undefined ? Boolean(u.canCreate) : true)),
        canEdit: isSuper ? true : (isReadOnly ? false : (u.canEdit !== undefined ? Boolean(u.canEdit) : true)),
        canDelete: isSuper ? true : (isReadOnly ? false : Boolean(u.canDelete)),
        readOnly: isReadOnly,
        canExport: isSuper ? true : (u.canExport !== undefined ? Boolean(u.canExport) : true),
        canResetCounters: isSuper ? true : (isReadOnly ? false : Boolean(u.canResetCounters)),
        allowedModules: JSON.parse(u.allowedModules || '[]'),
        allowedDelegacionIds: JSON.parse(u.allowedDelegacionIds || '[]'),
        canAdminModules: isSuper ? true : (isReadOnly ? false : Boolean(u.canAdminModules))
      };
    });
    res.json(parsed);
  });

  app.post('/api/users', (req: Request, res: Response) => {
    const u = req.body;
    const isSuper = u.rol === 'superusuario';
    const isReadOnly = isSuper ? false : Boolean(u.readOnly);
    try {
      const stmt = db.prepare(`
        INSERT INTO users (username, email, password, nombreApellido, rol, delegacionId, canCreate, canEdit, canDelete, readOnly, canExport, canResetCounters, allowedModules, allowedDelegacionIds, canAdminModules)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        u.username,
        u.email,
        u.password,
        u.nombreApellido,
        u.rol,
        u.delegacionId,
        isSuper ? 1 : (isReadOnly ? 0 : (u.canCreate !== false ? 1 : 0)),
        isSuper ? 1 : (isReadOnly ? 0 : (u.canEdit !== false ? 1 : 0)),
        isSuper ? 1 : (isReadOnly ? 0 : (u.canDelete ? 1 : 0)),
        isReadOnly ? 1 : 0,
        isSuper ? 1 : (u.canExport !== false ? 1 : 0),
        isSuper ? 1 : (isReadOnly ? 0 : (u.canResetCounters ? 1 : 0)),
        JSON.stringify(u.allowedModules || []),
        JSON.stringify(u.allowedDelegacionIds || [u.delegacionId]),
        isSuper ? 1 : (isReadOnly ? 0 : (u.canAdminModules ? 1 : 0))
      );
      res.json({ id: info.lastInsertRowid, success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/users/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const u = req.body;
    const isSuper = u.rol === 'superusuario';
    const isReadOnly = isSuper ? false : Boolean(u.readOnly);
    try {
      const stmt = db.prepare(`
        UPDATE users SET
          username = ?,
          email = ?,
          password = ?,
          nombreApellido = ?,
          rol = ?,
          delegacionId = ?,
          canCreate = ?,
          canEdit = ?,
          canDelete = ?,
          readOnly = ?,
          canExport = ?,
          canResetCounters = ?,
          allowedModules = ?,
          allowedDelegacionIds = ?,
          canAdminModules = ?
        WHERE id = ?
      `);
      stmt.run(
        u.username,
        u.email,
        u.password,
        u.nombreApellido,
        u.rol,
        u.delegacionId,
        isSuper ? 1 : (isReadOnly ? 0 : (u.canCreate !== false ? 1 : 0)),
        isSuper ? 1 : (isReadOnly ? 0 : (u.canEdit !== false ? 1 : 0)),
        isSuper ? 1 : (isReadOnly ? 0 : (u.canDelete ? 1 : 0)),
        isReadOnly ? 1 : 0,
        isSuper ? 1 : (u.canExport !== false ? 1 : 0),
        isSuper ? 1 : (isReadOnly ? 0 : (u.canResetCounters ? 1 : 0)),
        JSON.stringify(u.allowedModules || []),
        JSON.stringify(u.allowedDelegacionIds || [u.delegacionId]),
        isSuper ? 1 : (isReadOnly ? 0 : (u.canAdminModules ? 1 : 0)),
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/users/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Roles y Perfiles de Permisos
  app.get('/api/roles', (_req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM custom_roles ORDER BY id ASC').all() as any[];
    const parsed = rows.map((r) => {
      const isSuper = r.nombre === 'superusuario';
      const isReadOnly = isSuper ? false : Boolean(r.readOnly);
      return {
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion,
        canCreate: isSuper ? true : (isReadOnly ? false : (r.canCreate !== undefined ? Boolean(r.canCreate) : true)),
        canEdit: isSuper ? true : (isReadOnly ? false : (r.canEdit !== undefined ? Boolean(r.canEdit) : true)),
        canDelete: isSuper ? true : (isReadOnly ? false : Boolean(r.canDelete)),
        readOnly: isReadOnly,
        canExport: isSuper ? true : (r.canExport !== undefined ? Boolean(r.canExport) : true),
        canResetCounters: isSuper ? true : (isReadOnly ? false : Boolean(r.canResetCounters)),
        allowedModules: typeof r.allowedModules === 'string'
          ? (() => { try { return JSON.parse(r.allowedModules); } catch { return []; } })()
          : (Array.isArray(r.allowedModules) ? r.allowedModules : []),
        allDelegacionesAccess: Boolean(r.allDelegacionesAccess),
        canAdminModules: isSuper ? true : (isReadOnly ? false : Boolean(r.canAdminModules)),
        isSystem: Boolean(r.isSystem),
        createdAt: r.createdAt
      };
    });
    res.json(parsed);
  });

  app.post('/api/roles', (req: Request, res: Response) => {
    const r = req.body;
    const isReadOnly = Boolean(r.readOnly);
    try {
      const stmt = db.prepare(`
        INSERT INTO custom_roles (nombre, descripcion, canCreate, canEdit, canDelete, readOnly, canExport, canResetCounters, allowedModules, allDelegacionesAccess, canAdminModules, isSystem, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      const info = stmt.run(
        r.nombre,
        r.descripcion || '',
        isReadOnly ? 0 : (r.canCreate !== false ? 1 : 0),
        isReadOnly ? 0 : (r.canEdit !== false ? 1 : 0),
        isReadOnly ? 0 : (r.canDelete ? 1 : 0),
        isReadOnly ? 1 : 0,
        r.canExport !== false ? 1 : 0,
        isReadOnly ? 0 : (r.canResetCounters ? 1 : 0),
        JSON.stringify(r.allowedModules || []),
        r.allDelegacionesAccess ? 1 : 0,
        isReadOnly ? 0 : (r.canAdminModules ? 1 : 0),
        r.isSystem ? 1 : 0
      );
      res.json({ id: info.lastInsertRowid, success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/roles/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const r = req.body;
    const isSuper = r.nombre === 'superusuario';
    const isReadOnly = isSuper ? false : Boolean(r.readOnly);
    try {
      const stmt = db.prepare(`
        UPDATE custom_roles SET
          nombre = ?,
          descripcion = ?,
          canCreate = ?,
          canEdit = ?,
          canDelete = ?,
          readOnly = ?,
          canExport = ?,
          canResetCounters = ?,
          allowedModules = ?,
          allDelegacionesAccess = ?,
          canAdminModules = ?
        WHERE id = ?
      `);
      stmt.run(
        r.nombre,
        r.descripcion || '',
        isSuper ? 1 : (isReadOnly ? 0 : (r.canCreate !== false ? 1 : 0)),
        isSuper ? 1 : (isReadOnly ? 0 : (r.canEdit !== false ? 1 : 0)),
        isSuper ? 1 : (isReadOnly ? 0 : (r.canDelete ? 1 : 0)),
        isReadOnly ? 1 : 0,
        isSuper ? 1 : (r.canExport !== false ? 1 : 0),
        isSuper ? 1 : (isReadOnly ? 0 : (r.canResetCounters ? 1 : 0)),
        JSON.stringify(r.allowedModules || []),
        r.allDelegacionesAccess ? 1 : 0,
        isSuper ? 1 : (isReadOnly ? 0 : (r.canAdminModules ? 1 : 0)),
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/roles/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT isSystem FROM custom_roles WHERE id = ?').get(id) as { isSystem?: number } | undefined;
    if (existing?.isSystem) {
      return res.status(400).json({ error: 'No es posible eliminar roles base del sistema' });
    }
    db.prepare('DELETE FROM custom_roles WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Expedientes
  app.get('/api/expedientes', (req: Request, res: Response) => {
    const delegacionId = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    let rows;
    if (delegacionId) {
      rows = db.prepare('SELECT * FROM expedientes WHERE delegacionId = ? ORDER BY id DESC').all(delegacionId);
    } else {
      rows = db.prepare('SELECT * FROM expedientes ORDER BY id DESC').all();
    }
    res.json(rows);
  });

  app.post('/api/expedientes', (req: Request, res: Response) => {
    try {
      const e = req.body;
      const customFieldsJson = typeof e.customFieldsJson === 'object' ? JSON.stringify(e.customFieldsJson) : (e.customFieldsJson || '{}');
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO expedientes (id, anio, nroExpediente, fechaIngreso, fechaVencimiento, tipoRequerimiento, juzgado, caratula, estado, customFieldsJson, delegacionId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        e.id || null,
        Number(e.anio) || new Date().getFullYear(),
        e.nroExpediente || '',
        e.fechaIngreso || '',
        e.fechaVencimiento || null,
        e.tipoRequerimiento || 'Pericia Informática',
        e.juzgado || '',
        e.caratula || '',
        e.estado || 'En Trámite',
        customFieldsJson,
        e.delegacionId || 1
      );
      res.json({ id: e.id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/expedientes error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/expedientes/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const e = req.body;
      const customFieldsJson = typeof e.customFieldsJson === 'object' ? JSON.stringify(e.customFieldsJson) : (e.customFieldsJson || '{}');
      const stmt = db.prepare(`
        UPDATE expedientes SET
          anio = ?,
          nroExpediente = ?,
          fechaIngreso = ?,
          fechaVencimiento = ?,
          tipoRequerimiento = ?,
          juzgado = ?,
          caratula = ?,
          estado = ?,
          customFieldsJson = ?,
          delegacionId = ?
        WHERE id = ?
      `);
      stmt.run(
        Number(e.anio) || new Date().getFullYear(),
        e.nroExpediente || '',
        e.fechaIngreso || '',
        e.fechaVencimiento || null,
        e.tipoRequerimiento || 'Pericia Informática',
        e.juzgado || '',
        e.caratula || '',
        e.estado || 'En Trámite',
        customFieldsJson,
        e.delegacionId || 1,
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('[PUT /api/expedientes error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/expedientes/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      db.prepare('DELETE FROM expedientes WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE /api/expedientes error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Personal
  app.get('/api/personal', (req: Request, res: Response) => {
    const delegacionId = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    let rows;
    if (delegacionId) {
      rows = db.prepare('SELECT * FROM personal WHERE delegacionId = ? ORDER BY id ASC').all(delegacionId);
    } else {
      rows = db.prepare('SELECT * FROM personal ORDER BY id ASC').all();
    }
    res.json(rows.map((p: any) => ({ ...p, disponible: Boolean(p.disponible) })));
  });

  app.post('/api/personal', (req: Request, res: Response) => {
    try {
      const p = req.body;
      const customFieldsJson = typeof p.customFieldsJson === 'object' ? JSON.stringify(p.customFieldsJson) : (p.customFieldsJson || null);
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO personal (id, jerarquia, plaza, apellidoNombre, dni, fechaNacimiento, fechaIngreso, grupo, contactoEmergencia, disponible, motivoNoDisponible, customFieldsJson, delegacionId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        p.id || null,
        p.jerarquia || '',
        p.plaza || '',
        p.apellidoNombre || '',
        p.dni || '',
        p.fechaNacimiento || '',
        p.fechaIngreso || '',
        p.grupo || '',
        p.contactoEmergencia || null,
        p.disponible ? 1 : 0,
        p.motivoNoDisponible || null,
        customFieldsJson,
        p.delegacionId || 1
      );
      res.json({ id: p.id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/personal error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/personal/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const p = req.body;
      const customFieldsJson = typeof p.customFieldsJson === 'object' ? JSON.stringify(p.customFieldsJson) : (p.customFieldsJson || null);
      const stmt = db.prepare(`
        UPDATE personal SET
          jerarquia = ?,
          plaza = ?,
          apellidoNombre = ?,
          dni = ?,
          fechaNacimiento = ?,
          fechaIngreso = ?,
          grupo = ?,
          contactoEmergencia = ?,
          disponible = ?,
          motivoNoDisponible = ?,
          customFieldsJson = ?,
          delegacionId = ?
        WHERE id = ?
      `);
      stmt.run(
        p.jerarquia || '',
        p.plaza || '',
        p.apellidoNombre || '',
        p.dni || '',
        p.fechaNacimiento || '',
        p.fechaIngreso || '',
        p.grupo || '',
        p.contactoEmergencia || null,
        p.disponible ? 1 : 0,
        p.motivoNoDisponible || null,
        customFieldsJson,
        p.delegacionId || 1,
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('[PUT /api/personal error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/personal/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      db.prepare('DELETE FROM personal WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE /api/personal error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Moviles & Reparaciones
  app.get('/api/moviles', (req: Request, res: Response) => {
    const delegacionId = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    const rows = delegacionId
      ? db.prepare('SELECT * FROM moviles WHERE delegacionId = ? ORDER BY id ASC').all(delegacionId)
      : db.prepare('SELECT * FROM moviles ORDER BY id ASC').all();
    res.json(rows);
  });

  app.post('/api/moviles', (req: Request, res: Response) => {
    try {
      const m = req.body;
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO moviles (id, identificador, marca, modelo, tipo, dominio, chasis, motor, condicion, kmActual, kmUltimoService, kmProximoService, vencimientoRto, vencimientoSeguro, companiaSeguro, numeroPoliza, observaciones, delegacionId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        m.id || null,
        m.identificador || '',
        m.marca || '',
        m.modelo || '',
        m.tipo || '',
        m.dominio || '',
        m.chasis || null,
        m.motor || null,
        m.condicion || 'En Servicio',
        m.kmActual || null,
        m.kmUltimoService || null,
        m.kmProximoService || null,
        m.vencimientoRto || null,
        m.vencimientoSeguro || null,
        m.companiaSeguro || null,
        m.numeroPoliza || null,
        m.observaciones || null,
        m.delegacionId || 1
      );
      res.json({ id: m.id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/moviles error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/moviles/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const m = req.body;
      const stmt = db.prepare(`
        UPDATE moviles SET
          identificador = ?,
          marca = ?,
          modelo = ?,
          tipo = ?,
          dominio = ?,
          chasis = ?,
          motor = ?,
          condicion = ?,
          kmActual = ?,
          kmUltimoService = ?,
          kmProximoService = ?,
          vencimientoRto = ?,
          vencimientoSeguro = ?,
          companiaSeguro = ?,
          numeroPoliza = ?,
          observaciones = ?,
          delegacionId = ?
        WHERE id = ?
      `);
      stmt.run(
        m.identificador || '',
        m.marca || '',
        m.modelo || '',
        m.tipo || '',
        m.dominio || '',
        m.chasis || null,
        m.motor || null,
        m.condicion || 'En Servicio',
        m.kmActual || null,
        m.kmUltimoService || null,
        m.kmProximoService || null,
        m.vencimientoRto || null,
        m.vencimientoSeguro || null,
        m.companiaSeguro || null,
        m.numeroPoliza || null,
        m.observaciones || null,
        m.delegacionId || 1,
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('[PUT /api/moviles error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/moviles/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      db.prepare('DELETE FROM reparaciones WHERE movilId = ?').run(id);
      db.prepare('DELETE FROM moviles WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE /api/moviles error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/reparaciones', (req: Request, res: Response) => {
    const delegacionId = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    const rows = delegacionId
      ? db.prepare('SELECT * FROM reparaciones WHERE delegacionId = ? ORDER BY id DESC').all(delegacionId)
      : db.prepare('SELECT * FROM reparaciones ORDER BY id DESC').all();
    res.json(rows);
  });

  app.post('/api/reparaciones', (req: Request, res: Response) => {
    try {
      const r = req.body;
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO reparaciones (id, movilId, fecha, tallerMecanico, descripcion, repuestosCambiados, costoTotal, kmMomento, observaciones, delegacionId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        r.id || null,
        r.movilId || 1,
        r.fecha || '',
        r.tallerMecanico || null,
        r.descripcion || '',
        r.repuestosCambiados || null,
        r.costoTotal || null,
        r.kmMomento || null,
        r.observaciones || null,
        r.delegacionId || 1
      );
      res.json({ id: r.id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/reparaciones error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/reparaciones/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const r = req.body;
      const stmt = db.prepare(`
        UPDATE reparaciones SET
          movilId = ?,
          fecha = ?,
          tallerMecanico = ?,
          descripcion = ?,
          repuestosCambiados = ?,
          costoTotal = ?,
          kmMomento = ?,
          observaciones = ?,
          delegacionId = ?
        WHERE id = ?
      `);
      stmt.run(
        r.movilId || 1,
        r.fecha || '',
        r.tallerMecanico || null,
        r.descripcion || '',
        r.repuestosCambiados || null,
        r.costoTotal || null,
        r.kmMomento || null,
        r.observaciones || null,
        r.delegacionId || 1,
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('[PUT /api/reparaciones error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/reparaciones/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      db.prepare('DELETE FROM reparaciones WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE /api/reparaciones error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Recargos de Servicio
  app.get('/api/recargos', (req: Request, res: Response) => {
    const delegacionId = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    const rows = delegacionId
      ? db.prepare('SELECT * FROM recargos WHERE delegacionId = ? ORDER BY id DESC').all(delegacionId)
      : db.prepare('SELECT * FROM recargos ORDER BY id DESC').all();
    res.json(rows);
  });

  app.post('/api/recargos', (req: Request, res: Response) => {
    try {
      const rc = req.body;
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO recargos (id, personalId, personalNombre, personalJerarquia, fecha, horarioDesde, horarioHasta, totalHoras, tipoRecargo, lugarDestino, observaciones, delegacionId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        rc.id || null,
        rc.personalId || 1,
        rc.personalNombre || '',
        rc.personalJerarquia || '',
        rc.fecha || '',
        rc.horarioDesde || '',
        rc.horarioHasta || '',
        rc.totalHoras || '',
        rc.tipoRecargo || 'Servicio Ordinario',
        rc.lugarDestino || '',
        rc.observaciones || '',
        rc.delegacionId || 1
      );
      res.json({ id: rc.id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/recargos error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/recargos/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const rc = req.body;
      const stmt = db.prepare(`
        UPDATE recargos SET
          personalId = ?,
          personalNombre = ?,
          personalJerarquia = ?,
          fecha = ?,
          horarioDesde = ?,
          horarioHasta = ?,
          totalHoras = ?,
          tipoRecargo = ?,
          lugarDestino = ?,
          observaciones = ?,
          delegacionId = ?
        WHERE id = ?
      `);
      stmt.run(
        rc.personalId || 1,
        rc.personalNombre || '',
        rc.personalJerarquia || '',
        rc.fecha || '',
        rc.horarioDesde || '',
        rc.horarioHasta || '',
        rc.totalHoras || '',
        rc.tipoRecargo || 'Servicio Ordinario',
        rc.lugarDestino || '',
        rc.observaciones || '',
        rc.delegacionId || 1,
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('[PUT /api/recargos error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/recargos/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      db.prepare('DELETE FROM recargos WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE /api/recargos error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Charlas y Prevención
  app.get('/api/charlas', (req: Request, res: Response) => {
    const delegacionId = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    const rows = delegacionId
      ? db.prepare('SELECT * FROM charlas WHERE delegacionId = ? ORDER BY id DESC').all(delegacionId)
      : db.prepare('SELECT * FROM charlas ORDER BY id DESC').all();
    res.json(rows);
  });

  app.post('/api/charlas', (req: Request, res: Response) => {
    try {
      const ch = req.body;
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO charlas (id, fecha, hora, lugarInstitucion, localidad, temaTratado, personalDesignado, observaciones, delegacionId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        ch.id || null,
        ch.fecha || '',
        ch.hora || '',
        ch.lugarInstitucion || '',
        ch.localidad || '',
        ch.temaTratado || '',
        ch.personalDesignado || '',
        ch.observaciones || '',
        ch.delegacionId || 1
      );
      res.json({ id: ch.id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/charlas error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/charlas/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const ch = req.body;
      const stmt = db.prepare(`
        UPDATE charlas SET
          fecha = ?,
          hora = ?,
          lugarInstitucion = ?,
          localidad = ?,
          temaTratado = ?,
          personalDesignado = ?,
          observaciones = ?,
          delegacionId = ?
        WHERE id = ?
      `);
      stmt.run(
        ch.fecha || '',
        ch.hora || '',
        ch.lugarInstitucion || '',
        ch.localidad || '',
        ch.temaTratado || '',
        ch.personalDesignado || '',
        ch.observaciones || '',
        ch.delegacionId || 1,
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('[PUT /api/charlas error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/charlas/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      db.prepare('DELETE FROM charlas WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE /api/charlas error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Licencias y Cuatrimestres
  app.get('/api/licencias', (req: Request, res: Response) => {
    const delegacionId = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    const rows = delegacionId
      ? db.prepare('SELECT * FROM licencias WHERE delegacionId = ? ORDER BY id DESC').all(delegacionId)
      : db.prepare('SELECT * FROM licencias ORDER BY id DESC').all();
    res.json(rows.map((l: any) => ({
      ...l,
      sumaDiasViaje: Boolean(l.sumaDiasViaje),
      fueInterrumpida: Boolean(l.fueInterrumpida)
    })));
  });

  app.post('/api/licencias', (req: Request, res: Response) => {
    try {
      const l = req.body;
      const periodosDetalleJson = typeof l.periodosDetalleJson === 'object' ? JSON.stringify(l.periodosDetalleJson) : (l.periodosDetalleJson || null);
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO licencias (id, personalId, jerarquia, plaza, apellidoNombre, dni, fechaIngreso, tipoLicencia, anioPeriodo, diasHabilesTomados, sumaDiasViaje, disposicionViaje, diasPermitidosViaje, fueInterrumpida, fechaInterrupcion, motivoInterrupcion, diasRestantesDevueltos, observaciones, periodosDetalleJson, fechaSalida, delegacionId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        l.id || null,
        l.personalId || 1,
        l.jerarquia || null,
        l.plaza || null,
        l.apellidoNombre || null,
        l.dni || null,
        l.fechaIngreso || null,
        l.tipoLicencia || 'Anual',
        l.anioPeriodo || new Date().getFullYear(),
        l.diasHabilesTomados || 0,
        l.sumaDiasViaje ? 1 : 0,
        l.disposicionViaje || null,
        l.diasPermitidosViaje || 0,
        l.fueInterrumpida ? 1 : 0,
        l.fechaInterrupcion || null,
        l.motivoInterrupcion || null,
        l.diasRestantesDevueltos || 0,
        l.observaciones || null,
        periodosDetalleJson,
        l.fechaSalida || null,
        l.delegacionId || 1
      );
      res.json({ id: l.id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/licencias error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/licencias/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const l = req.body;
      const periodosDetalleJson = typeof l.periodosDetalleJson === 'object' ? JSON.stringify(l.periodosDetalleJson) : (l.periodosDetalleJson || null);
      const stmt = db.prepare(`
        UPDATE licencias SET
          personalId = ?,
          jerarquia = ?,
          plaza = ?,
          apellidoNombre = ?,
          dni = ?,
          fechaIngreso = ?,
          tipoLicencia = ?,
          anioPeriodo = ?,
          diasHabilesTomados = ?,
          sumaDiasViaje = ?,
          disposicionViaje = ?,
          diasPermitidosViaje = ?,
          fueInterrumpida = ?,
          fechaInterrupcion = ?,
          motivoInterrupcion = ?,
          diasRestantesDevueltos = ?,
          observaciones = ?,
          periodosDetalleJson = ?,
          fechaSalida = ?,
          delegacionId = ?
        WHERE id = ?
      `);
      stmt.run(
        l.personalId || 1,
        l.jerarquia || null,
        l.plaza || null,
        l.apellidoNombre || null,
        l.dni || null,
        l.fechaIngreso || null,
        l.tipoLicencia || 'Anual',
        l.anioPeriodo || new Date().getFullYear(),
        l.diasHabilesTomados || 0,
        l.sumaDiasViaje ? 1 : 0,
        l.disposicionViaje || null,
        l.diasPermitidosViaje || 0,
        l.fueInterrumpida ? 1 : 0,
        l.fechaInterrupcion || null,
        l.motivoInterrupcion || null,
        l.diasRestantesDevueltos || 0,
        l.observaciones || null,
        periodosDetalleJson,
        l.fechaSalida || null,
        l.delegacionId || 1,
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('[PUT /api/licencias error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/licencias/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      db.prepare('DELETE FROM licencias WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE /api/licencias error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Numerario & Folios
  app.get('/api/numerario/series', (req: Request, res: Response) => {
    const delegacionId = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    const rows = delegacionId
      ? db.prepare('SELECT * FROM series_numerario WHERE delegacionId = ? ORDER BY id ASC').all(delegacionId)
      : db.prepare('SELECT * FROM series_numerario ORDER BY id ASC').all();
    res.json(rows);
  });

  app.post('/api/numerario/series', (req: Request, res: Response) => {
    const s = req.body;
    const stmt = db.prepare(`
      INSERT INTO series_numerario (nombre, prefijo, anio, limiteFolios, columnas, color, delegacionId)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(s.nombre, s.prefijo, s.anio, s.limiteFolios || 1000, s.columnas || 20, s.color || 'blue', s.delegacionId || 1);
    res.json({ id: info.lastInsertRowid, success: true });
  });

  app.put('/api/numerario/series/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const s = req.body;
    const stmt = db.prepare(`
      UPDATE series_numerario SET
        nombre = ?,
        prefijo = ?,
        anio = ?,
        limiteFolios = ?,
        columnas = ?,
        color = ?,
        delegacionId = ?
      WHERE id = ?
    `);
    stmt.run(s.nombre, s.prefijo, s.anio, s.limiteFolios, s.columnas, s.color, s.delegacionId, id);
    res.json({ success: true });
  });

  app.delete('/api/numerario/series/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    db.prepare('DELETE FROM folios_numerario WHERE serieId = ?').run(id);
    db.prepare('DELETE FROM series_numerario WHERE id = ?').run(id);
    res.json({ success: true });
  });

  app.post('/api/numerario/series/:id/reset', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const serie = db.prepare('SELECT * FROM series_numerario WHERE id = ?').get(id) as any;
    const countRow = db.prepare('SELECT count(*) as total FROM folios_numerario WHERE serieId = ?').get(id) as { total: number };
    db.prepare('DELETE FROM folios_numerario WHERE serieId = ?').run(id);

    const actor = getAuditActorFromReq(req);
    recordAuditLog({
      categoria: 'RESETEO',
      operacion: 'REINICIAR_SERIE_NUMERARIO',
      modulo: 'Numerario & Control de Folios',
      entidad: 'series_numerario',
      entidadId: String(id),
      descripcion: `Reinicio de contador de serie "${serie?.nombre || `#${id}`}" (${serie?.prefijo || '-'} · Año ${serie?.anio || '-'}). Folios liberados: ${countRow?.total || 0}`,
      detalles: { serieId: id, serieNombre: serie?.nombre, prefijo: serie?.prefijo, anio: serie?.anio, foliosEliminados: countRow?.total || 0 },
      usuario: actor.usuario,
      usuarioNombre: actor.usuarioNombre,
      usuarioRol: actor.usuarioRol,
      delegacionId: serie?.delegacionId || actor.delegacionId,
      ipAddress: actor.ipAddress
    });

    res.json({ success: true, message: 'Serie reiniciada exitosamente' });
  });

  app.get('/api/numerario/folios', (req: Request, res: Response) => {
    const serieId = req.query.serieId ? parseInt(req.query.serieId as string, 10) : null;
    const delegacionId = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    let rows;
    if (serieId) {
      rows = db.prepare('SELECT * FROM folios_numerario WHERE serieId = ? ORDER BY numero ASC').all(serieId);
    } else if (delegacionId) {
      rows = db.prepare('SELECT * FROM folios_numerario WHERE delegacionId = ? ORDER BY id DESC').all(delegacionId);
    } else {
      rows = db.prepare('SELECT * FROM folios_numerario ORDER BY id DESC').all();
    }
    res.json(rows);
  });

  app.post('/api/numerario/folios', (req: Request, res: Response) => {
    try {
      const f = req.body;
      const anioVal = Number(f.anio) || new Date().getFullYear();
      const caratulaVal = f.caratula || `Folio N° ${f.numero}/${anioVal}`;
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO folios_numerario (id, serieId, numero, rangoId, anio, caratula, asunto, destinatario, solicitante, observaciones, tipoDocumento, fecha, hora, usuarioAsigno, delegacionId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        f.id || null,
        f.serieId,
        f.numero,
        f.rangoId || null,
        anioVal,
        caratulaVal,
        f.asunto || '',
        f.destinatario || '',
        f.solicitante || null,
        f.observaciones || null,
        f.tipoDocumento || 'Oficio',
        f.fecha || new Date().toLocaleDateString('es-AR'),
        f.hora || new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        f.usuarioAsigno || 'sistema',
        f.delegacionId || 1
      );
      res.json({ id: f.id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/numerario/folios error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/numerario/folios/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const f = req.body;
    db.prepare(`
      UPDATE folios_numerario
      SET asunto = COALESCE(?, asunto),
          destinatario = COALESCE(?, destinatario),
          solicitante = COALESCE(?, solicitante),
          observaciones = COALESCE(?, observaciones)
      WHERE id = ?
    `).run(f.asunto, f.destinatario, f.solicitante, f.observaciones, id);
    res.json({ success: true });
  });

  app.post('/api/numerario/folios/range', (req: Request, res: Response) => {
    const { folios } = req.body as { folios: any[] };
    if (!Array.isArray(folios) || folios.length === 0) {
      return res.status(400).json({ error: 'Array de folios requerido' });
    }

    const insertStmt = db.prepare(`
      INSERT INTO folios_numerario (serieId, numero, rangoId, anio, caratula, asunto, destinatario, solicitante, observaciones, tipoDocumento, fecha, hora, usuarioAsigno, delegacionId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction((list: any[]) => {
      for (const f of list) {
        const anioVal = Number(f.anio) || new Date().getFullYear();
        const caratulaVal = f.caratula || `Folio N° ${f.numero}/${anioVal}`;
        insertStmt.run(
          f.serieId,
          f.numero,
          f.rangoId || null,
          anioVal,
          caratulaVal,
          f.asunto || '',
          f.destinatario || '',
          f.solicitante || null,
          f.observaciones || null,
          f.tipoDocumento || 'Oficio',
          f.fecha || new Date().toLocaleDateString('es-AR'),
          f.hora || new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
          f.usuarioAsigno || 'sistema',
          f.delegacionId || 1
        );
      }
    });

    tx(folios);
    res.json({ success: true, count: folios.length });
  });

  app.delete('/api/numerario/folios/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const liberarRango = req.query.liberarRango === 'true';

    if (liberarRango) {
      const target = db.prepare('SELECT rangoId FROM folios_numerario WHERE id = ?').get(id) as { rangoId?: string } | undefined;
      if (target?.rangoId) {
        db.prepare('DELETE FROM folios_numerario WHERE rangoId = ?').run(target.rangoId);
        return res.json({ success: true, message: 'Rango liberado completo' });
      }
    }

    db.prepare('DELETE FROM folios_numerario WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Personas Investigadas / Imputadas en Evidencias
  app.get('/api/personas', (_req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM personas ORDER BY id DESC').all() as any[];
    const parsed = rows.map((p) => ({
      ...p,
      expedientesVinculados: typeof p.expedientesVinculados === 'string'
        ? (() => { try { return JSON.parse(p.expedientesVinculados); } catch { return []; } })()
        : (Array.isArray(p.expedientesVinculados) ? p.expedientesVinculados : [])
    }));
    res.json(parsed);
  });

  app.post('/api/personas', (req: Request, res: Response) => {
    try {
      const p = req.body;
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO personas (id, apellidoNombre, dni, observaciones, fechaRegistro, expedientesVinculados, delegacionId)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        p.id || null,
        p.apellidoNombre || '',
        p.dni || '',
        p.observaciones || null,
        p.fechaRegistro || new Date().toLocaleDateString('es-AR'),
        JSON.stringify(Array.isArray(p.expedientesVinculados) ? p.expedientesVinculados : []),
        p.delegacionId || null
      );
      res.json({ id: p.id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/personas error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/personas/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const p = req.body;
      const stmt = db.prepare(`
        UPDATE personas SET
          apellidoNombre = ?,
          dni = ?,
          observaciones = ?,
          expedientesVinculados = ?,
          delegacionId = ?
        WHERE id = ?
      `);
      stmt.run(
        p.apellidoNombre || '',
        p.dni || '',
        p.observaciones || null,
        JSON.stringify(Array.isArray(p.expedientesVinculados) ? p.expedientesVinculados : []),
        p.delegacionId || null,
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('[PUT /api/personas error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/personas/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      db.prepare('DELETE FROM personas WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE /api/personas error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Catálogos Dinámicos Compartidos
  app.get('/api/dynamic-catalogs', (_req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM dynamic_catalogs ORDER BY category ASC, value ASC').all();
    res.json(rows);
  });

  app.post('/api/dynamic-catalogs', (req: Request, res: Response) => {
    try {
      const { id, category, value, delegacionId } = req.body;
      const stmt = db.prepare('INSERT OR REPLACE INTO dynamic_catalogs (id, category, value, delegacionId) VALUES (?, ?, ?, ?)');
      const info = stmt.run(id || null, category, value, delegacionId || null);
      res.json({ id: id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/dynamic-catalogs error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/dynamic-catalogs/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    db.prepare('DELETE FROM dynamic_catalogs WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Sync All / Full State Endpoint
  app.get('/api/sync/all', (_req: Request, res: Response) => {
    const expedientes = db.prepare('SELECT * FROM expedientes ORDER BY id ASC').all();
    const personal = db.prepare('SELECT * FROM personal ORDER BY id ASC').all().map((p: any) => ({ ...p, disponible: Boolean(p.disponible) }));
    const moviles = db.prepare('SELECT * FROM moviles ORDER BY id ASC').all();
    const reparaciones = db.prepare('SELECT * FROM reparaciones ORDER BY id ASC').all();
    const recargos = db.prepare('SELECT * FROM recargos ORDER BY id ASC').all();
    const charlas = db.prepare('SELECT * FROM charlas ORDER BY id ASC').all();
    const licencias = db.prepare('SELECT * FROM licencias ORDER BY id ASC').all();
    const personas = db.prepare('SELECT * FROM personas ORDER BY id ASC').all().map((p: any) => ({
      ...p,
      expedientesVinculados: typeof p.expedientesVinculados === 'string'
        ? (() => { try { return JSON.parse(p.expedientesVinculados); } catch { return []; } })()
        : (Array.isArray(p.expedientesVinculados) ? p.expedientesVinculados : [])
    }));
    const dynamicCatalogs = db.prepare('SELECT * FROM dynamic_catalogs ORDER BY id ASC').all();
    const delegaciones = db.prepare('SELECT * FROM delegaciones ORDER BY id ASC').all();
    const seriesNumerario = db.prepare('SELECT * FROM series_numerario ORDER BY id ASC').all();
    const foliosNumerario = db.prepare('SELECT * FROM folios_numerario ORDER BY id ASC').all();
    const roles = db.prepare('SELECT * FROM custom_roles ORDER BY id ASC').all().map((r: any) => {
      const isSuper = r.nombre === 'superusuario';
      const isReadOnly = isSuper ? false : Boolean(r.readOnly);
      return {
        ...r,
        canCreate: isSuper ? true : (isReadOnly ? false : (r.canCreate !== undefined ? Boolean(r.canCreate) : true)),
        canEdit: isSuper ? true : (isReadOnly ? false : (r.canEdit !== undefined ? Boolean(r.canEdit) : true)),
        canDelete: isSuper ? true : (isReadOnly ? false : Boolean(r.canDelete)),
        readOnly: isReadOnly,
        canExport: isSuper ? true : (r.canExport !== undefined ? Boolean(r.canExport) : true),
        canResetCounters: isSuper ? true : (isReadOnly ? false : Boolean(r.canResetCounters)),
        allDelegacionesAccess: Boolean(r.allDelegacionesAccess),
        canAdminModules: isSuper ? true : (isReadOnly ? false : Boolean(r.canAdminModules)),
        isSystem: Boolean(r.isSystem),
        allowedModules: typeof r.allowedModules === 'string'
          ? (() => { try { return JSON.parse(r.allowedModules); } catch { return []; } })()
          : (Array.isArray(r.allowedModules) ? r.allowedModules : [])
      };
    });

    const navModulesRow = db.prepare("SELECT valueJson FROM app_settings WHERE key = 'nav_modules'").get() as { valueJson: string } | undefined;
    const navModulesConfig = navModulesRow?.valueJson ? JSON.parse(navModulesRow.valueJson) : null;

    res.json({
      expedientes,
      personal,
      moviles,
      reparaciones,
      recargos,
      charlas,
      licencias,
      personas,
      dynamicCatalogs,
      delegaciones,
      seriesNumerario,
      foliosNumerario,
      roles,
      navModulesConfig
    });
  });

  // Nav Modules Configuration Endpoints
  app.get('/api/settings/nav-modules', (_req: Request, res: Response) => {
    try {
      const row = db.prepare("SELECT valueJson FROM app_settings WHERE key = 'nav_modules'").get() as { valueJson: string } | undefined;
      if (row && row.valueJson) {
        return res.json(JSON.parse(row.valueJson));
      }
      return res.json([]);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/settings/nav-modules', (req: Request, res: Response) => {
    try {
      const modules = req.body;
      db.prepare("INSERT INTO app_settings (key, valueJson) VALUES ('nav_modules', ?) ON CONFLICT(key) DO UPDATE SET valueJson = excluded.valueJson").run(JSON.stringify(modules));
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Full Database Backup Export
  app.get('/api/backup/export', (req: Request, res: Response) => {
    const backup = {
      version: 4,
      timestamp: new Date().toISOString(),
      delegaciones: db.prepare('SELECT * FROM delegaciones').all(),
      institutionalConfigs: db.prepare('SELECT * FROM institutional_configs').all(),
      users: db.prepare('SELECT * FROM users').all(),
      expedientes: db.prepare('SELECT * FROM expedientes').all(),
      personal: db.prepare('SELECT * FROM personal').all(),
      moviles: db.prepare('SELECT * FROM moviles').all(),
      reparaciones: db.prepare('SELECT * FROM reparaciones').all(),
      recargos: db.prepare('SELECT * FROM recargos').all(),
      charlas: db.prepare('SELECT * FROM charlas').all(),
      licencias: db.prepare('SELECT * FROM licencias').all(),
      personas: db.prepare('SELECT * FROM personas').all(),
      dynamicCatalogs: db.prepare('SELECT * FROM dynamic_catalogs').all(),
      seriesNumerario: db.prepare('SELECT * FROM series_numerario').all(),
      foliosNumerario: db.prepare('SELECT * FROM folios_numerario').all()
    };

    const actor = getAuditActorFromReq(req);
    recordAuditLog({
      categoria: 'RESPALDO',
      operacion: 'EXPORTAR_RESPALDO_CENTRAL',
      modulo: 'Respaldos & Depuración',
      entidad: 'backup',
      descripcion: `Exportación completa de base de datos central SQLite`,
      usuario: actor.usuario,
      usuarioNombre: actor.usuarioNombre,
      usuarioRol: actor.usuarioRol,
      delegacionId: actor.delegacionId,
      ipAddress: actor.ipAddress
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=sispol_backup_${new Date().toISOString().slice(0, 10)}.json`);
    res.json(backup);
  });

  // Helper function to parse dates to timestamp
  function parseDateToTimeServer(val: any): number | null {
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') {
      if (val >= 1970 && val <= 2100) return new Date(val, 0, 1).getTime();
      return val;
    }
    const str = String(val).trim();
    if (!str) return null;
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(str)) {
      const sep = str.includes('/') ? '/' : '-';
      const [d, m, y] = str.split(sep);
      const parsed = new Date(Number(y), Number(m) - 1, Number(d));
      return isNaN(parsed.getTime()) ? null : parsed.getTime();
    }
    if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(str)) {
      const sep = str.includes('/') ? '/' : '-';
      const parts = str.split('T')[0].split(sep);
      const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return isNaN(parsed.getTime()) ? null : parsed.getTime();
    }
    const timestamp = Date.parse(str);
    return isNaN(timestamp) ? null : timestamp;
  }

  // Maintenance: Purge / Delete by Period
  app.post('/api/maintenance/purge-period', (req: Request, res: Response) => {
    try {
      const { startTime, endTime, entities = {}, delegacionId } = req.body;
      if (!startTime || !endTime) {
        return res.status(400).json({ error: 'startTime and endTime are required' });
      }

      const deletedCounts: Record<string, number> = {
        expedientes: 0,
        foliosNumerario: 0,
        personas: 0,
        licencias: 0,
        recargos: 0,
        reparaciones: 0,
        charlas: 0,
        total: 0
      };

      const purgeTx = db.transaction(() => {
        if (entities.expedientes) {
          const rows = db.prepare('SELECT id, fechaIngreso, delegacionId FROM expedientes').all();
          const ids = rows
            .filter((r: any) => {
              if (delegacionId && r.delegacionId && r.delegacionId !== delegacionId) return false;
              const t = parseDateToTimeServer(r.fechaIngreso);
              return t !== null && t >= startTime && t <= endTime;
            })
            .map((r: any) => r.id);
          if (ids.length > 0) {
            db.prepare(`DELETE FROM expedientes WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
            deletedCounts.expedientes = ids.length;
          }
        }

        if (entities.foliosNumerario) {
          const rows = db.prepare('SELECT id, fecha, anio FROM folios_numerario').all();
          const ids = rows
            .filter((r: any) => {
              const t = parseDateToTimeServer(r.fecha) || (r.anio ? parseDateToTimeServer(r.anio) : null);
              return t !== null && t >= startTime && t <= endTime;
            })
            .map((r: any) => r.id);
          if (ids.length > 0) {
            db.prepare(`DELETE FROM folios_numerario WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
            deletedCounts.foliosNumerario = ids.length;
          }
        }

        if (entities.personas) {
          const rows = db.prepare('SELECT id, fechaRegistro, delegacionId FROM personas').all();
          const ids = rows
            .filter((r: any) => {
              if (delegacionId && r.delegacionId && r.delegacionId !== delegacionId) return false;
              const t = parseDateToTimeServer(r.fechaRegistro);
              return t !== null && t >= startTime && t <= endTime;
            })
            .map((r: any) => r.id);
          if (ids.length > 0) {
            db.prepare(`DELETE FROM personas WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
            deletedCounts.personas = ids.length;
          }
        }

        if (entities.licencias) {
          const rows = db.prepare('SELECT id, fechaSalida, fechaIngreso, anioPeriodo, delegacionId FROM licencias').all();
          const ids = rows
            .filter((r: any) => {
              if (delegacionId && r.delegacionId && r.delegacionId !== delegacionId) return false;
              const t = parseDateToTimeServer(r.fechaSalida) || parseDateToTimeServer(r.fechaIngreso) || (r.anioPeriodo ? parseDateToTimeServer(r.anioPeriodo) : null);
              return t !== null && t >= startTime && t <= endTime;
            })
            .map((r: any) => r.id);
          if (ids.length > 0) {
            db.prepare(`DELETE FROM licencias WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
            deletedCounts.licencias = ids.length;
          }
        }

        if (entities.recargos) {
          const rows = db.prepare('SELECT id, fecha, delegacionId FROM recargos').all();
          const ids = rows
            .filter((r: any) => {
              if (delegacionId && r.delegacionId && r.delegacionId !== delegacionId) return false;
              const t = parseDateToTimeServer(r.fecha);
              return t !== null && t >= startTime && t <= endTime;
            })
            .map((r: any) => r.id);
          if (ids.length > 0) {
            db.prepare(`DELETE FROM recargos WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
            deletedCounts.recargos = ids.length;
          }
        }

        if (entities.reparaciones) {
          const rows = db.prepare('SELECT id, fecha, delegacionId FROM reparaciones').all();
          const ids = rows
            .filter((r: any) => {
              if (delegacionId && r.delegacionId && r.delegacionId !== delegacionId) return false;
              const t = parseDateToTimeServer(r.fecha);
              return t !== null && t >= startTime && t <= endTime;
            })
            .map((r: any) => r.id);
          if (ids.length > 0) {
            db.prepare(`DELETE FROM reparaciones WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
            deletedCounts.reparaciones = ids.length;
          }
        }

        if (entities.charlas) {
          const rows = db.prepare('SELECT id, fecha, delegacionId FROM charlas').all();
          const ids = rows
            .filter((r: any) => {
              if (delegacionId && r.delegacionId && r.delegacionId !== delegacionId) return false;
              const t = parseDateToTimeServer(r.fecha);
              return t !== null && t >= startTime && t <= endTime;
            })
            .map((r: any) => r.id);
          if (ids.length > 0) {
            db.prepare(`DELETE FROM charlas WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
            deletedCounts.charlas = ids.length;
          }
        }
      });

      purgeTx();

      deletedCounts.total = deletedCounts.expedientes + deletedCounts.foliosNumerario + deletedCounts.personas +
        deletedCounts.licencias + deletedCounts.recargos + deletedCounts.reparaciones + deletedCounts.charlas;

      // Reclaim space to keep database lightweight
      try { db.pragma('optimize'); } catch {}

      const actor = getAuditActorFromReq(req);
      recordAuditLog({
        categoria: 'RESETEO',
        operacion: 'DEPURACION_PERIODO',
        modulo: 'Respaldos & Depuración',
        entidad: 'maintenance',
        descripcion: `Depuración selectiva por período (${new Date(startTime).toLocaleDateString('es-AR')} - ${new Date(endTime).toLocaleDateString('es-AR')}): ${deletedCounts.total} registros eliminados`,
        detalles: { startTime, endTime, entities, deletedCounts, delegacionId },
        usuario: actor.usuario,
        usuarioNombre: actor.usuarioNombre,
        usuarioRol: actor.usuarioRol,
        delegacionId: delegacionId || actor.delegacionId,
        ipAddress: actor.ipAddress
      });

      res.json({ success: true, deletedCounts });
    } catch (err: any) {
      console.error('[Purge Period Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Maintenance: Clear / Wipe All Data (Fresh Start for Real Operations)
  app.post('/api/maintenance/clear-all', (req: Request, res: Response) => {
    try {
      const {
        clearExpedientes = true,
        clearPersonal = true,
        clearFolios = true,
        clearPersonas = true,
        clearMoviles = true,
        clearReparaciones = true,
        clearRecargos = true,
        clearCharlas = true,
        clearLicencias = true,
        clearSeriesNumerario = false,
        clearDynamicCatalogs = false,
        clearDynamicFields = false
      } = req.body;

      const clearTx = db.transaction(() => {
        if (clearExpedientes) db.exec('DELETE FROM expedientes');
        if (clearFolios) db.exec('DELETE FROM folios_numerario');
        if (clearPersonas) db.exec('DELETE FROM personas');
        if (clearLicencias) db.exec('DELETE FROM licencias');
        if (clearPersonal) db.exec('DELETE FROM personal');
        if (clearMoviles) db.exec('DELETE FROM moviles');
        if (clearReparaciones) db.exec('DELETE FROM reparaciones');
        if (clearRecargos) db.exec('DELETE FROM recargos');
        if (clearCharlas) db.exec('DELETE FROM charlas');
        if (clearSeriesNumerario) db.exec('DELETE FROM series_numerario');
        if (clearDynamicCatalogs) db.exec('DELETE FROM dynamic_catalogs');
        if (clearDynamicFields) db.exec('DELETE FROM dynamic_fields');

        // Vacuum and optimize to keep database compact and lightweight
        try { db.pragma('optimize'); } catch {}
      });

      clearTx();

      const actor = getAuditActorFromReq(req);
      recordAuditLog({
        categoria: 'RESETEO',
        operacion: 'VACIADO_BASE_DATOS',
        modulo: 'Respaldos & Depuración',
        entidad: 'maintenance',
        descripcion: `Vaciado total de tablas operativas para reinicio limpio del sistema`,
        detalles: {
          clearExpedientes,
          clearPersonal,
          clearFolios,
          clearPersonas,
          clearMoviles,
          clearReparaciones,
          clearRecargos,
          clearCharlas,
          clearLicencias,
          clearSeriesNumerario,
          clearDynamicCatalogs,
          clearDynamicFields
        },
        usuario: actor.usuario,
        usuarioNombre: actor.usuarioNombre,
        usuarioRol: actor.usuarioRol,
        delegacionId: actor.delegacionId,
        ipAddress: actor.ipAddress
      });

      res.json({
        success: true,
        message: 'Base de datos vaciada con éxito para carga de datos limpios.'
      });
    } catch (err: any) {
      console.error('[Clear All Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Maintenance: Restore by Period
  app.post('/api/maintenance/restore-period', (req: Request, res: Response) => {
    try {
      const { startTime, endTime, entities = {}, mode = 'merge', data = {}, delegacionId } = req.body;
      if (!startTime || !endTime) {
        return res.status(400).json({ error: 'startTime and endTime are required' });
      }

      const restoredCounts: Record<string, number> = {
        expedientes: 0,
        foliosNumerario: 0,
        personas: 0,
        licencias: 0,
        recargos: 0,
        reparaciones: 0,
        charlas: 0,
        total: 0
      };

      const restoreTx = db.transaction(() => {
        // If mode is replace, delete target range first
        if (mode === 'replace') {
          if (entities.expedientes) {
            const rows = db.prepare('SELECT id, fechaIngreso FROM expedientes').all();
            const ids = rows.filter((r: any) => {
              const t = parseDateToTimeServer(r.fechaIngreso);
              return t !== null && t >= startTime && t <= endTime;
            }).map((r: any) => r.id);
            if (ids.length > 0) db.prepare(`DELETE FROM expedientes WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
          }
          if (entities.foliosNumerario) {
            const rows = db.prepare('SELECT id, fecha, anio FROM folios_numerario').all();
            const ids = rows.filter((r: any) => {
              const t = parseDateToTimeServer(r.fecha) || (r.anio ? parseDateToTimeServer(r.anio) : null);
              return t !== null && t >= startTime && t <= endTime;
            }).map((r: any) => r.id);
            if (ids.length > 0) db.prepare(`DELETE FROM folios_numerario WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
          }
          if (entities.personas) {
            const rows = db.prepare('SELECT id, fechaRegistro FROM personas').all();
            const ids = rows.filter((r: any) => {
              const t = parseDateToTimeServer(r.fechaRegistro);
              return t !== null && t >= startTime && t <= endTime;
            }).map((r: any) => r.id);
            if (ids.length > 0) db.prepare(`DELETE FROM personas WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
          }
          if (entities.licencias) {
            const rows = db.prepare('SELECT id, fechaSalida, fechaIngreso, anioPeriodo FROM licencias').all();
            const ids = rows.filter((r: any) => {
              const t = parseDateToTimeServer(r.fechaSalida) || parseDateToTimeServer(r.fechaIngreso) || (r.anioPeriodo ? parseDateToTimeServer(r.anioPeriodo) : null);
              return t !== null && t >= startTime && t <= endTime;
            }).map((r: any) => r.id);
            if (ids.length > 0) db.prepare(`DELETE FROM licencias WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
          }
          if (entities.recargos) {
            const rows = db.prepare('SELECT id, fecha FROM recargos').all();
            const ids = rows.filter((r: any) => {
              const t = parseDateToTimeServer(r.fecha);
              return t !== null && t >= startTime && t <= endTime;
            }).map((r: any) => r.id);
            if (ids.length > 0) db.prepare(`DELETE FROM recargos WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
          }
          if (entities.reparaciones) {
            const rows = db.prepare('SELECT id, fecha FROM reparaciones').all();
            const ids = rows.filter((r: any) => {
              const t = parseDateToTimeServer(r.fecha);
              return t !== null && t >= startTime && t <= endTime;
            }).map((r: any) => r.id);
            if (ids.length > 0) db.prepare(`DELETE FROM reparaciones WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
          }
          if (entities.charlas) {
            const rows = db.prepare('SELECT id, fecha FROM charlas').all();
            const ids = rows.filter((r: any) => {
              const t = parseDateToTimeServer(r.fecha);
              return t !== null && t >= startTime && t <= endTime;
            }).map((r: any) => r.id);
            if (ids.length > 0) db.prepare(`DELETE FROM charlas WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
          }
        }

        // Insert / Upsert records
        if (entities.expedientes && Array.isArray(data.expedientes)) {
          const insertStmt = db.prepare(`
            INSERT OR REPLACE INTO expedientes (id, anio, nroExpediente, fechaIngreso, fechaVencimiento, tipoRequerimiento, juzgado, caratula, estado, customFieldsJson, delegacionId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const item of data.expedientes) {
            const t = parseDateToTimeServer(item.fechaIngreso);
            if (t !== null && t >= startTime && t <= endTime) {
              insertStmt.run(
                item.id || null,
                item.anio || new Date().getFullYear(),
                item.nroExpediente || '',
                item.fechaIngreso || '',
                item.fechaVencimiento || null,
                item.tipoRequerimiento || '',
                item.juzgado || '',
                item.caratula || '',
                item.estado || 'En Trámite',
                typeof item.customFieldsJson === 'object' ? JSON.stringify(item.customFieldsJson) : (item.customFieldsJson || null),
                item.delegacionId || delegacionId || 1
              );
              restoredCounts.expedientes++;
            }
          }
        }

        if (entities.foliosNumerario && Array.isArray(data.foliosNumerario)) {
          const insertFolio = db.prepare(`
            INSERT OR REPLACE INTO folios_numerario (id, serieId, numero, rangoId, anio, caratula, asunto, destinatario, solicitante, observaciones, tipoDocumento, fecha, hora, usuarioAsigno, delegacionId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const item of data.foliosNumerario) {
            const folioFecha = item.fecha || (item as any).fechaAsignacion || new Date().toISOString().slice(0, 10);
            const t = parseDateToTimeServer(folioFecha) || (item.anio ? parseDateToTimeServer(item.anio) : null);
            if (t !== null && t >= startTime && t <= endTime) {
              insertFolio.run(
                item.id || null,
                item.serieId || 1,
                item.numero || (item as any).numeroFolio || 1,
                item.rangoId || null,
                Number(item.anio) || new Date().getFullYear(),
                item.caratula || (item as any).caratulaExpediente || '',
                item.asunto || '',
                item.destinatario || '',
                item.solicitante || (item as any).causante || '',
                item.observaciones || null,
                item.tipoDocumento || 'Oficio Judicial',
                folioFecha,
                item.hora || '08:00',
                item.usuarioAsigno || (item as any).usuarioAsignado || 'Sistema',
                item.delegacionId || delegacionId || 1
              );
              restoredCounts.foliosNumerario++;
            }
          }
        }

        if (entities.personas && Array.isArray(data.personas)) {
          const insertPersona = db.prepare(`
            INSERT OR REPLACE INTO personas (id, apellidoNombre, dni, observaciones, fechaRegistro, expedientesVinculados, delegacionId)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          for (const item of data.personas) {
            const t = parseDateToTimeServer(item.fechaRegistro);
            if (t !== null && t >= startTime && t <= endTime) {
              insertPersona.run(
                item.id || null,
                item.apellidoNombre || '',
                item.dni || '',
                item.observaciones || null,
                item.fechaRegistro || null,
                typeof item.expedientesVinculados === 'object' ? JSON.stringify(item.expedientesVinculados) : (item.expedientesVinculados || null),
                item.delegacionId || delegacionId || 1
              );
              restoredCounts.personas++;
            }
          }
        }

        if (entities.licencias && Array.isArray(data.licencias)) {
          const insertLic = db.prepare(`
            INSERT OR REPLACE INTO licencias (id, personalId, jerarquia, plaza, apellidoNombre, dni, fechaIngreso, tipoLicencia, anioPeriodo, diasHabilesTomados, sumaDiasViaje, disposicionViaje, diasPermitidosViaje, fueInterrumpida, fechaInterrupcion, motivoInterrupcion, diasRestantesDevueltos, observaciones, periodosDetalleJson, fechaSalida, delegacionId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const item of data.licencias) {
            const t = parseDateToTimeServer(item.fechaSalida) || parseDateToTimeServer(item.fechaIngreso) || (item.anioPeriodo ? parseDateToTimeServer(item.anioPeriodo) : null);
            if (t !== null && t >= startTime && t <= endTime) {
              insertLic.run(
                item.id || null,
                item.personalId || 1,
                item.jerarquia || '',
                item.plaza || '',
                item.apellidoNombre || '',
                item.dni || '',
                item.fechaIngreso || null,
                item.tipoLicencia || '',
                item.anioPeriodo || new Date().getFullYear(),
                item.diasHabilesTomados || 0,
                item.sumaDiasViaje || 0,
                item.disposicionViaje || null,
                item.diasPermitidosViaje || 0,
                item.fueInterrumpida ? 1 : 0,
                item.fechaInterrupcion || null,
                item.motivoInterrupcion || null,
                item.diasRestantesDevueltos || 0,
                item.observaciones || null,
                typeof item.periodosDetalleJson === 'object' ? JSON.stringify(item.periodosDetalleJson) : (item.periodosDetalleJson || null),
                item.fechaSalida || null,
                item.delegacionId || delegacionId || 1
              );
              restoredCounts.licencias++;
            }
          }
        }

        if (entities.recargos && Array.isArray(data.recargos)) {
          const insertRec = db.prepare(`
            INSERT OR REPLACE INTO recargos (id, personalId, personalNombre, personalJerarquia, fecha, horarioDesde, horarioHasta, totalHoras, tipoRecargo, lugarDestino, observaciones, delegacionId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const item of data.recargos) {
            const t = parseDateToTimeServer(item.fecha);
            if (t !== null && t >= startTime && t <= endTime) {
              insertRec.run(
                item.id || null,
                item.personalId || 1,
                item.personalNombre || '',
                item.personalJerarquia || '',
                item.fecha || '',
                item.horarioDesde || '',
                item.horarioHasta || '',
                item.totalHoras || '',
                item.tipoRecargo || '',
                item.lugarDestino || '',
                item.observaciones || '',
                item.delegacionId || delegacionId || 1
              );
              restoredCounts.recargos++;
            }
          }
        }

        if (entities.reparaciones && Array.isArray(data.reparaciones)) {
          const insertRep = db.prepare(`
            INSERT OR REPLACE INTO reparaciones (id, movilId, fecha, tallerMecanico, descripcion, repuestosCambiados, costoTotal, kmMomento, observaciones, delegacionId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const item of data.reparaciones) {
            const t = parseDateToTimeServer(item.fecha);
            if (t !== null && t >= startTime && t <= endTime) {
              insertRep.run(
                item.id || null,
                item.movilId || 1,
                item.fecha || '',
                item.tallerMecanico || '',
                item.descripcion || '',
                item.repuestosCambiados || '',
                item.costoTotal || 0,
                item.kmMomento || '',
                item.observaciones || '',
                item.delegacionId || delegacionId || 1
              );
              restoredCounts.reparaciones++;
            }
          }
        }

        if (entities.charlas && Array.isArray(data.charlas)) {
          const insertCh = db.prepare(`
            INSERT OR REPLACE INTO charlas (id, fecha, hora, lugarInstitucion, localidad, temaTratado, personalDesignado, observaciones, delegacionId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const item of data.charlas) {
            const t = parseDateToTimeServer(item.fecha);
            if (t !== null && t >= startTime && t <= endTime) {
              insertCh.run(
                item.id || null,
                item.fecha || '',
                item.hora || '',
                item.lugarInstitucion || '',
                item.localidad || '',
                item.temaTratado || '',
                item.personalDesignado || '',
                item.observaciones || '',
                item.delegacionId || delegacionId || 1
              );
              restoredCounts.charlas++;
            }
          }
        }
      });

      restoreTx();

      restoredCounts.total = restoredCounts.expedientes + restoredCounts.foliosNumerario + restoredCounts.personas +
        restoredCounts.licencias + restoredCounts.recargos + restoredCounts.reparaciones + restoredCounts.charlas;

      const actor = getAuditActorFromReq(req);
      recordAuditLog({
        categoria: 'RESPALDO',
        operacion: 'RESTAURACION_PERIODO',
        modulo: 'Respaldos & Depuración',
        entidad: 'maintenance',
        descripcion: `Restauración de respaldo por período (modo: ${mode}): ${restoredCounts.total} registros incorporados`,
        detalles: { startTime, endTime, mode, entities, restoredCounts, delegacionId },
        usuario: actor.usuario,
        usuarioNombre: actor.usuarioNombre,
        usuarioRol: actor.usuarioRol,
        delegacionId: delegacionId || actor.delegacionId,
        ipAddress: actor.ipAddress
      });

      res.json({ success: true, restoredCounts });
    } catch (err: any) {
      console.error('[Restore Period Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // Audit & Traceability Endpoints (Exclusivo Superusuario, 30-day retention)
  // -------------------------------------------------------------
  app.get('/api/audit-logs', (req: Request, res: Response) => {
    const roleHeader = req.header('x-audit-user-role') || (req.query.rol as string) || '';
    let decodedRole = roleHeader;
    try { decodedRole = decodeURIComponent(roleHeader); } catch {}
    if (decodedRole !== 'superusuario') {
      return res.status(403).json({ error: 'Acceso denegado. Módulo exclusivo para Superusuario.' });
    }

    // Enforce 30-day retention automatically on every query
    purgeOldAuditLogs();

    const { fechaDesde, fechaHasta, categoria, modulo, usuario, q, order = 'DESC', limit = '500' } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: any[] = [];

    if (fechaDesde) {
      conditions.push('fechaDia >= ?');
      params.push(fechaDesde);
    }
    if (fechaHasta) {
      conditions.push('fechaDia <= ?');
      params.push(fechaHasta);
    }
    if (categoria && categoria !== 'TODAS') {
      conditions.push('categoria = ?');
      params.push(categoria);
    }
    if (modulo && modulo !== 'TODOS') {
      conditions.push('modulo = ?');
      params.push(modulo);
    }
    if (usuario && usuario !== 'TODOS') {
      conditions.push('LOWER(usuario) = LOWER(?)');
      params.push(usuario);
    }
    if (q && q.trim()) {
      const term = `%${q.trim().toLowerCase()}%`;
      conditions.push('(LOWER(operacion) LIKE ? OR LOWER(descripcion) LIKE ? OR LOWER(modulo) LIKE ? OR LOWER(usuario) LIKE ? OR LOWER(COALESCE(usuarioNombre, \'\')) LIKE ? OR LOWER(COALESCE(entidadId, \'\')) LIKE ?)');
      params.push(term, term, term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sortDir = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const maxLimit = Math.min(Math.max(parseInt(limit || '500', 10) || 500, 1), 2000);

    const logs = db
      .prepare(`SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp ${sortDir}, id ${sortDir} LIMIT ?`)
      .all(...params, maxLimit);

    const statsRows = db
      .prepare('SELECT categoria, count(*) as count FROM audit_logs GROUP BY categoria')
      .all() as { categoria: string; count: number }[];
    const stats: Record<string, number> = { TOTAL: 0 };
    for (const row of statsRows) {
      stats[row.categoria] = row.count;
      stats.TOTAL += row.count;
    }

    const oldestRow = db.prepare('SELECT MIN(timestamp) as oldest FROM audit_logs').get() as { oldest: string | null };
    const usersList = db.prepare('SELECT DISTINCT usuario FROM audit_logs ORDER BY usuario ASC').all().map((r: any) => r.usuario);
    const modulesList = db.prepare('SELECT DISTINCT modulo FROM audit_logs ORDER BY modulo ASC').all().map((r: any) => r.modulo);

    res.json({
      logs,
      total: stats.TOTAL,
      stats,
      retentionDays: AUDIT_RETENTION_DAYS,
      oldestTimestamp: oldestRow?.oldest || null,
      usersList,
      modulesList
    });
  });

  app.post('/api/audit-logs', (req: Request, res: Response) => {
    purgeOldAuditLogs();
    const actor = getAuditActorFromReq(req);
    const b = req.body || {};
    if (!b.operacion || !b.descripcion) {
      return res.status(400).json({ error: 'operacion y descripcion son requeridos' });
    }
    recordAuditLog({
      categoria: b.categoria || 'MODIFICACION',
      operacion: b.operacion,
      modulo: b.modulo || 'Sistema',
      entidad: b.entidad,
      entidadId: b.entidadId ? String(b.entidadId) : undefined,
      descripcion: b.descripcion,
      detalles: b.detalles,
      usuario: b.usuario || actor.usuario,
      usuarioNombre: b.usuarioNombre || actor.usuarioNombre,
      usuarioRol: b.usuarioRol || actor.usuarioRol,
      delegacionId: b.delegacionId || actor.delegacionId,
      ipAddress: actor.ipAddress
    });
    res.json({ success: true });
  });

  app.post('/api/audit-logs/purge-expired', (req: Request, res: Response) => {
    const roleHeader = req.header('x-audit-user-role') || '';
    let decodedRole = roleHeader;
    try { decodedRole = decodeURIComponent(roleHeader); } catch {}
    if (decodedRole !== 'superusuario') {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }
    const deleted = purgeOldAuditLogs();
    res.json({ success: true, deleted, retentionDays: AUDIT_RETENTION_DAYS });
  });
}

// -------------------------------------------------------------
// Server Bootstrap & Vite / Static Middleware Mount
// -------------------------------------------------------------
async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  // Enable gzip / deflate compression to make the system lightweight
  app.use(compression({
    threshold: 1024
  }));

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize SQLite tables & seed
  initializeSchema();

  // Setup REST API routes
  setupApiRoutes(app);

  // Serve static files from public directory directly with caching headers
  const publicPath = path.join(__dirname, 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath, {
      maxAge: '7d',
      etag: true
    }));
  }

  if (!isProd) {
    // Development mode: Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve dist folder
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SisPol Central Server] Servidor activo en http://0.0.0.0:${PORT}`);
    console.log(`[SisPol Database] Base de datos SQLite activa en: ${DB_PATH}`);
  });
}

startServer().catch((err) => {
  console.error('[SisPol Server Error]:', err);
  process.exit(1);
});
