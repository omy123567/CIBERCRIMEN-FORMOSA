import React from 'react';
import {
  BarChart3,
  FileText,
  Users,
  Car,
  Clock,
  BookOpen,
  Settings,
  Archive,
  Shield,
  ShieldAlert,
  UserCheck,
  Calendar,
  FolderTree,
  Building2,
  Hash,
  X
} from 'lucide-react';
import { InstitutionalConfig, SisPolUser, SisPolDelegacion, NavModuleItem } from '../../types/sgp';
import { DEFAULT_NAV_MODULES } from '../settings/ModuleOrderManagerModal';
import defaultBadgeUrl from '../../assets/images/police_badge_emblem_1792504361058.jpg';

interface SidebarProps {
  currentModule: string;
  onSelectModule: (module: string) => void;
  isOpen: boolean;
  onClose: () => void;
  institutionalConfig: InstitutionalConfig;
  currentUser: SisPolUser;
  activeDelegacion?: SisPolDelegacion;
  navModulesConfig?: NavModuleItem[];
  delegaciones?: SisPolDelegacion[];
  activeDelegacionId?: number;
  onChangeDelegacion?: (id: number) => void;
  counts: {
    expedientes: number;
    ppi?: number;
    personal: number;
    licencias: number;
    personas?: number;
    moviles: number;
    recargos: number;
    charlas: number;
    numerario?: number;
  };
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  dashboard: BarChart3,
  expedientes: FileText,
  numerario: Hash,
  ppi: ShieldAlert,
  personas: UserCheck,
  personal: Users,
  licencias: Calendar,
  moviles: Car,
  recargos: Clock,
  charlas: BookOpen,
  membrete: Shield,
  catalogos: Settings,
  respaldos: Archive,
  usuarios: Users,
  modulos: FolderTree
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  isOpen,
  onClose,
  institutionalConfig,
  currentUser,
  activeDelegacion,
  navModulesConfig,
  delegaciones = [],
  activeDelegacionId,
  onChangeDelegacion,
  counts
}) => {
  const baseConfig = navModulesConfig && navModulesConfig.length > 0 ? navModulesConfig : DEFAULT_NAV_MODULES;

  const canSwitchDelegation =
    currentUser.rol === 'superusuario' ||
    (currentUser.allowedDelegacionIds && currentUser.allowedDelegacionIds.length > 1);

  const availableDelegaciones =
    currentUser.rol === 'superusuario'
      ? delegaciones
      : delegaciones.filter((d) => (currentUser.allowedDelegacionIds || [currentUser.delegacionId]).includes(d.id!));

  // Filter modules based on user permissions and enabled state
  const allowedItems = baseConfig.filter((item) => {
    if (!item.enabled) return false;
    if (currentUser.rol === 'superusuario') return true;
    if (item.id === 'usuarios') {
      return currentUser.rol === 'Administrador' || (currentUser.allowedModules || []).includes('usuarios');
    }
    if (item.id === 'modulos') {
      return currentUser.canAdminModules === true;
    }
    if (item.id === 'numerario') {
      return (currentUser.allowedModules || []).includes('numerario') || !currentUser.allowedModules || currentUser.rol === 'Administrador' || currentUser.rol === 'Operador';
    }
    return (currentUser.allowedModules || []).includes(item.id);
  });

  const getBadge = (id: string): number | null => {
    switch (id) {
      case 'expedientes': return counts.expedientes;
      case 'numerario': return counts.numerario ?? null;
      case 'ppi': return counts.ppi ?? null;
      case 'personas': return counts.personas ?? null;
      case 'personal': return counts.personal;
      case 'licencias': return counts.licencias;
      case 'moviles': return counts.moviles;
      case 'recargos': return counts.recargos;
      case 'charlas': return counts.charlas;
      default: return null;
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="overflow-y-auto flex-1">
          {/* Unit Branding Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <img
                src={institutionalConfig.logoDataUrl || defaultBadgeUrl}
                alt="Escudo"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/30"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black tracking-wider text-white truncate">
                  {institutionalConfig.systemName || 'SGP / SISPOL'}
                </span>
                <span className="text-[10px] text-blue-400 font-bold uppercase truncate max-w-[140px]">
                  {activeDelegacion?.codigo || institutionalConfig.subdivision}
                </span>
                <span className="text-[9px] text-slate-400 truncate max-w-[140px]">
                  {activeDelegacion?.ciudad || institutionalConfig.policeForce}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white lg:hidden rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {allowedItems.map((item) => {
              const Icon = ICON_MAP[item.id] || FileText;
              const isActive = currentModule === item.id;
              const badge = getBadge(item.id);
              const isSubmodule = !!item.parentModuleId;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectModule(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between py-2 rounded-xl text-xs font-bold transition-all ${
                    isSubmodule ? 'pl-7 pr-3' : 'px-3.5'
                  } ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isSubmodule && (
                      <span className="text-slate-500 font-mono text-[11px]">↳</span>
                    )}
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {badge !== null && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono shrink-0 ${
                        isActive
                          ? 'bg-blue-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 space-y-2 shrink-0 bg-slate-950/40">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold text-slate-300">Delegación Activa</span>
              </span>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-900">
                {activeDelegacion?.codigo || 'DPC'}
              </span>
            </div>

            {canSwitchDelegation && onChangeDelegacion && availableDelegaciones.length > 1 ? (
              <select
                value={activeDelegacionId || activeDelegacion?.id || 1}
                onChange={(e) => {
                  onChangeDelegacion(parseInt(e.target.value, 10));
                  onClose();
                }}
                className="w-full text-xs font-bold text-amber-300 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 rounded-xl px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400"
                title="Cambiar delegación para ver sus datos"
              >
                {availableDelegaciones.map((d) => (
                  <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                    Ver: {d.ciudad} ({d.codigo})
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-xs font-bold text-slate-200 truncate">
                {activeDelegacion?.nombre || 'Delegación Laguna Blanca'}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
            <span>Usuario: <strong className="text-slate-300">{currentUser.username}</strong></span>
            <span className="text-blue-400 font-semibold">{currentUser.rol}</span>
          </div>
        </div>
      </aside>
    </>
  );
};
