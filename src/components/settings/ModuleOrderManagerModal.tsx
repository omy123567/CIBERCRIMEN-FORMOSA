import React, { useState, useEffect } from 'react';
import {
  X,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  Layers,
  Check,
  FolderTree,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import { NavModuleItem } from '../../types/sgp';

export const DEFAULT_NAV_MODULES: NavModuleItem[] = [
  { id: 'dashboard', label: 'Dashboard Ejecutivo', iconName: 'BarChart3', order: 1, enabled: true, parentModuleId: null },
  { id: 'expedientes', label: 'Expedientes & Evidencias', iconName: 'FileText', order: 2, enabled: true, parentModuleId: null },
  { id: 'ppi', label: 'Causas PPI (Policial)', iconName: 'ShieldAlert', order: 3, enabled: true, parentModuleId: 'expedientes' },
  { id: 'personas', label: 'Personas (Evidencias)', iconName: 'UserCheck', order: 4, enabled: true, parentModuleId: 'expedientes' },
  { id: 'numerario', label: 'Numerario & Folios', iconName: 'Hash', order: 5, enabled: true, parentModuleId: null },
  { id: 'personal', label: 'Personal & Legajos', iconName: 'Users', order: 6, enabled: true, parentModuleId: null },
  { id: 'licencias', label: 'Licencias & Cuatrienio', iconName: 'Calendar', order: 7, enabled: true, parentModuleId: 'personal' },
  { id: 'moviles', label: 'Parque Automotor', iconName: 'Car', order: 8, enabled: true, parentModuleId: null },
  { id: 'recargos', label: 'Recargos de Servicio', iconName: 'Clock', order: 9, enabled: true, parentModuleId: null },
  { id: 'charlas', label: 'Charlas y Prevención', iconName: 'BookOpen', order: 10, enabled: true, parentModuleId: null },
  { id: 'membrete', label: 'Membrete Oficial', iconName: 'Shield', order: 11, enabled: true, parentModuleId: null },
  { id: 'catalogos', label: 'Catálogos Dinámicos', iconName: 'Settings', order: 12, enabled: true, parentModuleId: null },
  { id: 'respaldos', label: 'Respaldos & Depuración por Período', iconName: 'Archive', order: 13, enabled: true, parentModuleId: null },
  { id: 'usuarios', label: 'Gestión de Usuarios y Roles', iconName: 'Users', order: 14, enabled: true, parentModuleId: null }
];

interface ModuleOrderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveModules: (modules: NavModuleItem[]) => void;
  currentModules: NavModuleItem[];
}

export const ModuleOrderManagerModal: React.FC<ModuleOrderManagerModalProps> = ({
  isOpen,
  onClose,
  onSaveModules,
  currentModules
}) => {
  const [items, setItems] = useState<NavModuleItem[]>(currentModules.length > 0 ? currentModules : DEFAULT_NAV_MODULES);

  useEffect(() => {
    if (currentModules.length > 0) {
      setItems(currentModules);
    }
  }, [currentModules]);

  if (!isOpen) return null;

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // reindex order
    const updated = newItems.map((item, idx) => ({ ...item, order: idx + 1 }));
    setItems(updated);
  };

  const toggleEnabled = (id: string) => {
    setItems(prev =>
      prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item)
    );
  };

  const setParent = (id: string, parentId: string | null) => {
    setItems(prev =>
      prev.map(item => item.id === id ? { ...item, parentModuleId: parentId || null } : item)
    );
  };

  const handleResetDefaults = () => {
    if (confirm('¿Restablecer orden y agrupación por defecto?')) {
      setItems(DEFAULT_NAV_MODULES);
    }
  };

  const handleSave = () => {
    onSaveModules(items);
    onClose();
  };

  // Potential parent modules (modules that are not submodules themselves)
  const potentialParents = items.filter(i => !i.parentModuleId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 text-blue-600 rounded-xl">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Administrador de Módulos y Submódulos
              </h3>
              <p className="text-xs text-slate-500">
                Ordene los módulos de navegación, oculte módulos o anídelos como submódulos secundarios.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modules List */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {items.map((item, index) => {
            const isSubmodule = !!item.parentModuleId;
            const parentName = items.find(p => p.id === item.parentModuleId)?.label;

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isSubmodule
                    ? 'ml-6 bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                    : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono font-bold text-slate-400 w-5">
                    {index + 1}.
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.label}
                      </span>
                      {isSubmodule && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                          ↳ Submódulo de: {parentName || item.parentModuleId}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">ID: {item.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Submodule Dropdown */}
                  <select
                    value={item.parentModuleId || ''}
                    onChange={(e) => setParent(item.id, e.target.value || null)}
                    className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200"
                  >
                    <option value="">(Módulo Principal)</option>
                    {potentialParents
                      .filter(p => p.id !== item.id)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          Submódulo de: {p.label}
                        </option>
                      ))}
                  </select>

                  {/* Move Up */}
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveItem(index, 'up')}
                    className="p-1 text-slate-500 hover:text-blue-600 disabled:opacity-30 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                    title="Subir orden"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 'down')}
                    className="p-1 text-slate-500 hover:text-blue-600 disabled:opacity-30 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                    title="Bajar orden"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  {/* Toggle Visibility */}
                  <button
                    type="button"
                    onClick={() => toggleEnabled(item.id)}
                    className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                      item.enabled
                        ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 line-through'
                    }`}
                    title={item.enabled ? 'Módulo visible' : 'Módulo oculto'}
                  >
                    {item.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Orden por Defecto</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
            >
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
