import React, { useState, useEffect } from 'react';
import {
  Menu,
  Shield,
  Sun,
  Moon,
  Clock,
  Building2,
  Lock,
  ChevronDown,
  LogOut,
  KeyRound,
  SlidersHorizontal,
  Plus,
  Printer,
  ShieldCheck
} from 'lucide-react';
import { InstitutionalConfig, SisPolUser, SisPolDelegacion } from '../../types/sgp';

interface HeaderProps {
  onToggleSidebar: () => void;
  institutionalConfig: InstitutionalConfig;
  onOpenQuickNew?: () => void;
  currentUser: SisPolUser;
  delegaciones: SisPolDelegacion[];
  activeDelegacionId: number;
  onChangeDelegacion: (id: number) => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenModuleAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  institutionalConfig,
  onOpenQuickNew,
  currentUser,
  delegaciones,
  activeDelegacionId,
  onChangeDelegacion,
  onOpenChangePassword,
  onLogout,
  isDarkMode,
  onToggleDarkMode,
  onOpenModuleAdmin
}) => {
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('es-AR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const timeStr = now.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setCurrentDateTime(`${dateStr} • ${timeStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeDel = delegaciones.find((d) => d.id === activeDelegacionId);

  // Can the user switch delegations?
  const canSwitchDelegation =
    currentUser.rol === 'superusuario' ||
    (currentUser.allowedDelegacionIds && currentUser.allowedDelegacionIds.length > 1);

  const availableDelegaciones =
    currentUser.rol === 'superusuario'
      ? delegaciones
      : delegaciones.filter((d) => (currentUser.allowedDelegacionIds || [currentUser.delegacionId]).includes(d.id!));

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-xs">
      {/* Zone 1: Wordmark & Active Delegation Title */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <img
            src={institutionalConfig.logoDataUrl || '/assets/aistudio/DIc-nuevo_90a7fd82.png'}
            alt="Escudo"
            className="w-8 h-8 rounded-full object-cover ring-1 ring-blue-500/40"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight text-white whitespace-nowrap">
                {institutionalConfig.systemName || 'SGP SisPol'}
              </span>
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.2 rounded-full font-bold bg-blue-600/30 text-blue-300 border border-blue-500/30">
                {activeDel?.codigo || 'DPC'}
              </span>
            </div>
            {/* Header branding with active delegation name */}
            <span className="text-[10px] text-slate-300 font-semibold truncate max-w-xs sm:max-w-md md:max-w-xl">
              POLICÍA DE LA PROVINCIA DE FORMOSA - {activeDel?.nombre?.toUpperCase() || institutionalConfig.subdivision}
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: Date & Time + Delegation Switcher right below it */}
      <div className="hidden md:flex flex-col items-center justify-center text-center">
        {/* Date and Time visualizer */}
        <div className="flex items-center gap-1.5 text-xs text-blue-300 font-medium">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono tracking-tight capitalize">{currentDateTime}</span>
        </div>

        {/* Beneath Date & Time: Delegation visualizer / switcher */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <Building2 className="w-3 h-3 text-slate-400" />
          {canSwitchDelegation ? (
            <div className="relative inline-flex items-center">
              <select
                value={activeDelegacionId}
                onChange={(e) => onChangeDelegacion(parseInt(e.target.value, 10))}
                className="text-[11px] font-bold text-amber-300 bg-slate-800/80 hover:bg-slate-800 border border-amber-500/40 rounded-md px-2 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400"
                title="Cambiar delegación activa (Permitido por rol/permisos)"
              >
                {availableDelegaciones.map((d) => (
                  <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                    Ver: {d.nombre} ({d.ciudad})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="text-[11px] font-semibold text-slate-300 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700">
              Delegación: {activeDel?.ciudad || 'Laguna Blanca'} (Exclusiva)
            </span>
          )}
        </div>
      </div>

      {/* Zone 3: Actions, Dark Mode & User Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Dark/Light mode toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700/60"
          title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-300" />}
        </button>

        {/* Quick New Case */}
        {onOpenQuickNew && (
          <button
            onClick={onOpenQuickNew}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Carga</span>
          </button>
        )}

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs transition-all"
          >
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-[11px]">
              {currentUser.nombreApellido?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="font-bold text-white leading-tight truncate max-w-[110px]">
                {currentUser.nombreApellido}
              </span>
              <span className="text-[9px] font-mono text-blue-300 leading-tight">
                {currentUser.rol}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 text-xs space-y-1"
              onClick={() => setUserMenuOpen(false)}
            >
              <div className="p-2.5 border-b border-slate-800">
                <div className="font-bold text-white text-xs">{currentUser.nombreApellido}</div>
                <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/30">
                    Rol: {currentUser.rol}
                  </span>
                  {currentUser.canDelete ? (
                    <span className="text-[9px] text-emerald-400 font-semibold">• Permiso Borrado</span>
                  ) : (
                    <span className="text-[9px] text-slate-500 font-semibold">• Sin Borrado</span>
                  )}
                </div>

                {canSwitchDelegation && availableDelegaciones.length > 1 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800">
                    <label className="block text-[10px] font-bold text-amber-300 mb-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-amber-400" />
                      <span>Cambiar Delegación:</span>
                    </label>
                    <select
                      value={activeDelegacionId}
                      onChange={(e) => {
                        onChangeDelegacion(parseInt(e.target.value, 10));
                        setUserMenuOpen(false);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-[11px] font-bold text-amber-300 bg-slate-800 border border-amber-500/40 rounded-lg px-2 py-1 cursor-pointer focus:outline-none"
                    >
                      {availableDelegaciones.map((d) => (
                        <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                          {d.nombre} ({d.ciudad})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Action: Change Password */}
              <button
                onClick={onOpenChangePassword}
                className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors text-left"
              >
                <KeyRound className="w-4 h-4 text-blue-400" />
                <span>Cambiar Mi Contraseña</span>
              </button>

              {/* Action: Admin Modules if authorized */}
              {(currentUser.rol === 'superusuario' || currentUser.canAdminModules) && onOpenModuleAdmin && (
                <button
                  onClick={onOpenModuleAdmin}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors text-left"
                >
                  <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                  <span>Administrador de Módulos</span>
                </button>
              )}

              {/* Action: Print */}
              <button
                onClick={() => window.print()}
                className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors text-left"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span>Imprimir Pantalla</span>
              </button>

              {/* Action: Logout */}
              <div className="pt-1 border-t border-slate-800">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors text-left font-bold"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
