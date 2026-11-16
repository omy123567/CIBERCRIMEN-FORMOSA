import React, { useState } from 'react';
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
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Layers,
  Sparkles,
  ClipboardCheck,
  Folder,
  FolderOpen,
  GripVertical,
  History
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
  onReorderModules?: (modules: NavModuleItem[]) => void;
  onOpenModuleAdmin?: () => void;
  delegaciones?: SisPolDelegacion[];
  activeDelegacionId?: number;
  onChangeDelegacion?: (id: number) => void;
  counts: {
    expedientes: number;
    tareas?: number;
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
  tareas: ClipboardCheck,
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
  modulos: FolderTree,
  auditoria: History
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
  onReorderModules,
  onOpenModuleAdmin,
  delegaciones = [],
  activeDelegacionId,
  onChangeDelegacion,
  counts
}) => {
  const rawConfig = navModulesConfig && navModulesConfig.length > 0 ? navModulesConfig : DEFAULT_NAV_MODULES;
  const baseConfig = rawConfig.some((m) => m.id === 'auditoria')
    ? rawConfig
    : [
        ...rawConfig,
        { id: 'auditoria', label: 'Auditoría y Trazabilidad', iconName: 'History', order: rawConfig.length + 1, enabled: true, parentModuleId: null }
      ];

  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const canReorder =
    currentUser.rol === 'superusuario' ||
    (!Boolean(currentUser.readOnly) && Boolean(currentUser.canAdminModules));

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
    // Auditoría y Trazabilidad is strictly exclusive to superusuario
    if (item.id === 'auditoria') {
      return currentUser.rol === 'superusuario';
    }
    // ONLY superusuario has blanket access to all modules without restrictions
    if (currentUser.rol === 'superusuario') return true;

    // Folder groups are containers: keep visible if user has access to any child or the folder itself
    if (item.isFolderGroup) {
      const hasChildAccess = baseConfig.some(
        (child) => child.parentModuleId === item.id && (currentUser.allowedModules || []).includes(child.id)
      );
      return hasChildAccess || (currentUser.allowedModules || []).includes(item.id);
    }

    if (item.id === 'modulos') {
      return canReorder;
    }

    return (currentUser.allowedModules || []).includes(item.id);
  });

  const getBadge = (id: string): number | null => {
    switch (id) {
      case 'tareas': return counts.tareas ?? null;
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

  const toggleFolder = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setCollapsedFolders((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Drag-and-drop reorder handlers for sidebar
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!canReorder) return;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (!canReorder || !draggedId || draggedId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(id);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!canReorder || !draggedId || draggedId === targetId || !onReorderModules) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const currentItems = [...baseConfig];
    const sourceIdx = currentItems.findIndex((it) => it.id === draggedId);
    const targetIdx = currentItems.findIndex((it) => it.id === targetId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      const [movedItem] = currentItems.splice(sourceIdx, 1);
      currentItems.splice(targetIdx, 0, movedItem);
      // Re-assign order indices
      const updated = currentItems.map((item, idx) => ({
        ...item,
        order: idx + 1
      }));
      onReorderModules(updated);
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
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
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {/* Unit Branding Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <img
                src={institutionalConfig.logoDataUrl || '/logo-sisdic.png'}
                alt="Escudo S.I.S.D.I.C."
                className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/30 bg-slate-950"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/logo-dgpc.png';
                }}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black tracking-wider text-white truncate">
                  {institutionalConfig.systemName || 'S.I.S.D.I.C.'}
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

          {/* Hierarchical Navigation: Módulos Principales, Carpetas de Guardias y Submódulos */}
          <nav className="p-3 space-y-1.5">
            {(() => {
              const mainModules = allowedItems.filter((item) => !item.parentModuleId);
              const orphanSubmodules = allowedItems.filter(
                (item) => item.parentModuleId && !mainModules.some((m) => m.id === item.parentModuleId)
              );

              return (
                <>
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>Módulos del Sistema</span>
                      {canReorder && (
                        <span className="text-[8px] text-blue-400 bg-blue-950/60 px-1 py-0.2 rounded border border-blue-900/60">
                          Arrastrable
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      {onOpenModuleAdmin && canReorder && (
                        <button
                          onClick={onOpenModuleAdmin}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                          title="Administrador Visual de Módulos (Crear Carpetas y Reordenar)"
                        >
                          <FolderTree className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      )}
                      <span className="text-[9px] font-mono text-slate-600 bg-slate-800/80 px-1.5 py-0.5 rounded">
                        {mainModules.length}
                      </span>
                    </div>
                  </div>

                  {/* Prominent Quick Access Button to Personalizar Módulos */}
                  {onOpenModuleAdmin && canReorder && (
                    <button
                      type="button"
                      onClick={onOpenModuleAdmin}
                      className="w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-bold text-amber-300 bg-amber-950/30 hover:bg-amber-900/50 border border-amber-600/40 transition-all shadow-xs group mb-2"
                      title="Administrador Visual de Módulos y Carpetas (Reordenar por arrastre, crear módulos principales estilo Guardias)"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderTree className="w-4 h-4 text-amber-400 group-hover:rotate-6 transition-transform shrink-0" />
                        <span className="truncate">Personalizar Módulos</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-900/80 text-amber-200 border border-amber-700/60 font-mono shrink-0">
                        Configurar
                      </span>
                    </button>
                  )}

                  {mainModules.map((item) => {
                    const Icon = ICON_MAP[item.id] || (item.isFolderGroup ? Folder : FileText);
                    const isActive = currentModule === item.id;
                    const badge = getBadge(item.id);
                    const submodules = allowedItems.filter((sub) => sub.parentModuleId === item.id);
                    const hasActiveChild = submodules.some((sub) => sub.id === currentModule);
                    const isCollapsed = collapsedFolders[item.id] === true;
                    const isDraggingThis = draggedId === item.id;
                    const isOverThis = dragOverId === item.id;

                    // Is this a folder/group or a module with submodules?
                    const isFolderStyle = item.isFolderGroup || submodules.length > 0;

                    return (
                      <div
                        key={item.id}
                        draggable={canReorder}
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onDragOver={(e) => handleDragOver(e, item.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, item.id)}
                        onDragEnd={handleDragEnd}
                        className={`space-y-1 transition-all duration-150 rounded-xl ${
                          isDraggingThis ? 'opacity-40 scale-95' : 'opacity-100'
                        } ${isOverThis ? 'ring-2 ring-blue-500 bg-blue-950/30' : ''}`}
                      >
                        {/* Folder Group Header or Main Module Header */}
                        {item.isFolderGroup ? (
                          // Accordion Folder (similar to reference image "Guardias")
                          <div
                            onClick={() => {
                              toggleFolder(item.id);
                              onSelectModule(item.id);
                            }}
                            className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all select-none ${
                              isActive || hasActiveChild
                                ? 'bg-slate-800 text-amber-300 border border-amber-500/30 shadow-xs'
                                : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {canReorder && (
                                <GripVertical className="w-3.5 h-3.5 text-slate-600 hover:text-slate-300 shrink-0 cursor-grab active:cursor-grabbing" />
                              )}
                              {isCollapsed ? (
                                <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                              ) : (
                                <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                              )}
                              <span className="truncate tracking-wide">{item.label}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40 font-bold">
                                {submodules.length}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => toggleFolder(item.id, e)}
                                className="p-0.5 text-slate-400 hover:text-white rounded"
                                title={isCollapsed ? 'Expandir' : 'Contraer'}
                              >
                                {isCollapsed ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                ) : (
                                  <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Standard Main Module Button
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                onSelectModule(item.id);
                                onClose();
                              }}
                              className={`flex-1 flex items-center justify-between py-2 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                                isActive
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : hasActiveChild
                                  ? 'bg-slate-800/90 text-blue-300 border border-blue-500/30'
                                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {canReorder && (
                                  <GripVertical className="w-3.5 h-3.5 text-slate-600 hover:text-slate-300 shrink-0 cursor-grab active:cursor-grabbing" />
                                )}
                                <Icon
                                  className={`w-4 h-4 shrink-0 ${
                                    isActive ? 'text-white' : hasActiveChild ? 'text-blue-400' : 'text-slate-400'
                                  }`}
                                />
                                <span className="truncate">{item.label}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {badge !== null && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                      isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
                                    }`}
                                  >
                                    {badge}
                                  </span>
                                )}
                                {submodules.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => toggleFolder(item.id, e)}
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono flex items-center gap-0.5 ${
                                      isActive || hasActiveChild
                                        ? 'bg-blue-500/30 text-blue-200'
                                        : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700'
                                    }`}
                                    title={`${submodules.length} submódulos - clic para contraer/expandir`}
                                  >
                                    <span>{submodules.length}</span>
                                    {isCollapsed ? (
                                      <ChevronDown className="w-3 h-3 ml-0.5" />
                                    ) : (
                                      <ChevronUp className="w-3 h-3 ml-0.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </button>
                          </div>
                        )}

                        {/* Submódulos Anidados (Collapsible Accordion) */}
                        {submodules.length > 0 && !isCollapsed && (
                          <div className="ml-3 pl-2.5 border-l-2 border-blue-500/30 space-y-0.5 my-1 bg-slate-950/40 rounded-r-xl py-1 pr-1 transition-all">
                            {submodules.map((sub) => {
                              const SubIcon = ICON_MAP[sub.id] || (sub.id.includes('report') ? FileText : ChevronRight);
                              const isSubActive = currentModule === sub.id;
                              const subBadge = getBadge(sub.id);

                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => {
                                    onSelectModule(sub.id);
                                    onClose();
                                  }}
                                  className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs transition-all ${
                                    isSubActive
                                      ? 'bg-sky-600 text-white font-bold shadow-xs'
                                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 font-medium'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[10px] text-sky-400/80 font-mono">├─</span>
                                    <SubIcon
                                      className={`w-3.5 h-3.5 shrink-0 ${
                                        isSubActive ? 'text-white' : 'text-slate-400'
                                      }`}
                                    />
                                    <span className="truncate text-[11px]">{sub.label}</span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[8px] uppercase tracking-wider px-1 py-0.2 bg-slate-800/80 text-slate-400 rounded">
                                      Sub
                                    </span>
                                    {subBadge !== null && (
                                      <span
                                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                                          isSubActive ? 'bg-sky-700 text-white' : 'bg-slate-800 text-slate-300'
                                        }`}
                                      >
                                        {subBadge}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Submódulos Huérfanos si existieran */}
                  {orphanSubmodules.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <div className="px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                        Otros Submódulos
                      </div>
                      {orphanSubmodules.map((sub) => {
                        const SubIcon = ICON_MAP[sub.id] || FileText;
                        const isSubActive = currentModule === sub.id;
                        const subBadge = getBadge(sub.id);

                        return (
                          <button
                            key={sub.id}
                            onClick={() => {
                              onSelectModule(sub.id);
                              onClose();
                            }}
                            className={`w-full flex items-center justify-between py-1.5 px-3 rounded-lg text-xs transition-all ${
                              isSubActive
                                ? 'bg-blue-600 text-white font-bold'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <SubIcon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate text-[11px]">{sub.label}</span>
                            </div>
                            {subBadge !== null && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                                {subBadge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
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

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80 gap-2">
            <span className="truncate">Usuario: <strong className="text-slate-300">{currentUser.username}</strong></span>
            <div className="flex items-center gap-1.5 shrink-0">
              {Boolean(currentUser.readOnly) && currentUser.rol !== 'superusuario' && (
                <span className="text-[9px] font-bold uppercase text-amber-300 bg-amber-950/70 border border-amber-700/50 px-1.5 py-0.2 rounded">
                  Lectura
                </span>
              )}
              <span className="text-blue-400 font-semibold">{currentUser.rol}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
