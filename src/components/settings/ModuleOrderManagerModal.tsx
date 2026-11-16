import React, { useState, useEffect } from 'react';
import {
  X,
  FolderTree,
  ArrowUp,
  ArrowDown,
  Layers,
  Check,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  BarChart3,
  FileText,
  ShieldAlert,
  UserCheck,
  Hash,
  Users,
  Calendar,
  Car,
  Clock,
  BookOpen,
  Shield,
  Settings,
  Archive,
  ClipboardCheck,
  GripVertical,
  CheckCircle2,
  ChevronRight,
  Sliders,
  PanelLeft,
  LayoutGrid,
  Folder,
  Plus,
  Trash2,
  FolderPlus,
  Edit3,
  History
} from 'lucide-react';
import { NavModuleItem } from '../../types/sgp';

export const DEFAULT_NAV_MODULES: NavModuleItem[] = [
  { id: 'dashboard', label: 'Dashboard Ejecutivo', iconName: 'BarChart3', order: 1, enabled: true, parentModuleId: null },
  { id: 'tareas', label: 'Tareas Realizadas', iconName: 'ClipboardCheck', order: 2, enabled: true, parentModuleId: null },
  { id: 'expedientes', label: 'Expedientes & Evidencias', iconName: 'FileText', order: 3, enabled: true, parentModuleId: null },
  { id: 'ppi', label: 'Causas PPI (Policial)', iconName: 'ShieldAlert', order: 4, enabled: true, parentModuleId: 'expedientes' },
  { id: 'personas', label: 'Personas (Evidencias)', iconName: 'UserCheck', order: 5, enabled: true, parentModuleId: 'expedientes' },
  { id: 'numerario', label: 'Numerario & Folios', iconName: 'Hash', order: 6, enabled: true, parentModuleId: null },
  { id: 'personal', label: 'Personal & Legajos', iconName: 'Users', order: 7, enabled: true, parentModuleId: null },
  { id: 'licencias', label: 'Licencias & Cuatrienio', iconName: 'Calendar', order: 8, enabled: true, parentModuleId: 'personal' },
  { id: 'moviles', label: 'Parque Automotor', iconName: 'Car', order: 9, enabled: true, parentModuleId: null },
  { id: 'recargos', label: 'Recargos de Servicio', iconName: 'Clock', order: 10, enabled: true, parentModuleId: null },
  { id: 'charlas', label: 'Charlas y Prevención', iconName: 'BookOpen', order: 11, enabled: true, parentModuleId: null },
  { id: 'membrete', label: 'Membrete Oficial', iconName: 'Shield', order: 12, enabled: true, parentModuleId: null },
  { id: 'catalogos', label: 'Catálogos Dinámicos', iconName: 'Settings', order: 13, enabled: true, parentModuleId: null },
  { id: 'respaldos', label: 'Respaldos & Depuración por Período', iconName: 'Archive', order: 14, enabled: true, parentModuleId: null },
  { id: 'usuarios', label: 'Gestión de Usuarios y Roles', iconName: 'Users', order: 15, enabled: true, parentModuleId: null },
  { id: 'auditoria', label: 'Auditoría y Trazabilidad', iconName: 'History', order: 16, enabled: true, parentModuleId: null }
];

const MODULE_ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  dashboard: BarChart3,
  tareas: ClipboardCheck,
  expedientes: FileText,
  ppi: ShieldAlert,
  personas: UserCheck,
  numerario: Hash,
  personal: Users,
  licencias: Calendar,
  moviles: Car,
  recargos: Clock,
  charlas: BookOpen,
  membrete: Shield,
  catalogos: Settings,
  respaldos: Archive,
  usuarios: Users,
  auditoria: History,
  History: History,
  Folder: Folder,
  FolderTree: FolderTree,
  FolderPlus: FolderPlus,
  FileText: FileText,
  BookOpen: BookOpen,
  ChevronRight: ChevronRight,
  UserCheck: UserCheck,
  ShieldAlert: ShieldAlert,
  ClipboardCheck: ClipboardCheck,
  BarChart3: BarChart3,
  Calendar: Calendar,
  Car: Car,
  Clock: Clock,
  Shield: Shield,
  Settings: Settings,
  Archive: Archive,
  Hash: Hash,
  Users: Users,
  Layers: Layers
};

export function getNavModuleIcon(item: NavModuleItem): React.FC<{ className?: string }> {
  if (item.isFolderGroup) return Folder;
  if (item.iconName && MODULE_ICON_MAP[item.iconName]) return MODULE_ICON_MAP[item.iconName];
  if (MODULE_ICON_MAP[item.id]) return MODULE_ICON_MAP[item.id];
  return Folder;
}

const MODULE_COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  dashboard: { bg: 'bg-blue-600/15', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-500/20' },
  tareas: { bg: 'bg-teal-600/15', text: 'text-teal-600 dark:text-teal-400', ring: 'ring-teal-500/20' },
  expedientes: { bg: 'bg-indigo-600/15', text: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-500/20' },
  ppi: { bg: 'bg-sky-600/15', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-500/20' },
  personas: { bg: 'bg-cyan-600/15', text: 'text-cyan-600 dark:text-cyan-400', ring: 'ring-cyan-500/20' },
  numerario: { bg: 'bg-purple-600/15', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-500/20' },
  personal: { bg: 'bg-emerald-600/15', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/20' },
  licencias: { bg: 'bg-green-600/15', text: 'text-green-600 dark:text-green-400', ring: 'ring-green-500/20' },
  moviles: { bg: 'bg-amber-600/15', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/20' },
  recargos: { bg: 'bg-orange-600/15', text: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-500/20' },
  charlas: { bg: 'bg-rose-600/15', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-500/20' },
  membrete: { bg: 'bg-slate-600/15', text: 'text-slate-600 dark:text-slate-400', ring: 'ring-slate-500/20' },
  catalogos: { bg: 'bg-violet-600/15', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-500/20' },
  respaldos: { bg: 'bg-fuchsia-600/15', text: 'text-fuchsia-600 dark:text-fuchsia-400', ring: 'ring-fuchsia-500/20' },
  usuarios: { bg: 'bg-pink-600/15', text: 'text-pink-600 dark:text-pink-400', ring: 'ring-pink-500/20' },
  auditoria: { bg: 'bg-purple-600/15', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-500/20' }
};

interface ModuleOrderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveModules: (modules: NavModuleItem[]) => void;
  currentModules: NavModuleItem[];
  isSuperuser?: boolean;
}

const ensureBuiltInModules = (source: NavModuleItem[]): NavModuleItem[] => {
  const base = source.length > 0 ? [...source] : [...DEFAULT_NAV_MODULES];
  if (!base.some(m => m.id === 'tareas')) {
    base.splice(1, 0, { id: 'tareas', label: 'Tareas Realizadas', iconName: 'ClipboardCheck', order: 2, enabled: true, parentModuleId: null });
  }
  if (!base.some(m => m.id === 'auditoria')) {
    base.push({ id: 'auditoria', label: 'Auditoría y Trazabilidad', iconName: 'History', order: base.length + 1, enabled: true, parentModuleId: null });
  }
  return base.map((m, idx) => ({ ...m, order: idx + 1 }));
};

export const ModuleOrderManagerModal: React.FC<ModuleOrderManagerModalProps> = ({
  isOpen,
  onClose,
  onSaveModules,
  currentModules,
  isSuperuser = false
}) => {
  const [items, setItems] = useState<NavModuleItem[]>(() => ensureBuiltInModules(currentModules));

  const [activeTabFilter, setActiveTabFilter] = useState<'ALL' | 'MAIN' | 'SUB' | 'HIDDEN'>('ALL');
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState('');

  // Drag and Drop reordering state - UNCONDITIONAL HOOKS
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // State for Creating / Editing Custom Main Module Folder Group - UNCONDITIONAL HOOKS
  const [isFolderCreatorOpen, setIsFolderCreatorOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderIconName, setFolderIconName] = useState('Folder');
  const [folderColor, setFolderColor] = useState('amber');
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

  // State for Creating Custom Submodule - UNCONDITIONAL HOOKS
  const [isSubmoduleCreatorOpen, setIsSubmoduleCreatorOpen] = useState(false);
  const [submoduleName, setSubmoduleName] = useState('');
  const [submoduleParentId, setSubmoduleParentId] = useState<string>('');
  const [submoduleIcon, setSubmoduleIcon] = useState('FileText');

  useEffect(() => {
    if (currentModules.length > 0) {
      setItems(ensureBuiltInModules(currentModules));
    }
  }, [currentModules]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const updated = newItems.map((item, idx) => ({ ...item, order: idx + 1 }));
    setItems(updated);
  };

  const toggleEnabled = (id: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const setParent = (id: string, parentId: string | null) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, parentModuleId: parentId || null } : item))
    );
  };

  const startRename = (item: NavModuleItem) => {
    setEditingLabelId(item.id);
    setTempLabel(item.label);
  };

  const saveRename = (id: string) => {
    if (tempLabel.trim()) {
      setItems(prev =>
        prev.map(item => (item.id === id ? { ...item, label: tempLabel.trim() } : item))
      );
    }
    setEditingLabelId(null);
  };

  const handleResetDefaults = () => {
    if (window.confirm('¿Restablecer orden, visibilidad y agrupación oficial por defecto?')) {
      setItems(DEFAULT_NAV_MODULES);
    }
  };

  const handleSave = () => {
    onSaveModules(items);
    onClose();
  };

  const moveItemToPosition = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) return;
    const newItems = [...items];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    setItems(newItems.map((item, idx) => ({ ...item, order: idx + 1 })));
  };

  const openCreateFolder = () => {
    setEditingFolderId(null);
    setFolderName('');
    setFolderIconName('Folder');
    setFolderColor('amber');
    setSelectedChildIds([]);
    setIsFolderCreatorOpen(true);
  };

  const openEditFolder = (folderItem: NavModuleItem) => {
    setEditingFolderId(folderItem.id);
    setFolderName(folderItem.label);
    setFolderIconName(folderItem.iconName || 'Folder');
    setFolderColor(folderItem.folderColor || 'amber');
    setSelectedChildIds(items.filter(i => i.parentModuleId === folderItem.id).map(i => i.id));
    setIsFolderCreatorOpen(true);
  };

  const handleSaveCustomFolder = () => {
    if (!folderName.trim()) return;

    if (editingFolderId) {
      setItems(prev => prev.map(item => {
        if (item.id === editingFolderId) {
          return {
            ...item,
            label: folderName.trim(),
            iconName: folderIconName,
            folderColor: folderColor,
            isFolderGroup: true
          };
        }
        if (item.parentModuleId === editingFolderId && !selectedChildIds.includes(item.id)) {
          return { ...item, parentModuleId: null };
        }
        if (selectedChildIds.includes(item.id)) {
          return { ...item, parentModuleId: editingFolderId };
        }
        return item;
      }));
    } else {
      const folderId = `folder_${Date.now()}`;
      const newFolder: NavModuleItem = {
        id: folderId,
        label: folderName.trim(),
        iconName: folderIconName,
        order: 1,
        enabled: true,
        parentModuleId: null,
        isFolderGroup: true,
        folderColor: folderColor
      };

      setItems(prev => {
        const updatedChildren = prev.map(item => {
          if (selectedChildIds.includes(item.id)) {
            return { ...item, parentModuleId: folderId };
          }
          return item;
        });
        const all = [newFolder, ...updatedChildren];
        return all.map((it, idx) => ({ ...it, order: idx + 1 }));
      });
    }

    setIsFolderCreatorOpen(false);
    setFolderName('');
    setSelectedChildIds([]);
    setEditingFolderId(null);
  };

  const handleSaveCustomSubmodule = () => {
    if (!submoduleName.trim()) return;
    const subId = `custom_sub_${Date.now()}`;
    const newSub: NavModuleItem = {
      id: subId,
      label: submoduleName.trim(),
      iconName: submoduleIcon,
      order: items.length + 1,
      enabled: true,
      parentModuleId: submoduleParentId || null
    };

    setItems(prev => [...prev, newSub].map((it, idx) => ({ ...it, order: idx + 1 })));
    setIsSubmoduleCreatorOpen(false);
    setSubmoduleName('');
    setSubmoduleParentId('');
  };

  // Preset Template: Grupo Guardias (matches image_f7377171.png)
  const handleCreateGuardiasPreset = () => {
    const existing = items.find(it => it.label.toLowerCase() === 'guardias' && it.isFolderGroup);
    if (existing) {
      alert('La carpeta principal "Guardias" ya existe en el menú.');
      return;
    }
    const folderId = `folder_guardias_${Date.now()}`;
    const guardiasFolder: NavModuleItem = {
      id: folderId,
      label: 'Guardias',
      iconName: 'Folder',
      order: 1,
      enabled: true,
      parentModuleId: null,
      isFolderGroup: true,
      folderColor: 'amber'
    };
    const submodules: NavModuleItem[] = [
      { id: `guardias_carga_${Date.now()}`, label: 'Carga de Guardias', iconName: 'BookOpen', order: 2, enabled: true, parentModuleId: folderId },
      { id: `guardias_ctrl_op_${Date.now() + 1}`, label: 'Control Operativos', iconName: 'ChevronRight', order: 3, enabled: true, parentModuleId: folderId },
      { id: `guardias_rep_op_${Date.now() + 2}`, label: 'Reporte Control Operativos', iconName: 'FileText', order: 4, enabled: true, parentModuleId: folderId },
      { id: `guardias_pers_op_${Date.now() + 3}`, label: 'Detalle Personal Control Operativos', iconName: 'UserCheck', order: 5, enabled: true, parentModuleId: folderId },
      { id: `guardias_pers_g_${Date.now() + 4}`, label: 'Detalle Personal - Guardias', iconName: 'FileText', order: 6, enabled: true, parentModuleId: folderId }
    ];

    setItems(prev => [guardiasFolder, ...submodules, ...prev].map((it, idx) => ({ ...it, order: idx + 1 })));
  };

  const handleDeleteCustomFolder = (folderId: string) => {
    if (!window.confirm('¿Eliminar este módulo principal / carpeta? Los módulos contenidos volverán a estar en la raíz principal.')) return;
    setItems(prev =>
      prev
        .filter(item => item.id !== folderId)
        .map(item => item.parentModuleId === folderId ? { ...item, parentModuleId: null } : item)
        .map((item, idx) => ({ ...item, order: idx + 1 }))
    );
  };

  const visibleItems = items.filter(i => isSuperuser || i.id !== 'auditoria');

  // Metrics
  const totalCount = visibleItems.length;
  const mainCount = visibleItems.filter(i => !i.parentModuleId).length;
  const subCount = visibleItems.filter(i => !!i.parentModuleId).length;
  const hiddenCount = visibleItems.filter(i => !i.enabled).length;

  // Potential parents (modules that are not submodules)
  const potentialParents = visibleItems.filter(i => !i.parentModuleId);

  // Filtered items for editor list
  const filteredItems = visibleItems.filter(item => {
    if (activeTabFilter === 'MAIN') return !item.parentModuleId;
    if (activeTabFilter === 'SUB') return !!item.parentModuleId;
    if (activeTabFilter === 'HIDDEN') return !item.enabled;
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full p-5 sm:p-7 shadow-2xl space-y-6 my-4 max-h-[95vh] flex flex-col">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-md ring-2 ring-blue-500/20">
              <FolderTree className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Administrador Visual de Módulos y Submódulos
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  Interactivo
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Organice visualmente el orden de navegación, jerarquice submódulos y personalice la barra lateral.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={handleCreateGuardiasPreset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-800 rounded-xl shadow-xs transition-all active:scale-95"
              title="Generar automáticamente el grupo 'Guardias' con sus 5 submódulos (Carga de Guardias, Control Operativos, etc.)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>+ Grupo Guardias</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSubmoduleCreatorOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl shadow-xs transition-all active:scale-95"
              title="Crear un nuevo submódulo individual"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nuevo Submódulo</span>
            </button>
            <button
              type="button"
              onClick={openCreateFolder}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-all active:scale-95"
              title="Crear un nuevo módulo principal o carpeta contenedora de submódulos"
            >
              <FolderPlus className="w-4 h-4" />
              <span>+ Nueva Carpeta / Principal</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer / Creator Form for Custom Main Module / Folder Group */}
        {isFolderCreatorOpen && (
          <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-blue-200 dark:border-blue-900/60 pb-2">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {editingFolderId ? 'Editar Módulo Principal / Carpeta' : 'Crear Nuevo Módulo Principal Personalizable'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsFolderCreatorOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Nombre Personalizable */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre Personalizable del Módulo Principal *
                </label>
                <input
                  type="text"
                  required
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="ej. Guardias, Operaciones, Mando Judicial..."
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Color de Resalte
                </label>
                <select
                  value={folderColor}
                  onChange={(e) => setFolderColor(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="amber">Ámbar / Dorado</option>
                  <option value="blue">Azul Policial</option>
                  <option value="indigo">Índigo</option>
                  <option value="emerald">Verde Esmeralda</option>
                  <option value="purple">Púrpura</option>
                  <option value="rose">Rosa / Carmín</option>
                  <option value="teal">Verde Azulado</option>
                  <option value="sky">Celeste Cielo</option>
                </select>
              </div>
            </div>

            {/* Selector de qué módulos estarán dentro de este módulo principal */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Seleccionar qué módulos estarán dentro de este módulo principal:
              </label>
              <p className="text-[11px] text-slate-500">
                Marque las casillas de los módulos que se ubicarán como submódulos dentro de esta carpeta (estilo acordeón desplegable):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1 max-h-40 overflow-y-auto p-1 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                {visibleItems
                  .filter((it) => it.id !== editingFolderId)
                  .map((it) => {
                    const isChecked = selectedChildIds.includes(it.id);
                    return (
                      <label
                        key={it.id}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                          isChecked
                            ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-400 text-blue-900 dark:text-blue-200 font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedChildIds((prev) => [...prev, it.id]);
                            } else {
                              setSelectedChildIds((prev) => prev.filter((id) => id !== it.id));
                            }
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="truncate text-[11px]">{it.label}</span>
                      </label>
                    );
                  })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsFolderCreatorOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCustomFolder}
                disabled={!folderName.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs"
              >
                {editingFolderId ? 'Guardar Cambios de Carpeta' : 'Crear Módulo Principal'}
              </button>
            </div>
          </div>
        )}

        {/* Drawer / Creator Form for Custom Submodule */}
        {isSubmoduleCreatorOpen && (
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-indigo-200 dark:border-indigo-900/60 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Crear Nuevo Submódulo Personalizado
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmoduleCreatorOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre del Submódulo *
                </label>
                <input
                  type="text"
                  required
                  value={submoduleName}
                  onChange={(e) => setSubmoduleName(e.target.value)}
                  placeholder="ej. Carga de Guardias, Control de Accesos, Novedades..."
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Módulo o Carpeta Padre
                </label>
                <select
                  value={submoduleParentId}
                  onChange={(e) => setSubmoduleParentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="">(Sin carpeta / Raíz)</option>
                  {items
                    .filter((it) => it.isFolderGroup || !it.parentModuleId)
                    .map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.label} {it.isFolderGroup ? '(Carpeta)' : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsSubmoduleCreatorOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCustomSubmodule}
                disabled={!submoduleName.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs"
              >
                Crear Submódulo
              </button>
            </div>
          </div>
        )}

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Módulos</span>
              <span className="text-base font-black text-slate-900 dark:text-white">{totalCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <PanelLeft className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Módulos Raíz</span>
              <span className="text-base font-black text-slate-900 dark:text-white">{mainCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Submódulos Anidados</span>
              <span className="text-base font-black text-slate-900 dark:text-white">{subCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
              <EyeOff className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Ocultos</span>
              <span className="text-base font-black text-slate-900 dark:text-white">{hiddenCount}</span>
            </div>
          </div>
        </div>

        {/* Dual Pane Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 overflow-hidden">
          
          {/* Left Column: Visual Module List & Reorder Controls */}
          <div className="lg:col-span-7 flex flex-col min-h-0 space-y-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setActiveTabFilter('ALL')}
                className={`flex-1 py-1 px-2.5 rounded-lg font-bold transition-all ${
                  activeTabFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Todos ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTabFilter('MAIN')}
                className={`flex-1 py-1 px-2.5 rounded-lg font-bold transition-all ${
                  activeTabFilter === 'MAIN'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Principales ({mainCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTabFilter('SUB')}
                className={`flex-1 py-1 px-2.5 rounded-lg font-bold transition-all ${
                  activeTabFilter === 'SUB'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Submódulos ({subCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTabFilter('HIDDEN')}
                className={`flex-1 py-1 px-2.5 rounded-lg font-bold transition-all ${
                  activeTabFilter === 'HIDDEN'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Ocultos ({hiddenCount})
              </button>
            </div>

            {/* Scrollable Module Cards */}
            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
              {filteredItems.map((item) => {
                const globalIndex = items.findIndex(i => i.id === item.id);
                const isSubmodule = !!item.parentModuleId;
                const parentItem = items.find(p => p.id === item.parentModuleId);
                const IconComponent = MODULE_ICON_MAP[item.id] || FolderTree;
                const colorConfig = MODULE_COLOR_MAP[item.id] || { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-300' };

                return (
                  <div
                    key={item.id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(globalIndex));
                      setDraggedItemIndex(globalIndex);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverIndex !== globalIndex) setDragOverIndex(globalIndex);
                    }}
                    onDragLeave={() => {
                      if (dragOverIndex === globalIndex) setDragOverIndex(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedItemIndex !== null && draggedItemIndex !== globalIndex) {
                        moveItemToPosition(draggedItemIndex, globalIndex);
                      }
                      setDraggedItemIndex(null);
                      setDragOverIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggedItemIndex(null);
                      setDragOverIndex(null);
                    }}
                    className={`p-3 rounded-2xl border transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
                      draggedItemIndex === globalIndex
                        ? 'opacity-30 scale-95 border-blue-500'
                        : dragOverIndex === globalIndex
                        ? 'border-2 border-blue-500 bg-blue-50/20 dark:bg-blue-950/30 scale-[1.01]'
                        : !item.enabled
                        ? 'opacity-50 bg-slate-50 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800'
                        : item.isFolderGroup
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-sm ring-1 ring-amber-500/20'
                        : isSubmodule
                        ? 'ml-4 bg-slate-50/80 dark:bg-slate-800/40 border-l-4 border-l-blue-500 border-slate-200 dark:border-slate-800 shadow-xs'
                        : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      
                      {/* Left: Drag Handle, Icon, and Label */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex items-center gap-1 shrink-0 text-slate-400 hover:text-slate-600">
                          <GripVertical className="w-4 h-4 cursor-grab" />
                          <span className="font-mono text-xs font-black text-slate-400 dark:text-slate-500 w-6">
                            #{globalIndex + 1}
                          </span>
                        </div>

                        {/* Module Icon in Pill */}
                        <div className={`p-2.5 rounded-xl shrink-0 ring-1 ${colorConfig.bg} ${colorConfig.text} ${colorConfig.ring}`}>
                          {item.isFolderGroup ? (
                            <Folder className="w-4 h-4 text-amber-500" />
                          ) : (
                            <IconComponent className="w-4 h-4" />
                          )}
                        </div>

                        {/* Module Name & Hierarchy info */}
                        <div className="min-w-0 flex-1">
                          {editingLabelId === item.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={tempLabel}
                                onChange={(e) => setTempLabel(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveRename(item.id)}
                                autoFocus
                                className="px-2 py-0.5 text-xs font-bold rounded-lg border border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-full"
                              />
                              <button
                                type="button"
                                onClick={() => saveRename(item.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                onClick={() => startRename(item)}
                                title="Haga clic para renombrar"
                                className="text-xs font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:underline"
                              >
                                {item.label}
                              </span>
                              {item.isFolderGroup && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 shrink-0 flex items-center gap-1">
                                  <Folder className="w-3 h-3" />
                                  <span>Carpeta Principal ({items.filter(i => i.parentModuleId === item.id).length} submódulos)</span>
                                </span>
                              )}
                              {isSubmodule && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shrink-0">
                                  ↳ de: {parentItem?.label || item.parentModuleId}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>ID: <code className="font-mono">{item.id}</code></span>
                            <span>•</span>
                            <span>{item.isFolderGroup ? 'Grupo Contenedor' : isSubmodule ? 'Submódulo' : 'Módulo Principal'}</span>
                            <span>•</span>
                            <span className="text-blue-500 font-semibold">Arrastre para ordenar</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.isFolderGroup ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditFolder(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                              title="Editar nombre, ícono o submódulos contenidos"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomFolder(item.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition-colors"
                              title="Eliminar esta carpeta (los submódulos volverán a la raíz)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          /* Parent Selector */
                          <select
                            value={item.parentModuleId || ''}
                            onChange={(e) => setParent(item.id, e.target.value || null)}
                            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
                            title="Cambiar pertenencia jerárquica"
                          >
                            <option value="">(Raíz / Principal)</option>
                            {potentialParents
                              .filter(p => p.id !== item.id)
                              .map(p => (
                                <option key={p.id} value={p.id}>
                                  ↳ Submódulo de: {p.label}
                                </option>
                              ))}
                          </select>
                        )}

                        {/* Move Up Button */}
                        <button
                          type="button"
                          disabled={globalIndex === 0}
                          onClick={() => moveItem(globalIndex, 'up')}
                          className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-20 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Subir de posición en el menú"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>

                        {/* Move Down Button */}
                        <button
                          type="button"
                          disabled={globalIndex === items.length - 1}
                          onClick={() => moveItem(globalIndex, 'down')}
                          className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-20 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Bajar de posición en el menú"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>

                        {/* Visibility Toggle Button */}
                        <button
                          type="button"
                          onClick={() => toggleEnabled(item.id)}
                          className={`p-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                            item.enabled
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 ring-1 ring-emerald-500/20'
                              : 'text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'
                          }`}
                          title={item.enabled ? 'Módulo activo y visible en el menú' : 'Módulo deshabilitado / oculto'}
                        >
                          {item.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Interactive Sidebar Preview */}
          <div className="lg:col-span-5 flex flex-col min-h-0 bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <PanelLeft className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Vista Previa en Vivo del Menú
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                S.I.S.D.I.C. Sidebar
              </span>
            </div>

            <div className="mt-3 overflow-y-auto pr-1 flex-1 space-y-1.5 font-sans">
              {(() => {
                const activeItems = visibleItems.filter(i => i.enabled);
                const mainItems = activeItems.filter(i => !i.parentModuleId);

                return mainItems.map(main => {
                  const submodules = activeItems.filter(i => i.parentModuleId === main.id);
                  const IconComp = MODULE_ICON_MAP[main.id] || FolderTree;
                  const color = MODULE_COLOR_MAP[main.id] || { text: 'text-blue-400' };

                  return (
                    <div key={main.id} className="space-y-1">
                      {/* Main Item */}
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-white text-xs font-semibold">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <IconComp className={`w-4 h-4 ${color.text}`} />
                          <span className="truncate">{main.label}</span>
                        </div>
                        {submodules.length > 0 && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 font-bold">
                            {submodules.length} sub
                          </span>
                        )}
                      </div>

                      {/* Submodules Nesting */}
                      {submodules.length > 0 && (
                        <div className="ml-4 pl-3 border-l-2 border-slate-800 space-y-1">
                          {submodules.map(sub => {
                            const SubIcon = MODULE_ICON_MAP[sub.id] || ChevronRight;
                            return (
                              <div
                                key={sub.id}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/60 text-slate-400 hover:text-slate-200 text-[11px]"
                              >
                                <span className="text-slate-600">↳</span>
                                <SubIcon className="w-3.5 h-3.5 text-slate-500" />
                                <span className="truncate">{sub.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
              <span>Cambios reflejados al instante</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>

        </div>

        {/* Footer Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Menú por Defecto</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Guardar y Aplicar al Sistema</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
