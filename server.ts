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
      lugarInstitucion TEXT NOT NULL,
      localidad TEXT NOT NULL,
      temaTratado TEXT NOT NULL,
      personalDesignado TEXT,
      cantidadAsistentes INTEGER,
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

    CREATE INDEX IF NOT EXISTS idx_expedientes_fecha ON expedientes(fechaIngreso);
    CREATE INDEX IF NOT EXISTS idx_folios_fecha ON folios_numerario(fecha, anio);
    CREATE INDEX IF NOT EXISTS idx_recargos_fecha ON recargos(fecha);
    CREATE INDEX IF NOT EXISTS idx_licencias_fechas ON licencias(fechaSalida, fechaIngreso);
    CREATE INDEX IF NOT EXISTS idx_reparaciones_fecha ON reparaciones(fecha);
    CREATE INDEX IF NOT EXISTS idx_charlas_fecha ON charlas(fecha);
    CREATE INDEX IF NOT EXISTS idx_personas_fecha ON personas(fechaRegistro);
  `);

  // Seed default custom roles if empty
  const countRoles = db.prepare('SELECT count(*) as count FROM custom_roles').get() as { count: number };
  if (countRoles.count === 0) {
    const defaultRoles = [
      {
        nombre: 'Operador',
        descripcion: 'Carga de datos operativos, registro de expedientes, personal y consultas',
        canDelete: 0,
        allowedModules: JSON.stringify(['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas']),
        allDelegacionesAccess: 0,
        canAdminModules: 0,
        isSystem: 1
      },
      {
        nombre: 'Administrador',
        descripcion: 'Gestión completa de su Delegación, reportes, usuarios y eliminación de registros',
        canDelete: 1,
        allowedModules: JSON.stringify(['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas', 'membrete', 'catalogos', 'respaldos', 'usuarios']),
        allDelegacionesAccess: 0,
        canAdminModules: 0,
        isSystem: 1
      },
      {
        nombre: 'superusuario',
        descripcion: 'Acceso irrestricto total a todas las delegaciones, configuración y orden de módulos',
        canDelete: 1,
        allowedModules: JSON.stringify(['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas', 'membrete', 'catalogos', 'respaldos', 'usuarios', 'modulos']),
        allDelegacionesAccess: 1,
        canAdminModules: 1,
        isSystem: 1
      },
      {
        nombre: 'Jefe de Turno',
        descripcion: 'Supervisión de guardia, asignación de folios, expedientes y recargos de servicio',
        canDelete: 0,
        allowedModules: JSON.stringify(['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'personal', 'licencias', 'moviles', 'recargos', 'charlas']),
        allDelegacionesAccess: 0,
        canAdminModules: 0,
        isSystem: 0
      },
      {
        nombre: 'Perito Forense',
        descripcion: 'Especialista de laboratorio y gabinete con acceso a evidencias, informes y numerario',
        canDelete: 0,
        allowedModules: JSON.stringify(['dashboard', 'expedientes', 'numerario', 'ppi', 'personas', 'charlas']),
        allDelegacionesAccess: 0,
        canAdminModules: 0,
        isSystem: 0
      }
    ];

    const insertRole = db.prepare(`
      INSERT INTO custom_roles (nombre, descripcion, canDelete, allowedModules, allDelegacionesAccess, canAdminModules, isSystem, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    for (const r of defaultRoles) {
      insertRole.run(r.nombre, r.descripcion, r.canDelete, r.allowedModules, r.allDelegacionesAccess, r.canAdminModules, r.isSystem);
    }
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

  // Seed sample initial records if expedientes empty
  const countExp = db.prepare('SELECT count(*) as count FROM expedientes').get() as { count: number };
  if (countExp.count === 0) {
    // Expedientes
    const insertExp = db.prepare(`
      INSERT INTO expedientes (anio, nroExpediente, fechaIngreso, fechaVencimiento, tipoRequerimiento, juzgado, caratula, estado, customFieldsJson, delegacionId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const e of initialSgpBackup.expedientes) {
      insertExp.run(
        e.anio,
        e.nroExpediente,
        e.fechaIngreso,
        e.fechaVencimiento || null,
        e.tipoRequerimiento,
        e.juzgado,
        e.caratula,
        e.estado,
        e.customFieldsJson,
        e.delegacionId || 1
      );
    }

    // Personal
    const insertPers = db.prepare(`
      INSERT INTO personal (jerarquia, plaza, apellidoNombre, dni, fechaNacimiento, fechaIngreso, grupo, contactoEmergencia, disponible, motivoNoDisponible, customFieldsJson, delegacionId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of initialSgpBackup.personal) {
      insertPers.run(
        p.jerarquia,
        p.plaza,
        p.apellidoNombre,
        p.dni,
        p.fechaNacimiento,
        p.fechaIngreso,
        p.grupo,
        p.contactoEmergencia || null,
        p.disponible ? 1 : 0,
        p.motivoNoDisponible || null,
        p.customFieldsJson || null,
        p.delegacionId || 1
      );
    }
  }

  // Moviles independent seeding check
  const countMov = db.prepare('SELECT count(*) as count FROM moviles').get() as { count: number };
  if (countMov.count === 0 && initialSgpBackup.moviles) {
    const insertMov = db.prepare(`
      INSERT INTO moviles (identificador, marca, modelo, dominio, chasis, motor, condicion, kmActual, kmUltimoService, kmProximoService, vencimientoRto, vencimientoSeguro, companiaSeguro, numeroPoliza, observaciones, delegacionId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const m of initialSgpBackup.moviles) {
      insertMov.run(
        m.identificador,
        m.marca,
        m.modelo,
        m.dominio,
        m.chasis || null,
        m.motor || null,
        m.condicion,
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
    }

    // Reparaciones
    const insertRep = db.prepare(`
      INSERT INTO reparaciones (movilId, fecha, tallerMecanico, descripcion, repuestosCambiados, costoTotal, kmMomento, observaciones, delegacionId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of initialSgpBackup.reparaciones) {
      insertRep.run(
        r.movilId,
        r.fecha,
        r.tallerMecanico || null,
        r.descripcion,
        r.repuestosCambiados || null,
        r.costoTotal || null,
        r.kmMomento || null,
        r.observaciones || null,
        r.delegacionId || 1
      );
    }

    // Recargos
    const insertRec = db.prepare(`
      INSERT INTO recargos (personalId, personalNombre, personalJerarquia, fecha, horarioDesde, horarioHasta, totalHoras, tipoRecargo, lugarDestino, observaciones, delegacionId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const rc of initialSgpBackup.recargos) {
      insertRec.run(
        rc.personalId,
        rc.personalNombre || null,
        rc.personalJerarquia || null,
        rc.fecha,
        rc.horarioDesde || null,
        rc.horarioHasta || null,
        rc.totalHoras || null,
        rc.tipoRecargo,
        rc.lugarDestino || null,
        rc.observaciones || null,
        rc.delegacionId || 1
      );
    }

    // Charlas
    const insertCha = db.prepare(`
      INSERT INTO charlas (fecha, lugarInstitucion, localidad, temaTratado, personalDesignado, cantidadAsistentes, observaciones, delegacionId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const ch of initialSgpBackup.charlas) {
      insertCha.run(
        ch.fecha,
        ch.lugarInstitucion,
        ch.localidad,
        ch.temaTratado,
        ch.personalDesignado || null,
        ch.cantidadAsistentes || null,
        ch.observaciones || null,
        ch.delegacionId || 1
      );
    }

    // Licencias
    const insertLic = db.prepare(`
      INSERT INTO licencias (personalId, jerarquia, plaza, apellidoNombre, dni, fechaIngreso, tipoLicencia, anioPeriodo, diasHabilesTomados, sumaDiasViaje, disposicionViaje, diasPermitidosViaje, fueInterrumpida, fechaInterrupcion, motivoInterrupcion, diasRestantesDevueltos, observaciones, periodosDetalleJson, fechaSalida, delegacionId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const l of initialSgpBackup.licencias) {
      insertLic.run(
        l.personalId,
        l.jerarquia || null,
        l.plaza || null,
        l.apellidoNombre || null,
        l.dni || null,
        l.fechaIngreso || null,
        l.tipoLicencia,
        l.anioPeriodo,
        l.diasHabilesTomados || 0,
        l.sumaDiasViaje ? 1 : 0,
        l.disposicionViaje || null,
        l.diasPermitidosViaje || 0,
        l.fueInterrumpida ? 1 : 0,
        l.fechaInterrupcion || null,
        l.motivoInterrupcion || null,
        l.diasRestantesDevueltos || 0,
        l.observaciones || null,
        l.periodosDetalleJson || null,
        l.fechaSalida || null,
        l.delegacionId || 1
      );
    }

    // Personas
    if (initialSgpBackup.personas && initialSgpBackup.personas.length > 0) {
      const insertPer = db.prepare(`
        INSERT INTO personas (apellidoNombre, dni, observaciones, fechaRegistro, expedientesVinculados, delegacionId)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const p of initialSgpBackup.personas) {
        insertPer.run(
          p.apellidoNombre,
          p.dni,
          p.observaciones || null,
          p.fechaRegistro || null,
          JSON.stringify(p.expedientesVinculados || []),
          p.delegacionId || 1
        );
      }
    }
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
// REST API Routes Configuration
// -------------------------------------------------------------
function setupApiRoutes(app: express.Express) {
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
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password) as any;
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      nombreApellido: user.nombreApellido,
      rol: user.rol,
      delegacionId: user.delegacionId,
      canDelete: Boolean(user.canDelete),
      allowedModules: JSON.parse(user.allowedModules || '[]'),
      allowedDelegacionIds: JSON.parse(user.allowedDelegacionIds || '[]'),
      canAdminModules: Boolean(user.canAdminModules)
    });
  });

  app.post('/api/auth/change-password', (req: Request, res: Response) => {
    const { userId, oldPassword, newPassword } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND password = ?').get(userId, oldPassword) as any;
    if (!user) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta' });
    }
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newPassword, userId);
    res.json({ success: true, message: 'Contraseña actualizada exitosamente' });
  });

  app.get('/api/users', (_req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM users ORDER BY id ASC').all() as any[];
    const parsed = rows.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      password: u.password,
      nombreApellido: u.nombreApellido,
      rol: u.rol,
      delegacionId: u.delegacionId,
      canDelete: Boolean(u.canDelete),
      allowedModules: JSON.parse(u.allowedModules || '[]'),
      allowedDelegacionIds: JSON.parse(u.allowedDelegacionIds || '[]'),
      canAdminModules: Boolean(u.canAdminModules)
    }));
    res.json(parsed);
  });

  app.post('/api/users', (req: Request, res: Response) => {
    const u = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO users (username, email, password, nombreApellido, rol, delegacionId, canDelete, allowedModules, allowedDelegacionIds, canAdminModules)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        u.username,
        u.email,
        u.password,
        u.nombreApellido,
        u.rol,
        u.delegacionId,
        u.canDelete ? 1 : 0,
        JSON.stringify(u.allowedModules || []),
        JSON.stringify(u.allowedDelegacionIds || [u.delegacionId]),
        u.canAdminModules ? 1 : 0
      );
      res.json({ id: info.lastInsertRowid, success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/users/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const u = req.body;
    try {
      const stmt = db.prepare(`
        UPDATE users SET
          username = ?,
          email = ?,
          password = ?,
          nombreApellido = ?,
          rol = ?,
          delegacionId = ?,
          canDelete = ?,
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
        u.canDelete ? 1 : 0,
        JSON.stringify(u.allowedModules || []),
        JSON.stringify(u.allowedDelegacionIds || [u.delegacionId]),
        u.canAdminModules ? 1 : 0,
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
    const parsed = rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion,
      canDelete: Boolean(r.canDelete),
      allowedModules: typeof r.allowedModules === 'string'
        ? (() => { try { return JSON.parse(r.allowedModules); } catch { return []; } })()
        : (Array.isArray(r.allowedModules) ? r.allowedModules : []),
      allDelegacionesAccess: Boolean(r.allDelegacionesAccess),
      canAdminModules: Boolean(r.canAdminModules),
      isSystem: Boolean(r.isSystem),
      createdAt: r.createdAt
    }));
    res.json(parsed);
  });

  app.post('/api/roles', (req: Request, res: Response) => {
    const r = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO custom_roles (nombre, descripcion, canDelete, allowedModules, allDelegacionesAccess, canAdminModules, isSystem, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      const info = stmt.run(
        r.nombre,
        r.descripcion || '',
        r.canDelete ? 1 : 0,
        JSON.stringify(r.allowedModules || []),
        r.allDelegacionesAccess ? 1 : 0,
        r.canAdminModules ? 1 : 0,
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
    try {
      const stmt = db.prepare(`
        UPDATE custom_roles SET
          nombre = ?,
          descripcion = ?,
          canDelete = ?,
          allowedModules = ?,
          allDelegacionesAccess = ?,
          canAdminModules = ?
        WHERE id = ?
      `);
      stmt.run(
        r.nombre,
        r.descripcion || '',
        r.canDelete ? 1 : 0,
        JSON.stringify(r.allowedModules || []),
        r.allDelegacionesAccess ? 1 : 0,
        r.canAdminModules ? 1 : 0,
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
    const e = req.body;
    const stmt = db.prepare(`
      INSERT INTO expedientes (anio, nroExpediente, fechaIngreso, fechaVencimiento, tipoRequerimiento, juzgado, caratula, estado, customFieldsJson, delegacionId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      e.anio,
      e.nroExpediente,
      e.fechaIngreso,
      e.fechaVencimiento || null,
      e.tipoRequerimiento,
      e.juzgado,
      e.caratula,
      e.estado,
      e.customFieldsJson || '{}',
      e.delegacionId || 1
    );
    res.json({ id: info.lastInsertRowid, success: true });
  });

  app.put('/api/expedientes/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const e = req.body;
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
      e.anio,
      e.nroExpediente,
      e.fechaIngreso,
      e.fechaVencimiento || null,
      e.tipoRequerimiento,
      e.juzgado,
      e.caratula,
      e.estado,
      e.customFieldsJson || '{}',
      e.delegacionId || 1,
      id
    );
    res.json({ success: true });
  });

  app.delete('/api/expedientes/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    db.prepare('DELETE FROM expedientes WHERE id = ?').run(id);
    res.json({ success: true });
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
    const p = req.body;
    const stmt = db.prepare(`
      INSERT INTO personal (jerarquia, plaza, apellidoNombre, dni, fechaNacimiento, fechaIngreso, grupo, contactoEmergencia, disponible, motivoNoDisponible, customFieldsJson, delegacionId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      p.jerarquia,
      p.plaza,
      p.apellidoNombre,
      p.dni,
      p.fechaNacimiento,
      p.fechaIngreso,
      p.grupo,
      p.contactoEmergencia || null,
      p.disponible ? 1 : 0,
      p.motivoNoDisponible || null,
      p.customFieldsJson || null,
      p.delegacionId || 1
    );
    res.json({ id: info.lastInsertRowid, success: true });
  });

  app.put('/api/personal/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const p = req.body;
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
      p.jerarquia,
      p.plaza,
      p.apellidoNombre,
      p.dni,
      p.fechaNacimiento,
      p.fechaIngreso,
      p.grupo,
      p.contactoEmergencia || null,
      p.disponible ? 1 : 0,
      p.motivoNoDisponible || null,
      p.customFieldsJson || null,
      p.delegacionId || 1,
      id
    );
    res.json({ success: true });
  });

  app.delete('/api/personal/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    db.prepare('DELETE FROM personal WHERE id = ?').run(id);
    res.json({ success: true });
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
    const m = req.body;
    const stmt = db.prepare(`
      INSERT INTO moviles (identificador, tipoMovil, marca, modelo, dominio, chasis, motor, anioFabricacion, condicion, estadoRevista, odometroActual, ultimoServiceKm, ultimoServiceFecha, proximoServiceKm, aseguradora, vencimientoSeguro, polizaNumero, observaciones, delegacionId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      m.identificador,
      m.tipoMovil,
      m.marca,
      m.modelo,
      m.dominio,
      m.chasis || null,
      m.motor || null,
      m.anioFabricacion || null,
      m.condicion,
      m.estadoRevista,
      m.odometroActual || null,
      m.ultimoServiceKm || null,
      m.ultimoServiceFecha || null,
      m.proximoServiceKm || null,
      m.aseguradora || null,
      m.vencimientoSeguro || null,
      m.polizaNumero || null,
      m.observaciones || null,
      m.delegacionId || 1
    );
    res.json({ id: info.lastInsertRowid, success: true });
  });

  app.put('/api/moviles/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const m = req.body;
    const stmt = db.prepare(`
      UPDATE moviles SET
        identificador = ?,
        tipoMovil = ?,
        marca = ?,
        modelo = ?,
        dominio = ?,
        chasis = ?,
        motor = ?,
        anioFabricacion = ?,
        condicion = ?,
        estadoRevista = ?,
        odometroActual = ?,
        ultimoServiceKm = ?,
        ultimoServiceFecha = ?,
        proximoServiceKm = ?,
        aseguradora = ?,
        vencimientoSeguro = ?,
        polizaNumero = ?,
        observaciones = ?,
        delegacionId = ?
      WHERE id = ?
    `);
    stmt.run(
      m.identificador,
      m.tipoMovil,
      m.marca,
      m.modelo,
      m.dominio,
      m.chasis || null,
      m.motor || null,
      m.anioFabricacion || null,
      m.condicion,
      m.estadoRevista,
      m.odometroActual || null,
      m.ultimoServiceKm || null,
      m.ultimoServiceFecha || null,
      m.proximoServiceKm || null,
      m.aseguradora || null,
      m.vencimientoSeguro || null,
      m.polizaNumero || null,
      m.observaciones || null,
      m.delegacionId || 1,
      id
    );
    res.json({ success: true });
  });

  app.delete('/api/moviles/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    db.prepare('DELETE FROM moviles WHERE id = ?').run(id);
    res.json({ success: true });
  });

  app.get('/api/reparaciones', (req: Request, res: Response) => {
    const delegacionId = req.query.delegacionId ? parseInt(req.query.delegacionId as string, 10) : null;
    const rows = delegacionId
      ? db.prepare('SELECT * FROM reparaciones WHERE delegacionId = ? ORDER BY id DESC').all(delegacionId)
      : db.prepare('SELECT * FROM reparaciones ORDER BY id DESC').all();
    res.json(rows);
  });

  app.post('/api/reparaciones', (req: Request, res: Response) => {
    const r = req.body;
    const stmt = db.prepare(`
      INSERT INTO reparaciones (movilId, fecha, tipoReparacion, descripcion, costo, taller, estado, delegacionId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(r.movilId, r.fecha, r.tipoReparacion, r.descripcion, r.costo || null, r.taller || null, r.estado, r.delegacionId || 1);
    res.json({ id: info.lastInsertRowid, success: true });
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
    db.prepare('DELETE FROM folios_numerario WHERE serieId = ?').run(id);
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
    const f = req.body;
    const anioVal = Number(f.anio) || new Date().getFullYear();
    const caratulaVal = f.caratula || `Folio N° ${f.numero}/${anioVal}`;
    const stmt = db.prepare(`
      INSERT INTO folios_numerario (serieId, numero, rangoId, anio, caratula, asunto, destinatario, solicitante, observaciones, tipoDocumento, fecha, hora, usuarioAsigno, delegacionId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
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
    res.json({ id: info.lastInsertRowid, success: true });
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
    const p = req.body;
    const stmt = db.prepare(`
      INSERT INTO personas (apellidoNombre, dni, observaciones, fechaRegistro, expedientesVinculados, delegacionId)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      p.apellidoNombre,
      p.dni,
      p.observaciones || null,
      p.fechaRegistro || new Date().toLocaleDateString('es-AR'),
      JSON.stringify(Array.isArray(p.expedientesVinculados) ? p.expedientesVinculados : []),
      p.delegacionId || null
    );
    res.json({ id: info.lastInsertRowid, success: true });
  });

  app.put('/api/personas/:id', (req: Request, res: Response) => {
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
      p.apellidoNombre,
      p.dni,
      p.observaciones || null,
      JSON.stringify(Array.isArray(p.expedientesVinculados) ? p.expedientesVinculados : []),
      p.delegacionId || null,
      id
    );
    res.json({ success: true });
  });

  app.delete('/api/personas/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    db.prepare('DELETE FROM personas WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Catálogos Dinámicos Compartidos
  app.get('/api/dynamic-catalogs', (_req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM dynamic_catalogs ORDER BY category ASC, value ASC').all();
    res.json(rows);
  });

  app.post('/api/dynamic-catalogs', (req: Request, res: Response) => {
    const { category, value, delegacionId } = req.body;
    const stmt = db.prepare('INSERT INTO dynamic_catalogs (category, value, delegacionId) VALUES (?, ?, ?)');
    const info = stmt.run(category, value, delegacionId || null);
    res.json({ id: info.lastInsertRowid, success: true });
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
    const roles = db.prepare('SELECT * FROM custom_roles ORDER BY id ASC').all().map((r: any) => ({
      ...r,
      canDelete: Boolean(r.canDelete),
      allDelegacionesAccess: Boolean(r.allDelegacionesAccess),
      canAdminModules: Boolean(r.canAdminModules),
      isSystem: Boolean(r.isSystem),
      allowedModules: typeof r.allowedModules === 'string'
        ? (() => { try { return JSON.parse(r.allowedModules); } catch { return []; } })()
        : (Array.isArray(r.allowedModules) ? r.allowedModules : [])
    }));

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
      roles
    });
  });

  // Full Database Backup Export
  app.get('/api/backup/export', (_req: Request, res: Response) => {
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

      res.json({ success: true, deletedCounts });
    } catch (err: any) {
      console.error('[Purge Period Error]:', err);
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
            INSERT OR REPLACE INTO charlas (id, fecha, lugarInstitucion, localidad, temaTratado, personalDesignado, cantidadAsistentes, observaciones, delegacionId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const item of data.charlas) {
            const t = parseDateToTimeServer(item.fecha);
            if (t !== null && t >= startTime && t <= endTime) {
              insertCh.run(
                item.id || null,
                item.fecha || '',
                item.lugarInstitucion || '',
                item.localidad || '',
                item.temaTratado || '',
                item.personalDesignado || '',
                item.cantidadAsistentes || 0,
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

      res.json({ success: true, restoredCounts });
    } catch (err: any) {
      console.error('[Restore Period Error]:', err);
      res.status(500).json({ error: err.message });
    }
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
