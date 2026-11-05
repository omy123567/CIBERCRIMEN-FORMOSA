import React, { useState, useMemo } from 'react';
import { Settings, Plus, Trash2, Tag, Shield, Search, Filter } from 'lucide-react';
import { DynamicCatalog, InstitutionalConfig } from '../../types/sgp';
import { sgpManager, db } from '../../db/dexieDb';
import { MembreteEditorModule } from './MembreteEditorModule';

interface CatalogsModuleProps {
  catalogs: DynamicCatalog[];
  institutionalConfig: InstitutionalConfig;
  delegacionId?: number;
  onNavigate?: (module: string) => void;
  onRefresh: () => void;
}

const REQUIRED_CATEGORIES = [
  'Juzgado',
  'Dependencias',
  'Requerimiento',
  'Oficio',
  'Jerarquias',
  'Grupos',
  'Tipos de Recargo',
  'Tarea Realizada',
  'Localidades',
  'Arma Marcas',
  'Arma Modelo',
  'Chaleco Tallas',
  'Tipo Movil',
  'Marca Movil',
  'Modelo Movil',
  'Aseguradoras'
];

export const CatalogsModule: React.FC<CatalogsModuleProps> = ({
  catalogs,
  institutionalConfig,
  delegacionId,
  onNavigate,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'catalogos' | 'membrete'>('catalogos');
  const [activeCategory, setActiveCategory] = useState<string>('Juzgado');
  const [newValue, setNewValue] = useState('');
  const [searchItem, setSearchItem] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  // Active Category Items filtered by search
  const allCategoryItems = useMemo(() => {
    return catalogs.filter((c) => c.category === activeCategory);
  }, [catalogs, activeCategory]);

  const items = useMemo(() => {
    if (!searchItem.trim()) return allCategoryItems;
    const q = searchItem.toLowerCase().trim();
    return allCategoryItems.filter((c) => c.value.toLowerCase().includes(q));
  }, [allCategoryItems, searchItem]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;

    // Save as globally shared catalog item
    await db.dynamicCatalogs.add({
      category: activeCategory,
      value: newValue.trim()
    });

    setNewValue('');
    sgpManager.notify();
    onRefresh();
  };

  const handleDeleteItem = async (id?: number) => {
    if (!id) return;
    await db.dynamicCatalogs.delete(id);
    sgpManager.notify();
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            <span>Configuración & Catálogos Dinámicos</span>
          </h1>
          <p className="text-xs text-slate-500">
            Gestión de las 16 categorías de catálogos dinámicos y acceso al membrete institucional oficial
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('catalogos')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'catalogos'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Catálogos Dinámicos</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('membrete')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'membrete'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Membrete Oficial (Apartado Completo)</span>
          </button>
        </div>
      </div>

      {activeTab === 'membrete' ? (
        <MembreteEditorModule
          institutionalConfig={institutionalConfig}
          onRefresh={onRefresh}
        />
      ) : (
        /* Full-Width Dynamic Catalogs Editor */
        <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Catálogos Dinámicos ({REQUIRED_CATEGORIES.length} Categorías Operativas)
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    🌍 Compartido con Todos los Usuarios
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Valores universales unificados: cualquier opción agregada aquí está disponible para todos los operadores y delegaciones policiales.
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              {items.length} opciones en «{activeCategory}»
            </span>
          </div>

          {/* Category Chips Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Categorías del Sistema
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
              {REQUIRED_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeCategory === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Add item input */}
          <form onSubmit={handleAddItem} className="flex gap-2">
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={`Agregar nuevo elemento al catálogo "${activeCategory}"...`}
              className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir a Catálogo</span>
            </button>
          </form>
          {/* Search Filter for Catalog Items with Hide/Show Toggle */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}</span>
                  {searchItem.trim() && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-mono">
                      1
                    </span>
                  )}
                </button>

                {searchItem.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchItem('')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold underline underline-offset-2 ml-1"
                  >
                    Limpiar filtro
                  </button>
                )}
              </div>

              <div className="text-slate-400 text-xs">
                Mostrando <strong className="text-slate-700 dark:text-slate-200 font-mono">{items.length}</strong> de <span className="font-mono">{allCategoryItems.length}</span> en «{activeCategory}»
              </div>
            </div>

            {showFilters && (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchItem}
                  onChange={(e) => setSearchItem(e.target.value)}
                  placeholder={`Buscar en las opciones de "${activeCategory}"...`}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[500px] overflow-y-auto">
            {items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-400 w-8 text-right font-medium">{idx + 1}.</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{item.value}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Eliminar de catálogo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-12">
                No hay elementos registrados en el catálogo «{activeCategory}». Agregue el primero arriba.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
