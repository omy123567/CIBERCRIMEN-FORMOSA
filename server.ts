import express, { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
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

    CREATE TABLE IF NOT EXISTS sessions (
      tokenHash TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      username TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      lastActivityAt INTEGER NOT NULL,
      ipAddress TEXT,
      userAgent TEXT
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      lockedUntil INTEGER,
      updatedAt INTEGER NOT NULL
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
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expiresAt);
    CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId);
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
        hashPassword(u.password || 'admin123'),
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

  // Ensure admin user exists with hashed password
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
        hashPassword('adminpassword'),
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

  // Transparently migrate any legacy plaintext passwords in SQLite to scrypt$ hashes
  try {
    const allUsers = db.prepare('SELECT id, password FROM users').all() as { id: number; password: string }[];
    const updatePw = db.prepare('UPDATE users SET password = ? WHERE id = ?');
    for (const u of allUsers) {
      if (u.password && !String(u.password).startsWith('scrypt$')) {
        updatePw.run(hashPassword(String(u.password)), u.id);
      }
    }
  } catch (err) {
    console.warn('[Password Migration Warning]:', err);
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
// Cryptographic, Session & Security Helpers
// -------------------------------------------------------------
const SESSION_COOKIE_NAME = 'sispol_sid';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h absolute max
const SESSION_IDLE_MS = 45 * 60 * 1000; // 45m server idle expiry (UI logs out at 30m)
const MAX_LOGIN_FAILURES = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000; // 15 minutes

let cachedSessionSecret: string | null = null;
function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    return process.env.SESSION_SECRET;
  }
  if (cachedSessionSecret) return cachedSessionSecret;
  try {
    const row = db.prepare("SELECT valueJson FROM app_settings WHERE key = 'session_secret'").get() as { valueJson: string } | undefined;
    if (row?.valueJson) {
      const parsed = JSON.parse(row.valueJson);
      if (typeof parsed === 'string' && parsed.length >= 32) {
        cachedSessionSecret = parsed;
        return parsed;
      }
    }
  } catch {}
  const generated = crypto.randomBytes(32).toString('hex');
  try {
    db.prepare("INSERT INTO app_settings (key, valueJson) VALUES ('session_secret', ?) ON CONFLICT(key) DO UPDATE SET valueJson = excluded.valueJson")
      .run(JSON.stringify(generated));
  } catch {}
  cachedSessionSecret = generated;
  return generated;
}

function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(plain: string, stored: string): boolean {
  if (!plain || !stored) return false;
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const [, salt, hexHash] = parts;
    try {
      const expected = Buffer.from(hexHash, 'hex');
      const actual = crypto.scryptSync(plain, salt, 64);
      if (expected.length !== actual.length) return false;
      return crypto.timingSafeEqual(expected, actual);
    } catch {
      return false;
    }
  }
  const a = Buffer.from(plain, 'utf8');
  const b = Buffer.from(stored, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'La contraseña debe incluir al menos una letra y un número.';
  }
  return null;
}

interface AuthUser {
  id: number;
  username: string;
  email: string;
  nombreApellido: string;
  rol: string;
  delegacionId: number;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  readOnly: boolean;
  canExport: boolean;
  canResetCounters: boolean;
  allowedModules: string[];
  allowedDelegacionIds: number[];
  canAdminModules: boolean;
  allDelegacionesAccess: boolean;
}

interface AuthedRequest extends Request {
  authUser?: AuthUser;
  sessionTokenHash?: string;
}

function parseJsonSafe<T>(val: any, fallback: T): T {
  if (typeof val !== 'string') return Array.isArray(val) ? (val as unknown as T) : fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

function sanitizeUserRow(u: any): AuthUser {
  const isSuper = u.rol === 'superusuario';
  const isReadOnly = isSuper ? false : Boolean(u.readOnly);
  const allowedModules = parseJsonSafe<string[]>(u.allowedModules, []);
  const allowedDelegacionIds = parseJsonSafe<number[]>(u.allowedDelegacionIds, [u.delegacionId || 1]);

  let roleAllDelegaciones = isSuper;
  if (!isSuper) {
    try {
      const roleRow = db.prepare('SELECT allDelegacionesAccess FROM custom_roles WHERE nombre = ?').get(u.rol) as { allDelegacionesAccess?: number } | undefined;
      if (roleRow?.allDelegacionesAccess) roleAllDelegaciones = true;
    } catch {}
  }

  return {
    id: u.id,
    username: u.username,
    email: u.email,
    nombreApellido: u.nombreApellido,
    rol: u.rol,
    delegacionId: u.delegacionId || 1,
    canCreate: isSuper ? true : (isReadOnly ? false : (u.canCreate !== undefined ? Boolean(u.canCreate) : true)),
    canEdit: isSuper ? true : (isReadOnly ? false : (u.canEdit !== undefined ? Boolean(u.canEdit) : true)),
    canDelete: isSuper ? true : (isReadOnly ? false : Boolean(u.canDelete)),
    readOnly: isReadOnly,
    canExport: isSuper ? true : (u.canExport !== undefined ? Boolean(u.canExport) : true),
    canResetCounters: isSuper ? true : (isReadOnly ? false : Boolean(u.canResetCounters)),
    allowedModules: isSuper ? allowedModules : allowedModules.filter((m) => m !== 'auditoria'),
    allowedDelegacionIds,
    canAdminModules: isSuper ? true : (isReadOnly ? false : Boolean(u.canAdminModules)),
    allDelegacionesAccess: roleAllDelegaciones
  };
}

function signSessionToken(rawToken: string): string {
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(rawToken).digest('hex');
  return `${rawToken}.${sig}`;
}

function verifySignedToken(signedToken: string): string | null {
  if (!signedToken || !signedToken.includes('.')) return null;
  const idx = signedToken.lastIndexOf('.');
  const rawToken = signedToken.slice(0, idx);
  const sig = signedToken.slice(idx + 1);
  if (!rawToken || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(rawToken).digest('hex');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return rawToken;
}

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'local';
}

function isHttpsRequest(req: Request): boolean {
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  return req.secure || proto === 'https';
}

function setSessionCookie(req: Request, res: Response, signedToken: string) {
  const secure = isHttpsRequest(req);
  res.cookie(SESSION_COOKIE_NAME, signedToken, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS
  });
}

function clearSessionCookie(req: Request, res: Response) {
  const secure = isHttpsRequest(req);
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/'
  });
}

function createSessionForUser(user: AuthUser, req: Request): string {
  // Prune expired sessions opportunistically
  try {
    db.prepare('DELETE FROM sessions WHERE expiresAt < ? OR lastActivityAt < ?')
      .run(new Date().toISOString(), Date.now() - SESSION_IDLE_MS);
  } catch {}

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tHash = hashToken(rawToken);
  const now = Date.now();
  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(now + SESSION_TTL_MS).toISOString();

  db.prepare(`
    INSERT INTO sessions (tokenHash, userId, username, createdAt, expiresAt, lastActivityAt, ipAddress, userAgent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tHash,
    user.id,
    user.username,
    createdAt,
    expiresAt,
    now,
    getClientIp(req),
    String(req.headers['user-agent'] || '').slice(0, 250)
  );

  return signSessionToken(rawToken);
}

function revokeUserSessions(userId: number, exceptTokenHash?: string) {
  try {
    if (exceptTokenHash) {
      db.prepare('DELETE FROM sessions WHERE userId = ? AND tokenHash != ?').run(userId, exceptTokenHash);
    } else {
      db.prepare('DELETE FROM sessions WHERE userId = ?').run(userId);
    }
  } catch {}
}

function resolveAuthenticatedUser(req: AuthedRequest): AuthUser | null {
  if (req.authUser) return req.authUser;
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  const headerToken = req.header('x-sispol-session');
  const candidate = cookieToken || headerToken;
  if (!candidate || typeof candidate !== 'string') return null;

  const rawToken = verifySignedToken(candidate);
  if (!rawToken) return null;

  const tHash = hashToken(rawToken);
  const now = Date.now();
  const session = db.prepare('SELECT * FROM sessions WHERE tokenHash = ?').get(tHash) as any;
  if (!session) return null;

  if (Date.parse(session.expiresAt) <= now || now - Number(session.lastActivityAt) > SESSION_IDLE_MS) {
    db.prepare('DELETE FROM sessions WHERE tokenHash = ?').run(tHash);
    return null;
  }

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId) as any;
  if (!userRow) {
    db.prepare('DELETE FROM sessions WHERE tokenHash = ?').run(tHash);
    return null;
  }

  if (now - Number(session.lastActivityAt) > 30_000) {
    try {
      db.prepare('UPDATE sessions SET lastActivityAt = ? WHERE tokenHash = ?').run(now, tHash);
    } catch {}
  }

  const authUser = sanitizeUserRow(userRow);
  req.authUser = authUser;
  req.sessionTokenHash = tHash;
  return authUser;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = resolveAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Sesión inválida o expirada. Inicie sesión nuevamente.' });
  }
  next();
}

function requireSuperuser(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = resolveAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Sesión inválida o expirada. Inicie sesión nuevamente.' });
  }
  if (user.rol !== 'superusuario') {
    return res.status(403).json({ error: 'Acceso denegado. Operación exclusiva para Superusuario.' });
  }
  next();
}

function canAccessDelegacion(user: AuthUser, delegacionId: number | null | undefined): boolean {
  if (user.rol === 'superusuario' || user.allDelegacionesAccess) return true;
  if (!delegacionId) return true;
  return user.allowedDelegacionIds.includes(Number(delegacionId));
}

function canManageUsers(user: AuthUser): boolean {
  return user.rol === 'superusuario' || user.rol === 'Administrador' || user.allowedModules.includes('usuarios');
}

function parsePositiveId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
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

function getAuditActorFromReq(req: AuthedRequest) {
  const authUser = resolveAuthenticatedUser(req);
  const ip = getClientIp(req);
  if (authUser) {
    return {
      usuario: authUser.username,
      usuarioNombre: authUser.nombreApellido,
      usuarioRol: authUser.rol,
      delegacionId: authUser.delegacionId || 1,
      ipAddress: ip
    };
  }
  return {
    usuario: 'anonimo',
    usuarioNombre: undefined,
    usuarioRol: undefined,
    delegacionId: 1,
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
      '/auth/logout',
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

  // Rate Limiters
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 25,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de inicio de sesión desde esta terminal. Aguarde unos minutos.' }
  });

  const passwordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de cambio de clave. Aguarde unos minutos.' }
  });

  // Helper for delegation-scoped SQL filtering
  const buildDelegacionFilter = (user: AuthUser, requestedDelId: number | null) => {
    if (user.rol === 'superusuario' || user.allDelegacionesAccess) {
      return requestedDelId ? { clause: 'WHERE delegacionId = ?', params: [requestedDelId] } : { clause: '', params: [] as any[] };
    }
    if (requestedDelId) {
      if (!canAccessDelegacion(user, requestedDelId)) {
        return null;
      }
      return { clause: 'WHERE delegacionId = ?', params: [requestedDelId] };
    }
    const ids = user.allowedDelegacionIds.length > 0 ? user.allowedDelegacionIds : [user.delegacionId || 1];
    return {
      clause: `WHERE delegacionId IN (${ids.map(() => '?').join(',')})`,
      params: ids
    };
  };

  const checkUpsertAccess = (user: AuthUser, table: string, id: any, targetDelId: number): string | null => {
    if (user.readOnly || !user.canCreate) {
      return 'Su perfil no posee permisos para cargar o crear registros.';
    }
    if (!canAccessDelegacion(user, targetDelId)) {
      return 'No posee autorización para operar sobre la delegación seleccionada.';
    }
    if (id !== undefined && id !== null && id !== '') {
      const parsedId = Number(id);
      if (Number.isInteger(parsedId) && parsedId > 0) {
        const existing = db.prepare(`SELECT delegacionId FROM ${table} WHERE id = ?`).get(parsedId) as { delegacionId?: number } | undefined;
        if (existing && !canAccessDelegacion(user, existing.delegacionId)) {
          return 'No posee autorización para modificar un registro perteneciente a otra delegación.';
        }
      }
    }
    return null;
  };

  const checkUpdateAccess = (user: AuthUser, table: string, id: number, targetDelId?: number): string | null => {
    if (user.readOnly || !user.canEdit) {
      return 'Su perfil no posee permisos para editar registros.';
    }
    const existing = db.prepare(`SELECT delegacionId FROM ${table} WHERE id = ?`).get(id) as { delegacionId?: number } | undefined;
    if (existing && !canAccessDelegacion(user, existing.delegacionId)) {
      return 'No posee autorización para editar registros de otra delegación.';
    }
    if (targetDelId !== undefined && !canAccessDelegacion(user, targetDelId)) {
      return 'No posee autorización para mover el registro a otra delegación.';
    }
    return null;
  };

  const checkDeleteAccess = (user: AuthUser, table: string, id: number): string | null => {
    if (user.readOnly || !user.canDelete) {
      return 'Su perfil no posee permisos para eliminar registros.';
    }
    const existing = db.prepare(`SELECT delegacionId FROM ${table} WHERE id = ?`).get(id) as { delegacionId?: number } | undefined;
    if (existing && !canAccessDelegacion(user, existing.delegacionId)) {
      return 'No posee autorización para eliminar registros de otra delegación.';
    }
    return null;
  };

  // Healthcheck (without leaking internal file system DB_PATH)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      engine: 'S.I.S.D.I.C. SQLite Central Server',
      timestamp: new Date().toISOString()
    });
  });

  // Delegaciones
  app.get('/api/delegaciones', requireAuth, (_req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM delegaciones ORDER BY id ASC').all();
    res.json(rows);
  });

  // Institutional Config
  app.get('/api/institutional-config/:delegacionId', requireAuth, (req: AuthedRequest, res: Response) => {
    const delId = parsePositiveId(req.params.delegacionId);
    if (!delId) return res.status(400).json({ error: 'ID de delegación inválido' });
    if (!canAccessDelegacion(req.authUser!, delId)) {
      return res.status(403).json({ error: 'Sin acceso a la delegación solicitada.' });
    }
    const row = db.prepare('SELECT configJson FROM institutional_configs WHERE delegacionId = ?').get(delId) as { configJson: string } | undefined;
    if (row) {
      try {
        return res.json(JSON.parse(row.configJson));
      } catch {
        return res.json(initialInstitutionalConfig);
      }
    }
    res.json({ ...initialInstitutionalConfig, delegacionId: delId });
  });

  app.post('/api/institutional-config/:delegacionId', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const delId = parsePositiveId(req.params.delegacionId);
    if (!delId) return res.status(400).json({ error: 'ID de delegación inválido' });
    if (user.readOnly || (!user.canCreate && !user.canEdit) || (user.rol !== 'superusuario' && !user.allowedModules.includes('membrete'))) {
      return res.status(403).json({ error: 'Sin permisos para modificar la configuración de membrete.' });
    }
    if (!canAccessDelegacion(user, delId)) {
      return res.status(403).json({ error: 'Sin acceso a la delegación solicitada.' });
    }
    const config = req.body;
    const stmt = db.prepare(`
      INSERT INTO institutional_configs (delegacionId, configJson)
      VALUES (?, ?)
      ON CONFLICT(delegacionId) DO UPDATE SET configJson = excluded.configJson
    `);
    stmt.run(delId, JSON.stringify(config));
    res.json({ success: true });
  });

  // Auth: Login, Session Check, Logout & Password Change
  app.post('/api/auth/login', loginLimiter, (req: Request, res: Response) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos.' });
    }
    const cleanUser = String(username).trim();
    const cleanPass = String(password).trim();
    const actorIp = getClientIp(req);
    const attemptKey = `user:${cleanUser.toLowerCase()}`;
    const now = Date.now();

    // Check temporary lockout
    const attemptRow = db.prepare('SELECT * FROM login_attempts WHERE key = ?').get(attemptKey) as
      | { key: string; count: number; lockedUntil: number | null; updatedAt: number }
      | undefined;

    if (attemptRow?.lockedUntil && attemptRow.lockedUntil > now) {
      const minsLeft = Math.max(1, Math.ceil((attemptRow.lockedUntil - now) / 60000));
      recordAuditLog({
        categoria: 'ACCESO',
        operacion: 'LOGIN_BLOQUEADO',
        modulo: 'Autenticación',
        entidad: 'users',
        descripcion: `Intento bloqueado por exceso de fallos para "${cleanUser}" (${minsLeft} min restantes)`,
        detalles: { usernameIntentado: cleanUser, minsLeft },
        usuario: cleanUser || 'desconocido',
        delegacionId: 1,
        ipAddress: actorIp
      });
      return res.status(429).json({
        error: `Cuenta temporalmente bloqueada por múltiples intentos fallidos. Reintente en ${minsLeft} minuto(s).`
      });
    }

    const userRow = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUser) as any;
    const isPasswordValid = userRow ? verifyPassword(cleanPass, String(userRow.password || '')) : false;

    if (!userRow || !isPasswordValid) {
      const prevCount = attemptRow && now - attemptRow.updatedAt < LOGIN_LOCK_MS ? attemptRow.count : 0;
      const newCount = prevCount + 1;
      const lockedUntil = newCount >= MAX_LOGIN_FAILURES ? now + LOGIN_LOCK_MS : null;

      db.prepare(`
        INSERT INTO login_attempts (key, count, lockedUntil, updatedAt)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET count = excluded.count, lockedUntil = excluded.lockedUntil, updatedAt = excluded.updatedAt
      `).run(attemptKey, newCount, lockedUntil, now);

      recordAuditLog({
        categoria: 'ACCESO',
        operacion: lockedUntil ? 'LOGIN_BLOQUEADO' : 'LOGIN_FALLIDO',
        modulo: 'Autenticación',
        entidad: 'users',
        descripcion: lockedUntil
          ? `Bloqueo temporal aplicado a "${cleanUser}" tras ${newCount} intentos fallidos`
          : `Intento de inicio de sesión fallido para usuario "${cleanUser}" (${newCount}/${MAX_LOGIN_FAILURES})`,
        detalles: { usernameIntentado: cleanUser, intentos: newCount },
        usuario: cleanUser || 'desconocido',
        delegacionId: 1,
        ipAddress: actorIp
      });

      if (lockedUntil) {
        return res.status(429).json({
          error: 'Demasiados intentos fallidos. Acceso bloqueado temporalmente durante 15 minutos.'
        });
      }
      return res.status(401).json({ error: 'Credenciales inválidas. Verifique usuario y contraseña.' });
    }

    // Clear failed attempts on success
    try {
      db.prepare('DELETE FROM login_attempts WHERE key = ?').run(attemptKey);
    } catch {}

    // Upgrade legacy plaintext hash if somehow present
    if (userRow.password && !String(userRow.password).startsWith('scrypt$')) {
      try {
        db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(cleanPass), userRow.id);
      } catch {}
    }

    const authUser = sanitizeUserRow(userRow);
    const signedSessionToken = createSessionForUser(authUser, req);
    setSessionCookie(req, res, signedSessionToken);

    recordAuditLog({
      categoria: 'ACCESO',
      operacion: 'LOGIN_EXITOSO',
      modulo: 'Autenticación',
      entidad: 'users',
      entidadId: String(authUser.id),
      descripcion: `Inicio de sesión exitoso: ${authUser.nombreApellido} (${authUser.username}) — Rol: ${authUser.rol}`,
      detalles: { delegacionId: authUser.delegacionId, rol: authUser.rol, readOnly: authUser.readOnly },
      usuario: authUser.username,
      usuarioNombre: authUser.nombreApellido,
      usuarioRol: authUser.rol,
      delegacionId: authUser.delegacionId || 1,
      ipAddress: actorIp
    });

    res.json({
      ...authUser,
      sessionToken: signedSessionToken
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
    res.json(req.authUser);
  });

  app.post('/api/auth/logout', (req: AuthedRequest, res: Response) => {
    const authUser = resolveAuthenticatedUser(req);
    if (req.sessionTokenHash) {
      try {
        db.prepare('DELETE FROM sessions WHERE tokenHash = ?').run(req.sessionTokenHash);
      } catch {}
    }
    clearSessionCookie(req, res);
    if (authUser) {
      recordAuditLog({
        categoria: 'ACCESO',
        operacion: 'LOGOUT',
        modulo: 'Autenticación',
        entidad: 'users',
        entidadId: String(authUser.id),
        descripcion: `Cierre de sesión de ${authUser.username} (${authUser.nombreApellido})`,
        usuario: authUser.username,
        usuarioNombre: authUser.nombreApellido,
        usuarioRol: authUser.rol,
        delegacionId: authUser.delegacionId || 1,
        ipAddress: getClientIp(req)
      });
    }
    res.json({ success: true });
  });

  app.post('/api/auth/change-password', passwordLimiter, requireAuth, (req: AuthedRequest, res: Response) => {
    const actor = req.authUser!;
    const { userId, oldPassword, newPassword } = req.body || {};
    const targetUserId = userId ? Number(userId) : actor.id;

    if (actor.rol !== 'superusuario' && targetUserId !== actor.id) {
      return res.status(403).json({ error: 'Solo puede modificar su propia contraseña.' });
    }

    const strengthError = validatePasswordStrength(String(newPassword || ''));
    if (strengthError) {
      return res.status(400).json({ error: strengthError });
    }

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as any;
    if (!userRow || !verifyPassword(String(oldPassword || ''), String(userRow.password || ''))) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    }

    const newHash = hashPassword(String(newPassword));
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, targetUserId);
    // Invalidate all other active sessions for security
    revokeUserSessions(targetUserId, req.sessionTokenHash);

    recordAuditLog({
      categoria: 'SEGURIDAD',
      operacion: 'CAMBIO_CLAVE',
      modulo: 'Autenticación',
      entidad: 'users',
      entidadId: String(userRow.id),
      descripcion: `Actualización de contraseña del usuario ${userRow.username} (${userRow.nombreApellido})`,
      usuario: actor.username,
      usuarioNombre: actor.nombreApellido,
      usuarioRol: actor.rol,
      delegacionId: userRow.delegacionId || actor.delegacionId || 1,
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, message: 'Contraseña actualizada exitosamente' });
  });

  app.get('/api/users', requireAuth, (req: AuthedRequest, res: Response) => {
    const actor = req.authUser!;
    if (!canManageUsers(actor)) {
      return res.status(403).json({ error: 'No posee permisos para consultar la nómina de usuarios.' });
    }
    const rows = db.prepare('SELECT * FROM users ORDER BY id ASC').all() as any[];
    const parsed = rows
      .filter((u) => actor.rol === 'superusuario' || u.rol !== 'superusuario')
      .map((u) => sanitizeUserRow(u));
    res.json(parsed);
  });

  app.post('/api/users', requireAuth, (req: AuthedRequest, res: Response) => {
    const actor = req.authUser!;
    if (actor.readOnly || !actor.canCreate || !canManageUsers(actor)) {
      return res.status(403).json({ error: 'Sin permisos para crear usuarios.' });
    }

    const u = req.body || {};
    const cleanUsername = String(u.username || '').trim();
    const cleanPassword = String(u.password || '').trim();
    const cleanEmail = String(u.email || '').trim();
    const cleanName = String(u.nombreApellido || '').trim();
    const targetRol = String(u.rol || 'Operador').trim();

    if (!cleanUsername || !cleanEmail || !cleanName || !cleanPassword) {
      return res.status(400).json({ error: 'Nombre, correo, usuario y contraseña son obligatorios.' });
    }
    const pwErr = validatePasswordStrength(cleanPassword);
    if (pwErr) {
      return res.status(400).json({ error: pwErr });
    }
    if (targetRol === 'superusuario' && actor.rol !== 'superusuario') {
      return res.status(403).json({ error: 'Solo el Superusuario puede crear cuentas de Superusuario.' });
    }

    const isSuper = targetRol === 'superusuario';
    const isReadOnly = isSuper ? false : Boolean(u.readOnly);
    const targetDelId = Number(u.delegacionId) || actor.delegacionId || 1;
    if (!canAccessDelegacion(actor, targetDelId)) {
      return res.status(403).json({ error: 'No puede crear usuarios en una delegación no asignada.' });
    }

    const rawMods = Array.isArray(u.allowedModules) ? u.allowedModules : [];
    const safeMods = isSuper ? rawMods : rawMods.filter((m: string) => m !== 'auditoria' && (actor.rol === 'superusuario' || m !== 'modulos'));
    const rawDelIds = Array.isArray(u.allowedDelegacionIds) ? u.allowedDelegacionIds.map(Number) : [targetDelId];
    const safeDelIds = actor.rol === 'superusuario' ? rawDelIds : rawDelIds.filter((d: number) => canAccessDelegacion(actor, d));
    if (!safeDelIds.includes(targetDelId)) safeDelIds.push(targetDelId);

    try {
      const stmt = db.prepare(`
        INSERT INTO users (username, email, password, nombreApellido, rol, delegacionId, canCreate, canEdit, canDelete, readOnly, canExport, canResetCounters, allowedModules, allowedDelegacionIds, canAdminModules)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        cleanUsername,
        cleanEmail,
        hashPassword(cleanPassword),
        cleanName,
        targetRol,
        targetDelId,
        isSuper ? 1 : (isReadOnly ? 0 : (u.canCreate !== false ? 1 : 0)),
        isSuper ? 1 : (isReadOnly ? 0 : (u.canEdit !== false ? 1 : 0)),
        isSuper ? 1 : (isReadOnly ? 0 : (u.canDelete ? 1 : 0)),
        isReadOnly ? 1 : 0,
        isSuper ? 1 : (u.canExport !== false ? 1 : 0),
        isSuper ? 1 : (isReadOnly ? 0 : (u.canResetCounters ? 1 : 0)),
        JSON.stringify(safeMods),
        JSON.stringify(safeDelIds),
        isSuper ? 1 : (isReadOnly ? 0 : (actor.rol === 'superusuario' && u.canAdminModules ? 1 : 0))
      );
      res.json({ id: info.lastInsertRowid, success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/users/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const actor = req.authUser!;
    const id = parsePositiveId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de usuario inválido' });
    if (actor.readOnly || !actor.canEdit || !canManageUsers(actor)) {
      return res.status(403).json({ error: 'Sin permisos para modificar usuarios.' });
    }

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Usuario no encontrado' });

    const u = req.body || {};
    const targetRol = String(u.rol || existing.rol).trim();
    if ((existing.rol === 'superusuario' || targetRol === 'superusuario') && actor.rol !== 'superusuario') {
      return res.status(403).json({ error: 'Solo el Superusuario puede administrar cuentas de Superusuario.' });
    }
    if (!canAccessDelegacion(actor, existing.delegacionId)) {
      return res.status(403).json({ error: 'No posee autorización sobre usuarios de otra delegación.' });
    }

    const newPlainPass = u.password ? String(u.password).trim() : '';
    let finalPasswordHash = existing.password;
    if (newPlainPass) {
      const pwErr = validatePasswordStrength(newPlainPass);
      if (pwErr) return res.status(400).json({ error: pwErr });
      finalPasswordHash = hashPassword(newPlainPass);
    }

    const isSuper = targetRol === 'superusuario';
    const isReadOnly = isSuper ? false : Boolean(u.readOnly);
    const targetDelId = Number(u.delegacionId) || existing.delegacionId || 1;
    if (!canAccessDelegacion(actor, targetDelId)) {
      return res.status(403).json({ error: 'No puede reasignar a una delegación no autorizada.' });
    }

    const rawMods = Array.isArray(u.allowedModules) ? u.allowedModules : parseJsonSafe<string[]>(existing.allowedModules, []);
    const safeMods = isSuper ? rawMods : rawMods.filter((m: string) => m !== 'auditoria' && (actor.rol === 'superusuario' || m !== 'modulos'));
    const rawDelIds = Array.isArray(u.allowedDelegacionIds) ? u.allowedDelegacionIds.map(Number) : [targetDelId];
    const safeDelIds = actor.rol === 'superusuario' ? rawDelIds : rawDelIds.filter((d: number) => canAccessDelegacion(actor, d));
    if (!safeDelIds.includes(targetDelId)) safeDelIds.push(targetDelId);

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
        String(u.username || existing.username).trim(),
        String(u.email || existing.email).trim(),
        finalPasswordHash,
        String(u.nombreApellido || existing.nombreApellido).trim(),
        targetRol,
        targetDelId,
        isSuper ? 1 : (isReadOnly ? 0 : (u.canCreate !== false ? 1 : 0)),
        isSuper ? 1 : (isReadOnly ? 0 : (u.canEdit !== false ? 1 : 0)),
        isSuper ? 1 : (isReadOnly ? 0 : (u.canDelete ? 1 : 0)),
        isReadOnly ? 1 : 0,
        isSuper ? 1 : (u.canExport !== false ? 1 : 0),
        isSuper ? 1 : (isReadOnly ? 0 : (u.canResetCounters ? 1 : 0)),
        JSON.stringify(safeMods),
        JSON.stringify(safeDelIds),
        isSuper ? 1 : (isReadOnly ? 0 : (actor.rol === 'superusuario' ? (u.canAdminModules ? 1 : 0) : (existing.canAdminModules ? 1 : 0))),
        id
      );

      // Revoke existing sessions if credentials or permissions were changed for another user
      if (id !== actor.id || newPlainPass) {
        revokeUserSessions(id, id === actor.id ? req.sessionTokenHash : undefined);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/users/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const actor = req.authUser!;
    const id = parsePositiveId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de usuario inválido' });
    if (actor.readOnly || !actor.canDelete || !canManageUsers(actor)) {
      return res.status(403).json({ error: 'Sin permisos para eliminar usuarios.' });
    }
    if (id === actor.id) {
      return res.status(400).json({ error: 'No puede eliminar su propio usuario con sesión activa.' });
    }
    const existing = db.prepare('SELECT rol, delegacionId FROM users WHERE id = ?').get(id) as { rol: string; delegacionId: number } | undefined;
    if (!existing) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (existing.rol === 'superusuario') {
      return res.status(403).json({ error: 'No es posible eliminar cuentas de Superusuario.' });
    }
    if (!canAccessDelegacion(actor, existing.delegacionId)) {
      return res.status(403).json({ error: 'Sin autorización para eliminar usuarios de otra delegación.' });
    }
    revokeUserSessions(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Roles y Perfiles de Permisos
  app.get('/api/roles', requireAuth, (_req: Request, res: Response) => {
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

  app.post('/api/roles', requireAuth, (req: AuthedRequest, res: Response) => {
    const actor = req.authUser!;
    if (actor.readOnly || !actor.canCreate || !canManageUsers(actor)) {
      return res.status(403).json({ error: 'Sin permisos para crear roles.' });
    }
    const r = req.body || {};
    const roleName = String(r.nombre || '').trim();
    if (!roleName) return res.status(400).json({ error: 'El nombre del rol es obligatorio.' });
    if (roleName === 'superusuario' && actor.rol !== 'superusuario') {
      return res.status(403).json({ error: 'Rol reservado exclusivamente al Superusuario.' });
    }
    const isReadOnly = Boolean(r.readOnly);
    const rawMods = Array.isArray(r.allowedModules) ? r.allowedModules : [];
    const safeMods = roleName === 'superusuario' ? rawMods : rawMods.filter((m: string) => m !== 'auditoria');
    try {
      const stmt = db.prepare(`
        INSERT INTO custom_roles (nombre, descripcion, canCreate, canEdit, canDelete, readOnly, canExport, canResetCounters, allowedModules, allDelegacionesAccess, canAdminModules, isSystem, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      const info = stmt.run(
        roleName,
        String(r.descripcion || ''),
        isReadOnly ? 0 : (r.canCreate !== false ? 1 : 0),
        isReadOnly ? 0 : (r.canEdit !== false ? 1 : 0),
        isReadOnly ? 0 : (r.canDelete ? 1 : 0),
        isReadOnly ? 1 : 0,
        r.canExport !== false ? 1 : 0,
        isReadOnly ? 0 : (r.canResetCounters ? 1 : 0),
        JSON.stringify(safeMods),
        actor.rol === 'superusuario' && r.allDelegacionesAccess ? 1 : 0,
        isReadOnly ? 0 : (actor.rol === 'superusuario' && r.canAdminModules ? 1 : 0),
        0
      );
      res.json({ id: info.lastInsertRowid, success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/roles/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const actor = req.authUser!;
    const id = parsePositiveId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de rol inválido' });
    if (actor.readOnly || !actor.canEdit || !canManageUsers(actor)) {
      return res.status(403).json({ error: 'Sin permisos para editar roles.' });
    }
    const existing = db.prepare('SELECT * FROM custom_roles WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Rol no encontrado' });

    const r = req.body || {};
    const targetName = String(r.nombre || existing.nombre).trim();
    if ((existing.nombre === 'superusuario' || targetName === 'superusuario') && actor.rol !== 'superusuario') {
      return res.status(403).json({ error: 'Solo el Superusuario puede modificar el rol Superusuario.' });
    }
    const isSuper = targetName === 'superusuario';
    const isReadOnly = isSuper ? false : Boolean(r.readOnly);
    const rawMods = Array.isArray(r.allowedModules) ? r.allowedModules : [];
    const safeMods = isSuper ? rawMods : rawMods.filter((m: string) => m !== 'auditoria');

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
        targetName,
        String(r.descripcion || ''),
        isSuper ? 1 : (isReadOnly ? 0 : (r.canCreate !== false ? 1 : 0)),
        isSuper ? 1 : (isReadOnly ? 0 : (r.canEdit !== false ? 1 : 0)),
        isSuper ? 1 : (isReadOnly ? 0 : (r.canDelete ? 1 : 0)),
        isReadOnly ? 1 : 0,
        isSuper ? 1 : (r.canExport !== false ? 1 : 0),
        isSuper ? 1 : (isReadOnly ? 0 : (r.canResetCounters ? 1 : 0)),
        JSON.stringify(safeMods),
        isSuper ? 1 : (actor.rol === 'superusuario' ? (r.allDelegacionesAccess ? 1 : 0) : (existing.allDelegacionesAccess ? 1 : 0)),
        isSuper ? 1 : (isReadOnly ? 0 : (actor.rol === 'superusuario' ? (r.canAdminModules ? 1 : 0) : (existing.canAdminModules ? 1 : 0))),
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/roles/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const actor = req.authUser!;
    const id = parsePositiveId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de rol inválido' });
    if (actor.readOnly || !actor.canDelete || !canManageUsers(actor)) {
      return res.status(403).json({ error: 'Sin permisos para eliminar roles.' });
    }
    const existing = db.prepare('SELECT isSystem FROM custom_roles WHERE id = ?').get(id) as { isSystem?: number } | undefined;
    if (existing?.isSystem) {
      return res.status(400).json({ error: 'No es posible eliminar roles base del sistema' });
    }
    db.prepare('DELETE FROM custom_roles WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Expedientes
  app.get('/api/expedientes', requireAuth, (req: AuthedRequest, res: Response) => {
    const requestedDel = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    const filter = buildDelegacionFilter(req.authUser!, requestedDel);
    if (!filter) return res.status(403).json({ error: 'Sin acceso a la delegación solicitada.' });
    const rows = db.prepare(`SELECT * FROM expedientes ${filter.clause} ORDER BY id DESC`).all(...filter.params);
    res.json(rows);
  });

  app.post('/api/expedientes', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const e = req.body || {};
      const targetDelId = Number(e.delegacionId) || req.authUser!.delegacionId || 1;
      const errMsg = checkUpsertAccess(req.authUser!, 'expedientes', e.id, targetDelId);
      if (errMsg) return res.status(403).json({ error: errMsg });

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
        targetDelId
      );
      res.json({ id: e.id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/expedientes error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/expedientes/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const e = req.body || {};
      const targetDelId = Number(e.delegacionId) || req.authUser!.delegacionId || 1;
      const errMsg = checkUpdateAccess(req.authUser!, 'expedientes', id, targetDelId);
      if (errMsg) return res.status(403).json({ error: errMsg });

      const customFieldsJson = typeof e.customFieldsJson === 'object' ? JSON.stringify(e.customFieldsJson) : (e.customFieldsJson || '{}');
      const stmt = db.prepare(`
        UPDATE expedientes SET
          anio = ?, nroExpediente = ?, fechaIngreso = ?, fechaVencimiento = ?,
          tipoRequerimiento = ?, juzgado = ?, caratula = ?, estado = ?,
          customFieldsJson = ?, delegacionId = ?
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
        targetDelId,
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('[PUT /api/expedientes error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/expedientes/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const errMsg = checkDeleteAccess(req.authUser!, 'expedientes', id);
      if (errMsg) return res.status(403).json({ error: errMsg });

      db.prepare('DELETE FROM expedientes WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE /api/expedientes error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Personal
  app.get('/api/personal', requireAuth, (req: AuthedRequest, res: Response) => {
    const requestedDel = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    const filter = buildDelegacionFilter(req.authUser!, requestedDel);
    if (!filter) return res.status(403).json({ error: 'Sin acceso a la delegación solicitada.' });
    const rows = db.prepare(`SELECT * FROM personal ${filter.clause} ORDER BY id ASC`).all(...filter.params);
    res.json(rows.map((p: any) => ({ ...p, disponible: Boolean(p.disponible) })));
  });

  app.post('/api/personal', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const p = req.body || {};
      const targetDelId = Number(p.delegacionId) || req.authUser!.delegacionId || 1;
      const errMsg = checkUpsertAccess(req.authUser!, 'personal', p.id, targetDelId);
      if (errMsg) return res.status(403).json({ error: errMsg });

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
        targetDelId
      );
      res.json({ id: p.id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/personal error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/personal/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const p = req.body || {};
      const targetDelId = Number(p.delegacionId) || req.authUser!.delegacionId || 1;
      const errMsg = checkUpdateAccess(req.authUser!, 'personal', id, targetDelId);
      if (errMsg) return res.status(403).json({ error: errMsg });

      const customFieldsJson = typeof p.customFieldsJson === 'object' ? JSON.stringify(p.customFieldsJson) : (p.customFieldsJson || null);
      const stmt = db.prepare(`
        UPDATE personal SET
          jerarquia = ?, plaza = ?, apellidoNombre = ?, dni = ?,
          fechaNacimiento = ?, fechaIngreso = ?, grupo = ?, contactoEmergencia = ?,
          disponible = ?, motivoNoDisponible = ?, customFieldsJson = ?, delegacionId = ?
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
        targetDelId,
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('[PUT /api/personal error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/personal/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const errMsg = checkDeleteAccess(req.authUser!, 'personal', id);
      if (errMsg) return res.status(403).json({ error: errMsg });

      db.prepare('DELETE FROM personal WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE /api/personal error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Moviles & Reparaciones
  app.get('/api/moviles', requireAuth, (req: AuthedRequest, res: Response) => {
    const requestedDel = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    const filter = buildDelegacionFilter(req.authUser!, requestedDel);
    if (!filter) return res.status(403).json({ error: 'Sin acceso a la delegación solicitada.' });
    const rows = db.prepare(`SELECT * FROM moviles ${filter.clause} ORDER BY id ASC`).all(...filter.params);
    res.json(rows);
  });

  app.post('/api/moviles', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const m = req.body || {};
      const targetDelId = Number(m.delegacionId) || req.authUser!.delegacionId || 1;
      const errMsg = checkUpsertAccess(req.authUser!, 'moviles', m.id, targetDelId);
      if (errMsg) return res.status(403).json({ error: errMsg });

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
        targetDelId
      );
      res.json({ id: m.id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/moviles error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/moviles/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const m = req.body || {};
      const targetDelId = Number(m.delegacionId) || req.authUser!.delegacionId || 1;
      const errMsg = checkUpdateAccess(req.authUser!, 'moviles', id, targetDelId);
      if (errMsg) return res.status(403).json({ error: errMsg });

      const stmt = db.prepare(`
        UPDATE moviles SET
          identificador = ?, marca = ?, modelo = ?, tipo = ?, dominio = ?,
          chasis = ?, motor = ?, condicion = ?, kmActual = ?, kmUltimoService = ?,
          kmProximoService = ?, vencimientoRto = ?, vencimientoSeguro = ?,
          companiaSeguro = ?, numeroPoliza = ?, observaciones = ?, delegacionId = ?
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
        targetDelId,
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('[PUT /api/moviles error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/moviles/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const errMsg = checkDeleteAccess(req.authUser!, 'moviles', id);
      if (errMsg) return res.status(403).json({ error: errMsg });

      db.prepare('DELETE FROM reparaciones WHERE movilId = ?').run(id);
      db.prepare('DELETE FROM moviles WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE /api/moviles error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/reparaciones', requireAuth, (req: AuthedRequest, res: Response) => {
    const requestedDel = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    const filter = buildDelegacionFilter(req.authUser!, requestedDel);
    if (!filter) return res.status(403).json({ error: 'Sin acceso a la delegación solicitada.' });
    const rows = db.prepare(`SELECT * FROM reparaciones ${filter.clause} ORDER BY id DESC`).all(...filter.params);
    res.json(rows);
  });

  app.post('/api/reparaciones', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const r = req.body || {};
      const targetDelId = Number(r.delegacionId) || req.authUser!.delegacionId || 1;
      const errMsg = checkUpsertAccess(req.authUser!, 'reparaciones', r.id, targetDelId);
      if (errMsg) return res.status(403).json({ error: errMsg });

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
        targetDelId
      );
      res.json({ id: r.id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/reparaciones error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/reparaciones/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const r = req.body || {};
      const targetDelId = Number(r.delegacionId) || req.authUser!.delegacionId || 1;
      const errMsg = checkUpdateAccess(req.authUser!, 'reparaciones', id, targetDelId);
      if (errMsg) return res.status(403).json({ error: errMsg });

      const stmt = db.prepare(`
        UPDATE reparaciones SET
          movilId = ?, fecha = ?, tallerMecanico = ?, descripcion = ?,
          repuestosCambiados = ?, costoTotal = ?, kmMomento = ?, observaciones = ?, delegacionId = ?
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
        targetDelId,
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('[PUT /api/reparaciones error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/reparaciones/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const errMsg = checkDeleteAccess(req.authUser!, 'reparaciones', id);
      if (errMsg) return res.status(403).json({ error: errMsg });

      db.prepare('DELETE FROM reparaciones WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE /api/reparaciones error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Recargos de Servicio
  app.get('/api/recargos', requireAuth, (req: AuthedRequest, res: Response) => {
    const requestedDel = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    const filter = buildDelegacionFilter(req.authUser!, requestedDel);
    if (!filter) return res.status(403).json({ error: 'Sin acceso a la delegación solicitada.' });
    const rows = db.prepare(`SELECT * FROM recargos ${filter.clause} ORDER BY id DESC`).all(...filter.params);
    res.json(rows);
  });

  app.post('/api/recargos', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const rc = req.body || {};
      const targetDelId = Number(rc.delegacionId) || req.authUser!.delegacionId || 1;
      const errMsg = checkUpsertAccess(req.authUser!, 'recargos', rc.id, targetDelId);
      if (errMsg) return res.status(403).json({ error: errMsg });

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
        targetDelId
      );
      res.json({ id: rc.id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/recargos error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/recargos/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const rc = req.body || {};
      const targetDelId = Number(rc.delegacionId) || req.authUser!.delegacionId || 1;
      const errMsg = checkUpdateAccess(req.authUser!, 'recargos', id, targetDelId);
      if (errMsg) return res.status(403).json({ error: errMsg });

      const stmt = db.prepare(`
        UPDATE recargos SET
          personalId = ?, personalNombre = ?, personalJerarquia = ?, fecha = ?,
          horarioDesde = ?, horarioHasta = ?, totalHoras = ?, tipoRecargo = ?,
          lugarDestino = ?, observaciones = ?, delegacionId = ?
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
        targetDelId,
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('[PUT /api/recargos error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/recargos/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const errMsg = checkDeleteAccess(req.authUser!, 'recargos', id);
      if (errMsg) return res.status(403).json({ error: errMsg });

      db.prepare('DELETE FROM recargos WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE /api/recargos error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Charlas y Prevención
  app.get('/api/charlas', requireAuth, (req: AuthedRequest, res: Response) => {
    const requestedDel = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    const filter = buildDelegacionFilter(req.authUser!, requestedDel);
    if (!filter) return res.status(403).json({ error: 'Sin acceso a la delegación solicitada.' });
    const rows = db.prepare(`SELECT * FROM charlas ${filter.clause} ORDER BY id DESC`).all(...filter.params);
    res.json(rows);
  });

  app.post('/api/charlas', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const ch = req.body || {};
      const targetDelId = Number(ch.delegacionId) || req.authUser!.delegacionId || 1;
      const errMsg = checkUpsertAccess(req.authUser!, 'charlas', ch.id, targetDelId);
      if (errMsg) return res.status(403).json({ error: errMsg });

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
        targetDelId
      );
      res.json({ id: ch.id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/charlas error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/charlas/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const ch = req.body || {};
      const targetDelId = Number(ch.delegacionId) || req.authUser!.delegacionId || 1;
      const errMsg = checkUpdateAccess(req.authUser!, 'charlas', id, targetDelId);
      if (errMsg) return res.status(403).json({ error: errMsg });

      const stmt = db.prepare(`
        UPDATE charlas SET
          fecha = ?, hora = ?, lugarInstitucion = ?, localidad = ?,
          temaTratado = ?, personalDesignado = ?, observaciones = ?, delegacionId = ?
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
        targetDelId,
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('[PUT /api/charlas error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/charlas/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const errMsg = checkDeleteAccess(req.authUser!, 'charlas', id);
      if (errMsg) return res.status(403).json({ error: errMsg });

      db.prepare('DELETE FROM charlas WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE /api/charlas error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Licencias y Cuatrimestres
  app.get('/api/licencias', requireAuth, (req: AuthedRequest, res: Response) => {
    const requestedDel = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    const filter = buildDelegacionFilter(req.authUser!, requestedDel);
    if (!filter) return res.status(403).json({ error: 'Sin acceso a la delegación solicitada.' });
    const rows = db.prepare(`SELECT * FROM licencias ${filter.clause} ORDER BY id DESC`).all(...filter.params);
    res.json(rows.map((l: any) => ({
      ...l,
      sumaDiasViaje: Boolean(l.sumaDiasViaje),
      fueInterrumpida: Boolean(l.fueInterrumpida)
    })));
  });

  app.post('/api/licencias', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const l = req.body || {};
      const targetDelId = Number(l.delegacionId) || req.authUser!.delegacionId || 1;
      const errMsg = checkUpsertAccess(req.authUser!, 'licencias', l.id, targetDelId);
      if (errMsg) return res.status(403).json({ error: errMsg });

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
        targetDelId
      );
      res.json({ id: l.id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/licencias error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/licencias/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const l = req.body || {};
      const targetDelId = Number(l.delegacionId) || req.authUser!.delegacionId || 1;
      const errMsg = checkUpdateAccess(req.authUser!, 'licencias', id, targetDelId);
      if (errMsg) return res.status(403).json({ error: errMsg });

      const periodosDetalleJson = typeof l.periodosDetalleJson === 'object' ? JSON.stringify(l.periodosDetalleJson) : (l.periodosDetalleJson || null);
      const stmt = db.prepare(`
        UPDATE licencias SET
          personalId = ?, jerarquia = ?, plaza = ?, apellidoNombre = ?, dni = ?,
          fechaIngreso = ?, tipoLicencia = ?, anioPeriodo = ?, diasHabilesTomados = ?,
          sumaDiasViaje = ?, disposicionViaje = ?, diasPermitidosViaje = ?,
          fueInterrumpida = ?, fechaInterrupcion = ?, motivoInterrupcion = ?,
          diasRestantesDevueltos = ?, observaciones = ?, periodosDetalleJson = ?,
          fechaSalida = ?, delegacionId = ?
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
        targetDelId,
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('[PUT /api/licencias error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/licencias/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const errMsg = checkDeleteAccess(req.authUser!, 'licencias', id);
      if (errMsg) return res.status(403).json({ error: errMsg });

      db.prepare('DELETE FROM licencias WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE /api/licencias error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Numerario & Folios
  app.get('/api/numerario/series', requireAuth, (req: AuthedRequest, res: Response) => {
    const requestedDel = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    const filter = buildDelegacionFilter(req.authUser!, requestedDel);
    if (!filter) return res.status(403).json({ error: 'Sin acceso a la delegación solicitada.' });
    const rows = db.prepare(`SELECT * FROM series_numerario ${filter.clause} ORDER BY id ASC`).all(...filter.params);
    res.json(rows);
  });

  app.post('/api/numerario/series', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const s = req.body || {};
    const targetDelId = Number(s.delegacionId) || user.delegacionId || 1;
    if (user.readOnly || !user.canCreate || !canAccessDelegacion(user, targetDelId)) {
      return res.status(403).json({ error: 'Sin permisos para crear series de numerario.' });
    }
    const stmt = db.prepare(`
      INSERT INTO series_numerario (nombre, prefijo, anio, limiteFolios, columnas, color, delegacionId)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(s.nombre, s.prefijo, s.anio, s.limiteFolios || 1000, s.columnas || 20, s.color || 'blue', targetDelId);
    res.json({ id: info.lastInsertRowid, success: true });
  });

  app.put('/api/numerario/series/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const s = req.body || {};
    const targetDelId = Number(s.delegacionId) || req.authUser!.delegacionId || 1;
    const errMsg = checkUpdateAccess(req.authUser!, 'series_numerario', id, targetDelId);
    if (errMsg) return res.status(403).json({ error: errMsg });

    const stmt = db.prepare(`
      UPDATE series_numerario SET
        nombre = ?, prefijo = ?, anio = ?, limiteFolios = ?, columnas = ?, color = ?, delegacionId = ?
      WHERE id = ?
    `);
    stmt.run(s.nombre, s.prefijo, s.anio, s.limiteFolios, s.columnas, s.color, targetDelId, id);
    res.json({ success: true });
  });

  app.delete('/api/numerario/series/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const errMsg = checkDeleteAccess(req.authUser!, 'series_numerario', id);
    if (errMsg) return res.status(403).json({ error: errMsg });

    db.prepare('DELETE FROM folios_numerario WHERE serieId = ?').run(id);
    db.prepare('DELETE FROM series_numerario WHERE id = ?').run(id);
    res.json({ success: true });
  });

  app.post('/api/numerario/series/:id/reset', requireAuth, (req: AuthedRequest, res: Response) => {
    const actor = req.authUser!;
    const id = parsePositiveId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de serie inválido' });
    if (actor.readOnly || (!actor.canResetCounters && !actor.canDelete && actor.rol !== 'superusuario')) {
      return res.status(403).json({ error: 'No posee permiso para reiniciar contadores de series.' });
    }
    const serie = db.prepare('SELECT * FROM series_numerario WHERE id = ?').get(id) as any;
    if (!serie) return res.status(404).json({ error: 'Serie no encontrada' });
    if (!canAccessDelegacion(actor, serie.delegacionId)) {
      return res.status(403).json({ error: 'Sin autorización sobre la delegación de esta serie.' });
    }

    const countRow = db.prepare('SELECT count(*) as total FROM folios_numerario WHERE serieId = ?').get(id) as { total: number };
    db.prepare('DELETE FROM folios_numerario WHERE serieId = ?').run(id);

    recordAuditLog({
      categoria: 'RESETEO',
      operacion: 'REINICIAR_SERIE_NUMERARIO',
      modulo: 'Numerario & Control de Folios',
      entidad: 'series_numerario',
      entidadId: String(id),
      descripcion: `Reinicio de contador de serie "${serie?.nombre || `#${id}`}" (${serie?.prefijo || '-'} · Año ${serie?.anio || '-'}). Folios liberados: ${countRow?.total || 0}`,
      detalles: { serieId: id, serieNombre: serie?.nombre, prefijo: serie?.prefijo, anio: serie?.anio, foliosEliminados: countRow?.total || 0 },
      usuario: actor.username,
      usuarioNombre: actor.nombreApellido,
      usuarioRol: actor.rol,
      delegacionId: serie?.delegacionId || actor.delegacionId,
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, message: 'Serie reiniciada exitosamente' });
  });

  app.get('/api/numerario/folios', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const serieId = req.query.serieId ? parseInt(req.query.serieId as string, 10) : null;
    const requestedDel = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    if (serieId) {
      const serie = db.prepare('SELECT delegacionId FROM series_numerario WHERE id = ?').get(serieId) as { delegacionId?: number } | undefined;
      if (serie && !canAccessDelegacion(user, serie.delegacionId)) {
        return res.status(403).json({ error: 'Sin acceso a la serie solicitada.' });
      }
      const rows = db.prepare('SELECT * FROM folios_numerario WHERE serieId = ? ORDER BY numero ASC').all(serieId);
      return res.json(rows);
    }
    const filter = buildDelegacionFilter(user, requestedDel);
    if (!filter) return res.status(403).json({ error: 'Sin acceso a la delegación solicitada.' });
    const rows = db.prepare(`SELECT * FROM folios_numerario ${filter.clause} ORDER BY id DESC`).all(...filter.params);
    res.json(rows);
  });

  app.post('/api/numerario/folios', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const f = req.body || {};
      const targetDelId = Number(f.delegacionId) || req.authUser!.delegacionId || 1;
      const errMsg = checkUpsertAccess(req.authUser!, 'folios_numerario', f.id, targetDelId);
      if (errMsg) return res.status(403).json({ error: errMsg });

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
        f.usuarioAsigno || req.authUser!.username,
        targetDelId
      );
      res.json({ id: f.id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/numerario/folios error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/numerario/folios/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const errMsg = checkUpdateAccess(req.authUser!, 'folios_numerario', id);
    if (errMsg) return res.status(403).json({ error: errMsg });

    const f = req.body || {};
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

  app.post('/api/numerario/folios/range', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.readOnly || !user.canCreate) {
      return res.status(403).json({ error: 'Su perfil no posee permisos para asignar folios.' });
    }
    const { folios } = req.body as { folios: any[] };
    if (!Array.isArray(folios) || folios.length === 0) {
      return res.status(400).json({ error: 'Array de folios requerido' });
    }
    for (const f of folios) {
      const targetDelId = Number(f.delegacionId) || user.delegacionId || 1;
      if (!canAccessDelegacion(user, targetDelId)) {
        return res.status(403).json({ error: 'Sin autorización sobre la delegación seleccionada.' });
      }
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
          f.usuarioAsigno || user.username,
          Number(f.delegacionId) || user.delegacionId || 1
        );
      }
    });

    tx(folios);
    res.json({ success: true, count: folios.length });
  });

  app.delete('/api/numerario/folios/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const errMsg = checkDeleteAccess(req.authUser!, 'folios_numerario', id);
    if (errMsg) return res.status(403).json({ error: errMsg });

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
  app.get('/api/personas', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const rows = db.prepare('SELECT * FROM personas ORDER BY id DESC').all() as any[];
    const parsed = rows
      .filter((p) => !p.delegacionId || canAccessDelegacion(user, p.delegacionId))
      .map((p) => ({
        ...p,
        expedientesVinculados: typeof p.expedientesVinculados === 'string'
          ? (() => { try { return JSON.parse(p.expedientesVinculados); } catch { return []; } })()
          : (Array.isArray(p.expedientesVinculados) ? p.expedientesVinculados : [])
      }));
    res.json(parsed);
  });

  app.post('/api/personas', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const p = req.body || {};
      const targetDelId = Number(p.delegacionId) || req.authUser!.delegacionId || 1;
      const errMsg = checkUpsertAccess(req.authUser!, 'personas', p.id, targetDelId);
      if (errMsg) return res.status(403).json({ error: errMsg });

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

  app.put('/api/personas/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const p = req.body || {};
      const errMsg = checkUpdateAccess(req.authUser!, 'personas', id, p.delegacionId);
      if (errMsg) return res.status(403).json({ error: errMsg });

      const stmt = db.prepare(`
        UPDATE personas SET
          apellidoNombre = ?, dni = ?, observaciones = ?, expedientesVinculados = ?, delegacionId = ?
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

  app.delete('/api/personas/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const errMsg = checkDeleteAccess(req.authUser!, 'personas', id);
      if (errMsg) return res.status(403).json({ error: errMsg });

      db.prepare('DELETE FROM personas WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE /api/personas error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Catálogos Dinámicos Compartidos
  app.get('/api/dynamic-catalogs', requireAuth, (_req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM dynamic_catalogs ORDER BY category ASC, value ASC').all();
    res.json(rows);
  });

  app.post('/api/dynamic-catalogs', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const user = req.authUser!;
      if (user.readOnly || !user.canCreate) {
        return res.status(403).json({ error: 'Sin permisos para modificar catálogos.' });
      }
      const { id, category, value, delegacionId } = req.body || {};
      const stmt = db.prepare('INSERT OR REPLACE INTO dynamic_catalogs (id, category, value, delegacionId) VALUES (?, ?, ?, ?)');
      const info = stmt.run(id || null, category, value, delegacionId || null);
      res.json({ id: id || info.lastInsertRowid, success: true });
    } catch (err: any) {
      console.error('[POST /api/dynamic-catalogs error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/dynamic-catalogs/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    if (user.readOnly || !user.canDelete) {
      return res.status(403).json({ error: 'Sin permisos para eliminar opciones de catálogo.' });
    }
    const id = parsePositiveId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    db.prepare('DELETE FROM dynamic_catalogs WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Sync All / Full State Endpoint (with Delegation Isolation!)
  app.get('/api/sync/all', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.authUser!;
    const filter = buildDelegacionFilter(user, null)!;
    const delClause = filter.clause;
    const delParams = filter.params;

    const expedientes = db.prepare(`SELECT * FROM expedientes ${delClause} ORDER BY id ASC`).all(...delParams);
    const personal = db.prepare(`SELECT * FROM personal ${delClause} ORDER BY id ASC`).all(...delParams).map((p: any) => ({ ...p, disponible: Boolean(p.disponible) }));
    const moviles = db.prepare(`SELECT * FROM moviles ${delClause} ORDER BY id ASC`).all(...delParams);
    const reparaciones = db.prepare(`SELECT * FROM reparaciones ${delClause} ORDER BY id ASC`).all(...delParams);
    const recargos = db.prepare(`SELECT * FROM recargos ${delClause} ORDER BY id ASC`).all(...delParams);
    const charlas = db.prepare(`SELECT * FROM charlas ${delClause} ORDER BY id ASC`).all(...delParams);
    const licencias = db.prepare(`SELECT * FROM licencias ${delClause} ORDER BY id ASC`).all(...delParams);
    const personas = (db.prepare('SELECT * FROM personas ORDER BY id ASC').all() as any[])
      .filter((p) => !p.delegacionId || canAccessDelegacion(user, p.delegacionId))
      .map((p: any) => ({
        ...p,
        expedientesVinculados: typeof p.expedientesVinculados === 'string'
          ? (() => { try { return JSON.parse(p.expedientesVinculados); } catch { return []; } })()
          : (Array.isArray(p.expedientesVinculados) ? p.expedientesVinculados : [])
      }));
    const dynamicCatalogs = db.prepare('SELECT * FROM dynamic_catalogs ORDER BY id ASC').all();
    const delegaciones = db.prepare('SELECT * FROM delegaciones ORDER BY id ASC').all();
    const seriesNumerario = db.prepare(`SELECT * FROM series_numerario ${delClause} ORDER BY id ASC`).all(...delParams);
    const foliosNumerario = db.prepare(`SELECT * FROM folios_numerario ${delClause} ORDER BY id ASC`).all(...delParams);
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
  app.get('/api/settings/nav-modules', requireAuth, (_req: Request, res: Response) => {
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

  app.post('/api/settings/nav-modules', requireAuth, (req: AuthedRequest, res: Response) => {
    const actor = req.authUser!;
    if (actor.readOnly || (!actor.canAdminModules && actor.rol !== 'superusuario')) {
      return res.status(403).json({ error: 'Sin permisos para personalizar la estructura de módulos.' });
    }
    try {
      const modules = req.body;
      db.prepare("INSERT INTO app_settings (key, valueJson) VALUES ('nav_modules', ?) ON CONFLICT(key) DO UPDATE SET valueJson = excluded.valueJson").run(JSON.stringify(modules));
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Full Database Backup Export (Never exports password hashes!)
  app.get('/api/backup/export', requireAuth, (req: AuthedRequest, res: Response) => {
    const actor = req.authUser!;
    if (!actor.canExport || (actor.rol !== 'superusuario' && !actor.allowedModules.includes('respaldos'))) {
      return res.status(403).json({ error: 'Sin permisos para exportar respaldos de la base de datos.' });
    }
    const filter = buildDelegacionFilter(actor, null)!;
    const delClause = filter.clause;
    const delParams = filter.params;

    const sanitizedUsers = actor.rol === 'superusuario'
      ? (db.prepare('SELECT id, username, email, nombreApellido, rol, delegacionId, canCreate, canEdit, canDelete, readOnly, canExport, canResetCounters, allowedModules, allowedDelegacionIds, canAdminModules FROM users').all())
      : [];

    const backup = {
      version: 5,
      timestamp: new Date().toISOString(),
      delegaciones: db.prepare('SELECT * FROM delegaciones').all(),
      institutionalConfigs: db.prepare('SELECT * FROM institutional_configs').all(),
      users: sanitizedUsers,
      expedientes: db.prepare(`SELECT * FROM expedientes ${delClause}`).all(...delParams),
      personal: db.prepare(`SELECT * FROM personal ${delClause}`).all(...delParams),
      moviles: db.prepare(`SELECT * FROM moviles ${delClause}`).all(...delParams),
      reparaciones: db.prepare(`SELECT * FROM reparaciones ${delClause}`).all(...delParams),
      recargos: db.prepare(`SELECT * FROM recargos ${delClause}`).all(...delParams),
      charlas: db.prepare(`SELECT * FROM charlas ${delClause}`).all(...delParams),
      licencias: db.prepare(`SELECT * FROM licencias ${delClause}`).all(...delParams),
      personas: (db.prepare('SELECT * FROM personas').all() as any[]).filter((p) => !p.delegacionId || canAccessDelegacion(actor, p.delegacionId)),
      dynamicCatalogs: db.prepare('SELECT * FROM dynamic_catalogs').all(),
      seriesNumerario: db.prepare(`SELECT * FROM series_numerario ${delClause}`).all(...delParams),
      foliosNumerario: db.prepare(`SELECT * FROM folios_numerario ${delClause}`).all(...delParams)
    };

    recordAuditLog({
      categoria: 'RESPALDO',
      operacion: 'EXPORTAR_RESPALDO_CENTRAL',
      modulo: 'Respaldos & Depuración',
      entidad: 'backup',
      descripcion: `Exportación completa de base de datos central SQLite`,
      usuario: actor.username,
      usuarioNombre: actor.nombreApellido,
      usuarioRol: actor.rol,
      delegacionId: actor.delegacionId,
      ipAddress: getClientIp(req)
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
  app.post('/api/maintenance/purge-period', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const actor = req.authUser!;
      if (actor.readOnly || (!actor.canResetCounters && !actor.canDelete && actor.rol !== 'superusuario') || (actor.rol !== 'superusuario' && !actor.allowedModules.includes('respaldos'))) {
        return res.status(403).json({ error: 'No posee permisos para depurar registros por período.' });
      }
      const { startTime, endTime, entities = {}, delegacionId, confirmPassword } = req.body || {};
      if (!startTime || !endTime) {
        return res.status(400).json({ error: 'startTime and endTime are required' });
      }
      if (!confirmPassword) {
        return res.status(400).json({ error: 'Debe ingresar su contraseña actual para confirmar la depuración.' });
      }
      const actorRow = db.prepare('SELECT password FROM users WHERE id = ?').get(actor.id) as { password?: string } | undefined;
      if (!actorRow?.password || !verifyPassword(String(confirmPassword), actorRow.password)) {
        return res.status(403).json({ error: 'Contraseña de confirmación incorrecta. Operación cancelada.' });
      }

      const effectiveDelId = actor.rol === 'superusuario' || actor.allDelegacionesAccess
        ? (delegacionId ? Number(delegacionId) : null)
        : (delegacionId ? Number(delegacionId) : actor.delegacionId);
      if (effectiveDelId && !canAccessDelegacion(actor, effectiveDelId)) {
        return res.status(403).json({ error: 'Sin autorización sobre la delegación seleccionada.' });
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
              if (effectiveDelId && r.delegacionId && r.delegacionId !== effectiveDelId) return false;
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
          const rows = db.prepare('SELECT id, fecha, anio, delegacionId FROM folios_numerario').all();
          const ids = rows
            .filter((r: any) => {
              if (effectiveDelId && r.delegacionId && r.delegacionId !== effectiveDelId) return false;
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
              if (effectiveDelId && r.delegacionId && r.delegacionId !== effectiveDelId) return false;
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
              if (effectiveDelId && r.delegacionId && r.delegacionId !== effectiveDelId) return false;
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
              if (effectiveDelId && r.delegacionId && r.delegacionId !== effectiveDelId) return false;
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
              if (effectiveDelId && r.delegacionId && r.delegacionId !== effectiveDelId) return false;
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
              if (effectiveDelId && r.delegacionId && r.delegacionId !== effectiveDelId) return false;
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

      try { db.pragma('optimize'); } catch {}

      recordAuditLog({
        categoria: 'RESETEO',
        operacion: 'DEPURACION_PERIODO',
        modulo: 'Respaldos & Depuración',
        entidad: 'maintenance',
        descripcion: `Depuración selectiva por período (${new Date(startTime).toLocaleDateString('es-AR')} - ${new Date(endTime).toLocaleDateString('es-AR')}): ${deletedCounts.total} registros eliminados`,
        detalles: { startTime, endTime, entities, deletedCounts, delegacionId: effectiveDelId },
        usuario: actor.username,
        usuarioNombre: actor.nombreApellido,
        usuarioRol: actor.rol,
        delegacionId: effectiveDelId || actor.delegacionId,
        ipAddress: getClientIp(req)
      });

      res.json({ success: true, deletedCounts });
    } catch (err: any) {
      console.error('[Purge Period Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Maintenance: Clear / Wipe All Data (Re-authentication required)
  app.post('/api/maintenance/clear-all', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const actor = req.authUser!;
      if (actor.readOnly || (!actor.canResetCounters && !actor.canDelete && actor.rol !== 'superusuario') || (actor.rol !== 'superusuario' && !actor.allowedModules.includes('respaldos'))) {
        return res.status(403).json({ error: 'No posee permisos para vaciar tablas del sistema.' });
      }

      const {
        confirmPassword,
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
      } = req.body || {};

      if (!confirmPassword) {
        return res.status(400).json({ error: 'Debe ingresar su contraseña actual para confirmar el vaciado de datos.' });
      }
      const actorRow = db.prepare('SELECT password FROM users WHERE id = ?').get(actor.id) as { password?: string } | undefined;
      if (!actorRow?.password || !verifyPassword(String(confirmPassword), actorRow.password)) {
        return res.status(403).json({ error: 'Contraseña de confirmación incorrecta. Operación cancelada.' });
      }

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

        try { db.pragma('optimize'); } catch {}
      });

      clearTx();

      recordAuditLog({
        categoria: 'RESETEO',
        operacion: 'VACIADO_BASE_DATOS',
        modulo: 'Respaldos & Depuración',
        entidad: 'maintenance',
        descripcion: `Vaciado de tablas operativas para reinicio limpio del sistema`,
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
        usuario: actor.username,
        usuarioNombre: actor.nombreApellido,
        usuarioRol: actor.rol,
        delegacionId: actor.delegacionId,
        ipAddress: getClientIp(req)
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
  app.post('/api/maintenance/restore-period', requireAuth, (req: AuthedRequest, res: Response) => {
    try {
      const actor = req.authUser!;
      if (actor.readOnly || (!actor.canCreate && !actor.canEdit) || (actor.rol !== 'superusuario' && !actor.allowedModules.includes('respaldos'))) {
        return res.status(403).json({ error: 'No posee permisos para restaurar respaldos.' });
      }
      const { startTime, endTime, entities = {}, mode = 'merge', data = {}, delegacionId } = req.body || {};
      if (!startTime || !endTime) {
        return res.status(400).json({ error: 'startTime and endTime are required' });
      }
      if (delegacionId && !canAccessDelegacion(actor, Number(delegacionId))) {
        return res.status(403).json({ error: 'Sin autorización para restaurar sobre otra delegación.' });
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

      const auditActor = getAuditActorFromReq(req);
      recordAuditLog({
        categoria: 'RESPALDO',
        operacion: 'RESTAURACION_PERIODO',
        modulo: 'Respaldos & Depuración',
        entidad: 'maintenance',
        descripcion: `Restauración de respaldo por período (modo: ${mode}): ${restoredCounts.total} registros incorporados`,
        detalles: { startTime, endTime, mode, entities, restoredCounts, delegacionId },
        usuario: auditActor.usuario,
        usuarioNombre: auditActor.usuarioNombre,
        usuarioRol: auditActor.usuarioRol,
        delegacionId: delegacionId || auditActor.delegacionId,
        ipAddress: auditActor.ipAddress
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
  app.get('/api/audit-logs', requireSuperuser, (req: AuthedRequest, res: Response) => {
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

  app.post('/api/audit-logs', requireAuth, (req: AuthedRequest, res: Response) => {
    purgeOldAuditLogs();
    const actor = req.authUser!;
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
      usuario: actor.username,
      usuarioNombre: actor.nombreApellido,
      usuarioRol: actor.rol,
      delegacionId: b.delegacionId && canAccessDelegacion(actor, Number(b.delegacionId)) ? Number(b.delegacionId) : actor.delegacionId,
      ipAddress: getClientIp(req)
    });
    res.json({ success: true });
  });

  app.post('/api/audit-logs/purge-expired', requireSuperuser, (_req: AuthedRequest, res: Response) => {
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

  app.set('trust proxy', 1);

  // HTTP Security Headers (iframe & Vite dev/PDF blob compatible)
  app.use(helmet({
    frameguard: false,
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));

  // Enable gzip / deflate compression to make the system lightweight
  app.use(compression({
    threshold: 1024
  }));

  app.use(cookieParser());

  // Restricted CORS with credentials (same-origin + optional ALLOWED_ORIGINS)
  const allowedOriginsEnv = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
      let allowed = false;
      try {
        const originUrl = new URL(origin);
        const reqHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
        if (
          (reqHost && originUrl.host === reqHost) ||
          allowedOriginsEnv.includes(origin) ||
          originUrl.hostname === 'localhost' ||
          originUrl.hostname === '127.0.0.1'
        ) {
          allowed = true;
        }
      } catch {
        allowed = false;
      }

      if (!allowed) {
        if (req.path.startsWith('/api')) {
          return res.status(403).json({ error: 'Origen no autorizado (CORS).' });
        }
      } else {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sispol-Session');
      }
    }
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // Scoped JSON payload limits (25mb only for routes with attachments/backups, 2mb default)
  const largeJsonParser = express.json({ limit: '25mb' });
  const standardJsonParser = express.json({ limit: '2mb' });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      req.path.startsWith('/api/expedientes') ||
      req.path.startsWith('/api/personal') ||
      req.path.startsWith('/api/institutional-config') ||
      req.path.startsWith('/api/maintenance/restore-period')
    ) {
      return largeJsonParser(req, res, next);
    }
    return standardJsonParser(req, res, next);
  });
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

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
