import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard';
import { ExpedientesModule } from './components/expedientes/ExpedientesModule';
import { ExpedienteFormModal } from './components/expedientes/ExpedienteFormModal';
import { PersonalModule } from './components/personal/PersonalModule';
import { LicenciasModule } from './components/licencias/LicenciasModule';
import { MovilesModule } from './components/moviles/MovilesModule';
import { RecargosModule } from './components/recargos/RecargosModule';
import { CharlasModule } from './components/charlas/CharlasModule';
import { PersonasModule } from './components/personas/PersonasModule';
import { PpiModule } from './components/ppi/PpiModule';
import { CatalogsModule } from './components/settings/CatalogsModule';
import { MembreteEditorModule } from './components/settings/MembreteEditorModule';
import { BackupModule } from './components/backup/BackupModule';
import { UsersManagementModule } from './components/settings/UsersManagementModule';
import { ModuleOrderManagerModal, DEFAULT_NAV_MODULES } from './components/settings/ModuleOrderManagerModal';
import { LoginView } from './components/auth/LoginView';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { NumerarioModule } from './components/numerario/NumerarioModule';
import { TareasRealizadasModule } from './components/tareas/TareasRealizadasModule';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { CustomModuleView } from './components/common/CustomModuleView';
import { AuditoriaModule } from './components/auditoria/AuditoriaModule';
import { PermissionsProvider, resolveUserPermissions } from './context/PermissionsContext';

import {
  SgpBackupData,
  InstitutionalConfig,
  Expediente,
  Personal,
  Movil,
  Reparacion,
  Recargo,
  Charla,
  Licencia,
  DynamicCatalog,
  SisPolUser,
  SisPolDelegacion,
  NavModuleItem,
  FolioRegistro
} from './types/sgp';
import { initialInstitutionalConfig } from './db/sgpInitialData';
import { sgpManager, db, apiFetch, sanitizeClientUser, setSessionToken } from './db/dexieDb';
import { getUpcomingCharlasReminders } from './utils/charlaReminders';
import { BellRing, Calendar, X, ShieldAlert } from 'lucide-react';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const IDLE_WARNING_MS = 29 * 60 * 1000;

export default function App() {
  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<SisPolUser | null>(() => {
    try {
      const stored = localStorage.getItem('sispol_current_user');
      if (!stored) return null;
      const parsed = sanitizeClientUser(JSON.parse(stored));
      if (typeof parsed.allowedModules === 'string') {
        try { parsed.allowedModules = JSON.parse(parsed.allowedModules); } catch { parsed.allowedModules = []; }
      }
      if (typeof parsed.allowedDelegacionIds === 'string') {
        try { parsed.allowedDelegacionIds = JSON.parse(parsed.allowedDelegacionIds); } catch { parsed.allowedDelegacionIds = [parsed.delegacionId || 1]; }
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [idleWarningSeconds, setIdleWarningSeconds] = useState<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Delegations & Active Delegation
  const [delegaciones, setDelegaciones] = useState<SisPolDelegacion[]>([]);
  const [activeDelegacionId, setActiveDelegacionId] = useState<number>(() => {
    return currentUser?.delegacionId || 1;
  });

  // Navigation & UI State
  const [currentModule, setCurrentModule] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [isQuickNewOpen, setIsQuickNewOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isModuleAdminOpen, setIsModuleAdminOpen] = useState(false);
  const [charlaToastDismissed, setCharlaToastDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('sispol_session_charla_toast_dismissed') === '1';
    } catch {
      return false;
    }
  });

  // Dark / Light Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sispol_theme');
    return saved !== 'light';
  });

  // Custom Navigation Modules Order (auto-merges new modules like 'tareas')
  const [navModulesConfig, setNavModulesConfig] = useState<NavModuleItem[]>(() => {
    try {
      const saved = localStorage.getItem('sispol_nav_modules');
      if (saved) {
        const parsed: NavModuleItem[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map((p) => p.id));
        const missing = DEFAULT_NAV_MODULES.filter((d) => !existingIds.has(d.id));
        if (missing.length > 0) {
          const merged = [...parsed, ...missing].sort((a, b) => a.order - b.order);
          localStorage.setItem('sispol_nav_modules', JSON.stringify(merged));
          return merged;
        }
        return parsed;
      }
      return DEFAULT_NAV_MODULES;
    } catch {
      return DEFAULT_NAV_MODULES;
    }
  });

  // Database State
  const [allData, setAllData] = useState<SgpBackupData>({
    personal: [],
    expedientes: [],
    dynamicFields: [],
    dynamicCatalogs: [],
    recargos: [],
    charlas: [],
    moviles: [],
    reparaciones: [],
    licencias: []
  });

  const [institutionalConfig, setInstitutionalConfig] = useState<InstitutionalConfig>(initialInstitutionalConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [foliosCount, setFoliosCount] = useState<number>(0);
  const [foliosList, setFoliosList] = useState<FolioRegistro[]>([]);

  // Sync dark class on document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sispol_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sispol_theme', 'light');
    }
  }, [isDarkMode]);

  // Failsafe: never block interface indefinitely on loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Load database from Dexie
  const refreshData = useCallback(async (delId?: number) => {
    try {
      await sgpManager.initialize();
      const backup = await sgpManager.getBackupData();
      const dels = await sgpManager.getDelegaciones();
      setDelegaciones(dels);

      const targetDelId = delId || activeDelegacionId;
      const config = await sgpManager.getInstitutionalConfig(targetDelId);
      const folios = await sgpManager.getAllFolios(targetDelId);

      setAllData(backup);
      setInstitutionalConfig(config);
      setFoliosCount(folios.length);
      setFoliosList(folios);
    } catch (err) {
      console.error('Error refreshing data from Dexie:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeDelegacionId]);

  useEffect(() => {
    refreshData();
    const unsubscribe = sgpManager.subscribe(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, [refreshData]);

  // Handle switching delegation
  const handleChangeDelegacion = async (newDelId: number) => {
    setActiveDelegacionId(newDelId);
    await refreshData(newDelId);
  };

  // Handle User Login
  const handleLoginSuccess = async (user: SisPolUser) => {
    const clean = sanitizeClientUser(user);
    lastActivityRef.current = Date.now();
    setIdleWarningSeconds(null);
    setCurrentUser(clean);
    const initialDel = clean.delegacionId || 1;
    setActiveDelegacionId(initialDel);
    await sgpManager.syncWithServer();
    await refreshData(initialDel);
  };

  // Handle User Logout
  const handleLogout = useCallback(async (reason?: 'idle' | 'manual') => {
    if (reason === 'idle' && currentUser) {
      await sgpManager.logAudit({
        categoria: 'ACCESO',
        operacion: 'LOGOUT_INACTIVIDAD',
        modulo: 'Autenticación',
        entidad: 'users',
        entidadId: String(currentUser.id || ''),
        descripcion: `Cierre automático de sesión por inactividad de ${currentUser.username} (${currentUser.nombreApellido})`,
        delegacionId: activeDelegacionId
      });
    }
    await sgpManager.logoutServer();
    setIdleWarningSeconds(null);
    setCurrentUser(null);
    setCurrentModule('dashboard');
  }, [currentUser, activeDelegacionId]);

  // Listen to global 401 unauthorized events from apiFetch
  useEffect(() => {
    const onUnauthorized = () => {
      setSessionToken(null);
      try { localStorage.removeItem('sispol_current_user'); } catch {}
      setIdleWarningSeconds(null);
      setCurrentUser(null);
      setCurrentModule('dashboard');
    };
    window.addEventListener('sispol:unauthorized', onUnauthorized);
    return () => window.removeEventListener('sispol:unauthorized', onUnauthorized);
  }, []);

  // Verify persisted session against /api/auth/me on mount & sync authoritative permissions
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    apiFetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) return;
        const freshUser = sanitizeClientUser(await res.json());
        if (cancelled || !freshUser?.id) return;
        localStorage.setItem('sispol_current_user', JSON.stringify(freshUser));
        setCurrentUser(freshUser);
        if (
          freshUser.rol !== 'superusuario' &&
          Array.isArray(freshUser.allowedDelegacionIds) &&
          freshUser.allowedDelegacionIds.length > 0 &&
          !freshUser.allowedDelegacionIds.includes(activeDelegacionId)
        ) {
          setActiveDelegacionId(freshUser.delegacionId || freshUser.allowedDelegacionIds[0]);
        }
      })
      .catch(() => {
        // offline gracefully keeps cached session
      });
    return () => {
      cancelled = true;
    };
    // Run only once per authenticated session hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(currentUser)]);

  // Idle Auto-Logout (30 min inactivity with 60s countdown warning)
  useEffect(() => {
    if (!currentUser) {
      setIdleWarningSeconds(null);
      return;
    }

    lastActivityRef.current = Date.now();
    let lastTouchWrite = Date.now();

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastTouchWrite < 1000) return;
      lastTouchWrite = now;
      lastActivityRef.current = now;
      setIdleWarningSeconds((prev) => (prev !== null ? null : prev));
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, recordActivity, { passive: true }));

    const timer = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= IDLE_TIMEOUT_MS) {
        clearInterval(timer);
        handleLogout('idle');
      } else if (elapsed >= IDLE_WARNING_MS) {
        const secsLeft = Math.max(1, Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000));
        setIdleWarningSeconds(secsLeft);
      } else {
        setIdleWarningSeconds((prev) => (prev !== null ? null : prev));
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      events.forEach((ev) => window.removeEventListener(ev, recordActivity));
    };
  }, [currentUser, handleLogout]);

  // Handle Save Quick Expediente
  const handleSaveQuickExpediente = async (newExp: Expediente) => {
    await db.expedientes.add({
      ...newExp,
      delegacionId: activeDelegacionId
    });
    sgpManager.notify();
    refreshData();
  };

  // Pull server-stored nav modules configuration when authenticated
  useEffect(() => {
    if (!currentUser) return;
    apiFetch('/api/settings/nav-modules')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverMods) => {
        if (Array.isArray(serverMods) && serverMods.length > 0) {
          const existingIds = new Set(serverMods.map((p: NavModuleItem) => p.id));
          const missing = DEFAULT_NAV_MODULES.filter((d) => !existingIds.has(d.id));
          const merged = missing.length > 0
            ? [...serverMods, ...missing].sort((a, b) => a.order - b.order)
            : serverMods;
          setNavModulesConfig(merged);
          localStorage.setItem('sispol_nav_modules', JSON.stringify(merged));
        }
      })
      .catch(() => {});
  }, [Boolean(currentUser)]);

  // Handle Save Nav Modules Configuration
  const handleSaveNavModules = (modules: NavModuleItem[]) => {
    setNavModulesConfig(modules);
    localStorage.setItem('sispol_nav_modules', JSON.stringify(modules));
    apiFetch('/api/settings/nav-modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modules)
    }).catch((err) => {
      console.warn('Failed to sync nav-modules to server:', err);
    });
  };

  // Filter all data by activeDelegacionId (Delegation Isolation)
  const filteredData = useMemo(() => {
    return {
      expedientes: allData.expedientes.filter((e) => (e.delegacionId || 1) === activeDelegacionId),
      personal: allData.personal.filter((p) => (p.delegacionId || 1) === activeDelegacionId),
      moviles: allData.moviles.filter((m) => (m.delegacionId || 1) === activeDelegacionId),
      reparaciones: allData.reparaciones.filter((r) => (r.delegacionId || 1) === activeDelegacionId),
      recargos: allData.recargos.filter((rc) => (rc.delegacionId || 1) === activeDelegacionId),
      charlas: allData.charlas.filter((c) => (c.delegacionId || 1) === activeDelegacionId),
      licencias: allData.licencias.filter((l) => (l.delegacionId || 1) === activeDelegacionId),
      personas: allData.personas || [],
      dynamicCatalogs: allData.dynamicCatalogs, // Compartidos globalmente para todos los usuarios y delegaciones
      dynamicFields: allData.dynamicFields
    };
  }, [allData, activeDelegacionId]);

  const urgentCharlaReminders = useMemo(() => {
    return getUpcomingCharlasReminders(filteredData.charlas, 1);
  }, [filteredData.charlas]);

  // Fire optional Web Notification once per session when permission is granted for today/tomorrow Charlas
  useEffect(() => {
    if (!currentUser || urgentCharlaReminders.length === 0) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const sessionNotifKey = `sispol_browser_notif_sent_${activeDelegacionId}`;
    try {
      if (sessionStorage.getItem(sessionNotifKey)) return;
      const first = urgentCharlaReminders[0];
      new Notification(`Recordatorio de Charla (${first.label})`, {
        body: `${first.charla.temaTratado} — ${first.charla.lugarInstitucion} (${first.charla.localidad})`
      });
      sessionStorage.setItem(sessionNotifKey, '1');
    } catch {
      // ignore notification errors in restricted contexts
    }
  }, [currentUser, urgentCharlaReminders, activeDelegacionId]);

  // Access Guard: Ensure non-superusers cannot stay on unauthorized modules or auditoria (Unconditional Hook)
  useEffect(() => {
    if (currentUser && currentUser.rol !== 'superusuario') {
      if (currentModule === 'auditoria') {
        const allowed = currentUser.allowedModules || [];
        const fallback = allowed.includes('dashboard') ? 'dashboard' : allowed[0] || 'dashboard';
        setCurrentModule(fallback);
        return;
      }
      const allowed = currentUser.allowedModules;
      if (Array.isArray(allowed) && allowed.length > 0) {
        const isStandardAllowed = allowed.includes(currentModule);
        const isCustomAllowed = navModulesConfig.some(
          (m) =>
            m.id === currentModule &&
            (allowed.includes(m.id) || (m.parentModuleId && allowed.includes(m.parentModuleId)))
        );
        if (!isStandardAllowed && !isCustomAllowed) {
          const fallback = allowed.includes('dashboard') ? 'dashboard' : allowed[0] || 'dashboard';
          setCurrentModule(fallback);
        }
      }
    }
  }, [currentUser, currentModule, navModulesConfig]);

  // If user is not logged in, show official LoginView immediately (zero delay)
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} delegaciones={delegaciones} />;
  }

  // Loading Screen only when logged in user data is syncing
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white space-y-3">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold tracking-wide text-slate-300">
            Iniciando {institutionalConfig.systemName || 'S.I.S.D.I.C.'} (Policía de Formosa)...
          </span>
        </div>
      </div>
    );
  }

  const totalTareasCount =
    filteredData.expedientes.length +
    filteredData.recargos.length +
    filteredData.charlas.length +
    filteredData.reparaciones.length +
    foliosCount;

  const counts = {
    tareas: totalTareasCount,
    expedientes: filteredData.expedientes.length,
    numerario: foliosCount,
    ppi: filteredData.expedientes.filter((e) => {
      try {
        return JSON.parse(e.customFieldsJson).isPPI;
      } catch {
        return false;
      }
    }).length,
    personas: filteredData.personas?.length || 0,
    personal: filteredData.personal.length,
    licencias: filteredData.licencias.length,
    moviles: filteredData.moviles.length,
    recargos: filteredData.recargos.length,
    charlas: filteredData.charlas.length
  };

  const perms = resolveUserPermissions(currentUser);
  const canDelete = perms.canDelete;
  const canAdminModules = perms.canAdminModules;
  const canQuickCreate = !perms.readOnly && perms.canCreate;
  const activeDelegacion = delegaciones.find((d) => d.id === activeDelegacionId);

  return (
    <PermissionsProvider user={currentUser}>
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        institutionalConfig={institutionalConfig}
        onOpenQuickNew={canQuickCreate ? () => setIsQuickNewOpen(true) : undefined}
        currentUser={currentUser}
        delegaciones={delegaciones}
        activeDelegacionId={activeDelegacionId}
        onChangeDelegacion={handleChangeDelegacion}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onLogout={() => handleLogout('manual')}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenModuleAdmin={canAdminModules ? () => setIsModuleAdminOpen(true) : undefined}
        charlas={filteredData.charlas}
        onNavigate={(mod) => setCurrentModule(mod)}
      />

      <div className="flex-1 flex flex-row w-full max-w-full overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentModule={currentModule}
          onSelectModule={(mod) => {
            if (mod === 'modulos') {
              if (canAdminModules) {
                setIsModuleAdminOpen(true);
              }
            } else {
              setCurrentModule(mod);
            }
          }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          institutionalConfig={institutionalConfig}
          currentUser={currentUser}
          activeDelegacion={activeDelegacion}
          navModulesConfig={navModulesConfig}
          onReorderModules={handleSaveNavModules}
          onOpenModuleAdmin={canAdminModules ? () => setIsModuleAdminOpen(true) : undefined}
          delegaciones={delegaciones}
          activeDelegacionId={activeDelegacionId}
          onChangeDelegacion={handleChangeDelegacion}
          counts={counts}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {currentModule === 'dashboard' && (
            <ExecutiveDashboard
              expedientes={filteredData.expedientes}
              personalList={filteredData.personal}
              moviles={filteredData.moviles}
              reparaciones={filteredData.reparaciones}
              charlas={filteredData.charlas}
              catalogs={filteredData.dynamicCatalogs}
              institutionalConfig={institutionalConfig}
              selectedYear={selectedYear}
              onSelectYear={setSelectedYear}
              onNavigate={(mod) => setCurrentModule(mod)}
            />
          )}

          {currentModule === 'tareas' && (
            <TareasRealizadasModule
              expedientes={filteredData.expedientes}
              recargos={filteredData.recargos}
              charlas={filteredData.charlas}
              moviles={filteredData.moviles}
              reparaciones={filteredData.reparaciones}
              folios={foliosList}
              personalList={filteredData.personal}
              catalogs={filteredData.dynamicCatalogs}
              institutionalConfig={institutionalConfig}
              currentUser={currentUser}
              onNavigate={(mod) => setCurrentModule(mod)}
            />
          )}

          {currentModule === 'expedientes' && (
            <ExpedientesModule
              expedientes={filteredData.expedientes}
              catalogs={filteredData.dynamicCatalogs}
              personalList={filteredData.personal}
              institutionalConfig={institutionalConfig}
              delegacionId={activeDelegacionId}
              onNavigate={(mod) => setCurrentModule(mod)}
              onRefresh={refreshData}
              canDelete={canDelete}
            />
          )}

          {currentModule === 'numerario' && (
            <NumerarioModule
              currentUser={currentUser}
              delegacionId={activeDelegacionId}
              institutionalConfig={institutionalConfig}
              canDelete={canDelete}
            />
          )}

          {currentModule === 'ppi' && (
            <PpiModule
              expedientes={filteredData.expedientes}
              personalList={filteredData.personal}
              catalogs={filteredData.dynamicCatalogs}
              institutionalConfig={institutionalConfig}
              delegacionId={activeDelegacionId}
              onNavigate={(mod) => setCurrentModule(mod)}
              onRefresh={refreshData}
            />
          )}

          {currentModule === 'personas' && (
            <PersonasModule
              personas={filteredData.personas || []}
              expedientes={filteredData.expedientes}
              delegacionId={activeDelegacionId}
              onNavigate={(mod) => setCurrentModule(mod)}
              onRefresh={refreshData}
            />
          )}

          {currentModule === 'personal' && (
            <PersonalModule
              personalList={filteredData.personal}
              expedientes={filteredData.expedientes}
              catalogs={filteredData.dynamicCatalogs}
              institutionalConfig={institutionalConfig}
              delegacionId={activeDelegacionId}
              onNavigate={(mod) => setCurrentModule(mod)}
              onRefresh={refreshData}
              onNavigateToPpi={() => setCurrentModule('ppi')}
            />
          )}

          {currentModule === 'licencias' && (
            <LicenciasModule
              personalList={filteredData.personal}
              licencias={filteredData.licencias}
              catalogs={filteredData.dynamicCatalogs}
              institutionalConfig={institutionalConfig}
              delegacionId={activeDelegacionId}
              onNavigate={(mod) => setCurrentModule(mod)}
              onRefresh={refreshData}
              anioBase={parseInt(selectedYear, 10) || 2026}
            />
          )}

          {currentModule === 'moviles' && (
            <MovilesModule
              moviles={filteredData.moviles}
              reparaciones={filteredData.reparaciones}
              catalogs={filteredData.dynamicCatalogs}
              institutionalConfig={institutionalConfig}
              delegacionId={activeDelegacionId}
              onNavigate={(mod) => setCurrentModule(mod)}
              onRefresh={refreshData}
            />
          )}

          {currentModule === 'recargos' && (
            <RecargosModule
              recargos={filteredData.recargos}
              personalList={filteredData.personal}
              catalogs={filteredData.dynamicCatalogs}
              institutionalConfig={institutionalConfig}
              delegacionId={activeDelegacionId}
              onNavigate={(mod) => setCurrentModule(mod)}
              onRefresh={refreshData}
            />
          )}

          {currentModule === 'charlas' && (
            <CharlasModule
              charlas={filteredData.charlas}
              personalList={filteredData.personal}
              catalogs={filteredData.dynamicCatalogs}
              institutionalConfig={institutionalConfig}
              delegacionId={activeDelegacionId}
              onNavigate={(mod) => setCurrentModule(mod)}
              onRefresh={refreshData}
            />
          )}

          {currentModule === 'membrete' && (
            <MembreteEditorModule
              institutionalConfig={institutionalConfig}
              onRefresh={refreshData}
            />
          )}

          {currentModule === 'catalogos' && (
            <CatalogsModule
              catalogs={filteredData.dynamicCatalogs}
              institutionalConfig={institutionalConfig}
              delegacionId={activeDelegacionId}
              onNavigate={(mod) => setCurrentModule(mod)}
              onRefresh={refreshData}
            />
          )}

          {currentModule === 'respaldos' && (
            <BackupModule
              backupData={filteredData}
              onRefresh={refreshData}
            />
          )}

          {currentModule === 'usuarios' && (
            <UsersManagementModule
              currentUser={currentUser}
              delegaciones={delegaciones}
              onRefresh={refreshData}
            />
          )}

          {currentModule === 'auditoria' && currentUser.rol === 'superusuario' && (
            <AuditoriaModule
              currentUser={currentUser}
              delegaciones={delegaciones}
            />
          )}

          {/* Custom Module / Folder View fallback */}
          {![
            'dashboard',
            'tareas',
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
            'auditoria'
          ].includes(currentModule) && (
            <CustomModuleView
              currentModuleId={currentModule}
              navModulesConfig={navModulesConfig}
              currentUser={currentUser}
              delegacionId={activeDelegacionId}
              institutionalConfig={institutionalConfig}
              onNavigate={(mod) => setCurrentModule(mod)}
              onOpenModuleAdmin={() => setIsModuleAdminOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Global Quick Add Expediente Modal */}
      {canQuickCreate && (
        <ExpedienteFormModal
          isOpen={isQuickNewOpen}
          onClose={() => setIsQuickNewOpen(false)}
          onSave={handleSaveQuickExpediente}
          catalogs={filteredData.dynamicCatalogs}
          personalList={filteredData.personal}
          delegacionId={activeDelegacionId}
        />
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        currentUser={currentUser}
        onPasswordChanged={(updated) => setCurrentUser(updated)}
      />

      {/* Module Order & Submodules Manager Modal */}
      {canAdminModules && (
        <ModuleOrderManagerModal
          isOpen={isModuleAdminOpen}
          onClose={() => setIsModuleAdminOpen(false)}
          onSaveModules={handleSaveNavModules}
          currentModules={navModulesConfig}
          isSuperuser={currentUser.rol === 'superusuario'}
        />
      )}

      {/* Urgent Charla Reminder Toast (Today / Tomorrow) */}
      {urgentCharlaReminders.length > 0 && !charlaToastDismissed && currentModule !== 'charlas' && (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm w-[calc(100%-2rem)] bg-slate-900 dark:bg-slate-800 text-white border border-amber-500/60 rounded-2xl p-4 shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
              <BellRing className="w-4 h-4 animate-pulse shrink-0" />
              <span>Recordatorio de Charla Próxima</span>
            </div>
            <button
              onClick={() => {
                setCharlaToastDismissed(true);
                try { sessionStorage.setItem('sispol_session_charla_toast_dismissed', '1'); } catch {}
              }}
              className="text-slate-400 hover:text-white p-0.5"
              aria-label="Cerrar recordatorio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 font-mono text-amber-300 font-bold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{urgentCharlaReminders[0].label} • {urgentCharlaReminders[0].charla.fecha}</span>
            </div>
            <div className="font-bold text-white line-clamp-2">
              {urgentCharlaReminders[0].charla.temaTratado}
            </div>
            <div className="text-[11px] text-slate-300">
              {urgentCharlaReminders[0].charla.lugarInstitucion} ({urgentCharlaReminders[0].charla.localidad})
            </div>
            {urgentCharlaReminders.length > 1 && (
              <div className="text-[10px] text-blue-300 font-semibold">
                +{urgentCharlaReminders.length - 1} charla(s) adicional(es) entre hoy y mañana
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => {
                setCharlaToastDismissed(true);
                try { sessionStorage.setItem('sispol_session_charla_toast_dismissed', '1'); } catch {}
                setCurrentModule('charlas');
              }}
              className="px-3 py-1.5 text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors"
            >
              Ver en Charlas
            </button>
          </div>
        </div>
      )}

      {/* Idle Session Timeout Warning Banner */}
      {idleWarningSeconds !== null && (
        <div className="fixed bottom-4 left-4 z-50 max-w-md w-[calc(100%-2rem)] bg-slate-900 border-2 border-amber-500 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <div className="font-bold text-amber-300">Sesión próxima a expirar por inactividad</div>
              <div className="text-slate-300">
                Cierre automático en <span className="font-mono font-bold text-white">{idleWarningSeconds}s</span>.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              lastActivityRef.current = Date.now();
              setIdleWarningSeconds(null);
              apiFetch('/api/auth/me').catch(() => {});
            }}
            className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shrink-0"
          >
            Continuar sesión
          </button>
        </div>
      )}

      {/* PWA / Cross-platform Offline Status Indicator */}
      <OfflineIndicator />
    </div>
    </PermissionsProvider>
  );
}
