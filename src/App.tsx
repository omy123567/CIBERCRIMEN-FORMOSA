import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  NavModuleItem
} from './types/sgp';
import { initialInstitutionalConfig } from './db/sgpInitialData';
import { sgpManager, db } from './db/dexieDb';

export default function App() {
  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<SisPolUser | null>(() => {
    try {
      const stored = localStorage.getItem('sispol_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

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

  // Dark / Light Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sispol_theme');
    return saved !== 'light';
  });

  // Custom Navigation Modules Order
  const [navModulesConfig, setNavModulesConfig] = useState<NavModuleItem[]>(() => {
    try {
      const saved = localStorage.getItem('sispol_nav_modules');
      return saved ? JSON.parse(saved) : DEFAULT_NAV_MODULES;
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
  const handleLoginSuccess = (user: SisPolUser) => {
    setCurrentUser(user);
    const initialDel = user.delegacionId || 1;
    setActiveDelegacionId(initialDel);
    refreshData(initialDel);
  };

  // Handle User Logout
  const handleLogout = () => {
    localStorage.removeItem('sispol_current_user');
    setCurrentUser(null);
    setCurrentModule('dashboard');
  };

  // Handle Save Quick Expediente
  const handleSaveQuickExpediente = async (newExp: Expediente) => {
    await db.expedientes.add({
      ...newExp,
      delegacionId: activeDelegacionId
    });
    sgpManager.notify();
    refreshData();
  };

  // Handle Save Nav Modules Configuration
  const handleSaveNavModules = (modules: NavModuleItem[]) => {
    setNavModulesConfig(modules);
    localStorage.setItem('sispol_nav_modules', JSON.stringify(modules));
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
      personas: (allData.personas || []).filter((p) => !p.delegacionId || p.delegacionId === activeDelegacionId),
      dynamicCatalogs: allData.dynamicCatalogs.filter((c) => !c.delegacionId || c.delegacionId === activeDelegacionId),
      dynamicFields: allData.dynamicFields
    };
  }, [allData, activeDelegacionId]);

  // Loading Screen
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white space-y-3">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold tracking-wide text-slate-300">
            Iniciando {institutionalConfig.systemName || 'SGP SisPol'} (Policía de Formosa)...
          </span>
        </div>
      </div>
    );
  }

  // If user is not logged in, show official LoginView
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} delegaciones={delegaciones} />;
  }

  const counts = {
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

  const canDelete = currentUser.canDelete || currentUser.rol === 'superusuario';
  const activeDelegacion = delegaciones.find((d) => d.id === activeDelegacionId);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        institutionalConfig={institutionalConfig}
        onOpenQuickNew={() => setIsQuickNewOpen(true)}
        currentUser={currentUser}
        delegaciones={delegaciones}
        activeDelegacionId={activeDelegacionId}
        onChangeDelegacion={handleChangeDelegacion}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenModuleAdmin={() => setIsModuleAdminOpen(true)}
      />

      <div className="flex-1 flex flex-row w-full max-w-full overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentModule={currentModule}
          onSelectModule={(mod) => {
            if (mod === 'modulos') {
              setIsModuleAdminOpen(true);
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
              catalogs={filteredData.dynamicCatalogs}
              institutionalConfig={institutionalConfig}
              selectedYear={selectedYear}
              onSelectYear={setSelectedYear}
              onNavigate={(mod) => setCurrentModule(mod)}
            />
          )}

          {currentModule === 'expedientes' && (
            <ExpedientesModule
              expedientes={filteredData.expedientes}
              catalogs={filteredData.dynamicCatalogs}
              personalList={filteredData.personal}
              institutionalConfig={institutionalConfig}
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
              onRefresh={refreshData}
            />
          )}

          {currentModule === 'personas' && (
            <PersonasModule
              personas={filteredData.personas || []}
              expedientes={filteredData.expedientes}
              onRefresh={refreshData}
            />
          )}

          {currentModule === 'personal' && (
            <PersonalModule
              personalList={filteredData.personal}
              expedientes={filteredData.expedientes}
              catalogs={filteredData.dynamicCatalogs}
              institutionalConfig={institutionalConfig}
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
              onRefresh={refreshData}
            />
          )}

          {currentModule === 'recargos' && (
            <RecargosModule
              recargos={filteredData.recargos}
              personalList={filteredData.personal}
              catalogs={filteredData.dynamicCatalogs}
              institutionalConfig={institutionalConfig}
              onRefresh={refreshData}
            />
          )}

          {currentModule === 'charlas' && (
            <CharlasModule
              charlas={filteredData.charlas}
              personalList={filteredData.personal}
              catalogs={filteredData.dynamicCatalogs}
              institutionalConfig={institutionalConfig}
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
        </main>
      </div>

      {/* Global Quick Add Expediente Modal */}
      <ExpedienteFormModal
        isOpen={isQuickNewOpen}
        onClose={() => setIsQuickNewOpen(false)}
        onSave={handleSaveQuickExpediente}
        catalogs={filteredData.dynamicCatalogs}
        personalList={filteredData.personal}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        currentUser={currentUser}
        onPasswordChanged={(updated) => setCurrentUser(updated)}
      />

      {/* Module Order & Submodules Manager Modal */}
      <ModuleOrderManagerModal
        isOpen={isModuleAdminOpen}
        onClose={() => setIsModuleAdminOpen(false)}
        onSaveModules={handleSaveNavModules}
        currentModules={navModulesConfig}
      />
    </div>
  );
}
