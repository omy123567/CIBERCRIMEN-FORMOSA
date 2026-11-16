import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Hash,
  Plus,
  BookOpen,
  Layers,
  RotateCcw,
  Sparkles,
  Maximize2,
  Minimize2,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sliders,
  ChevronRight,
  TrendingUp,
  Clock,
  Printer,
  Edit2,
  Trash2
} from 'lucide-react';
import {
  NumerarioSerie,
  FolioRegistro,
  SisPolUser,
  InstitutionalConfig
} from '../../types/sgp';
import { sgpManager } from '../../db/dexieDb';
import { AsignarFolioModal } from './AsignarFolioModal';
import { DetalleFolioModal } from './DetalleFolioModal';
import { SeriesManagerModal } from './SeriesManagerModal';
import { LibroFoliosModal } from './LibroFoliosModal';
import { ReiniciarSerieModal } from './ReiniciarSerieModal';
import { usePermissions } from '../../context/PermissionsContext';

interface NumerarioModuleProps {
  currentUser: SisPolUser;
  delegacionId: number;
  institutionalConfig: InstitutionalConfig;
  canDelete?: boolean;
}

type GridDensity = 'compact' | 'standard' | 'large';

export const NumerarioModule: React.FC<NumerarioModuleProps> = ({
  currentUser,
  delegacionId,
  institutionalConfig,
  canDelete = true
}) => {
  const perms = usePermissions();
  const effectiveCanDelete = canDelete && perms.canDelete;
  const [series, setSeries] = useState<NumerarioSerie[]>([]);
  const [activeSerieId, setActiveSerieId] = useState<number | null>(null);
  const [folios, setFolios] = useState<FolioRegistro[]>([]);
  const [allDelegacionFolios, setAllDelegacionFolios] = useState<FolioRegistro[]>([]);
  const [loading, setLoading] = useState(true);

  // Density: compact, standard, large
  const [density, setDensity] = useState<GridDensity>('standard');

  // Search & Filters for grid
  const [showFilters, setShowFilters] = useState(true);
  const [searchFolio, setSearchFolio] = useState('');
  const [filterEstadoFolio, setFilterEstadoFolio] = useState<'TODOS' | 'OCUPADOS' | 'LIBRES'>('TODOS');
  const [filterTipoDoc, setFilterTipoDoc] = useState('');

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignStartNum, setAssignStartNum] = useState<number>(1);
  const [assignEndNum, setAssignEndNum] = useState<number | undefined>(undefined);

  const [selectedFolio, setSelectedFolio] = useState<FolioRegistro | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isSeriesManagerOpen, setIsSeriesManagerOpen] = useState(false);
  const [seriesManagerInitialEdit, setSeriesManagerInitialEdit] = useState<NumerarioSerie | null>(null);
  const [seriesManagerInitialCreate, setSeriesManagerInitialCreate] = useState(false);
  const [isLibroModalOpen, setIsLibroModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Multi-selection range with Shift + Click & Mouse Drag
  const [lastClickedNumber, setLastClickedNumber] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [isDraggingRange, setIsDraggingRange] = useState<boolean>(false);
  const [dragAnchor, setDragAnchor] = useState<number | null>(null);
  const [hasDraggedOver, setHasDraggedOver] = useState<boolean>(false);

  // Hover Tooltip state
  const [hoveredFolio, setHoveredFolio] = useState<{ folio: FolioRegistro; x: number; y: number } | null>(null);

  // Load series and folios from database
  const loadData = async (targetSerieId?: number) => {
    try {
      const seriesList = await sgpManager.getSeriesNumerario(delegacionId);
      setSeries(seriesList);

      const chosenSerieId = targetSerieId || activeSerieId || seriesList[0]?.id || null;
      setActiveSerieId(chosenSerieId);

      if (chosenSerieId) {
        const serieFolios = await sgpManager.getFoliosBySerie(chosenSerieId);
        setFolios(serieFolios);
      } else {
        setFolios([]);
      }

      const allFol = await sgpManager.getAllFolios(delegacionId);
      setAllDelegacionFolios(allFol);
    } catch (err) {
      console.error('Error loading numerario data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = sgpManager.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, [delegacionId]);

  // When active serie changes
  const handleSelectSerie = async (serieId: number) => {
    setActiveSerieId(serieId);
    setSelectedRange(null);
    setLastClickedNumber(null);
    const serieFolios = await sgpManager.getFoliosBySerie(serieId);
    setFolios(serieFolios);
  };

  const activeSerie = useMemo(() => {
    return series.find(s => s.id === activeSerieId) || series[0] || null;
  }, [series, activeSerieId]);

  // Map of occupied folios: number -> FolioRegistro
  const occupiedMap = useMemo(() => {
    const map = new Map<number, FolioRegistro>();
    folios.forEach(f => {
      map.set(f.numero, f);
    });
    return map;
  }, [folios]);

  const occupiedNumbersSet = useMemo(() => {
    return new Set(folios.map(f => f.numero));
  }, [folios]);

  // Max folios in the grid
  const totalLimit = activeSerie?.limiteFolios || 1000;
  const numColumns = activeSerie?.columnas || 20;

  // Document types present in current serie
  const tiposDocumentoEnSerie = useMemo(
    () => Array.from(new Set(folios.map(f => f.tipoDocumento).filter(Boolean))),
    [folios]
  );

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchFolio.trim()) count++;
    if (filterEstadoFolio !== 'TODOS') count++;
    if (filterTipoDoc) count++;
    return count;
  }, [searchFolio, filterEstadoFolio, filterTipoDoc]);

  const handleClearFilters = () => {
    setSearchFolio('');
    setFilterEstadoFolio('TODOS');
    setFilterTipoDoc('');
  };

  // Set of matching numbers for highlighting or isolating
  const matchingNumbersSet = useMemo(() => {
    const q = searchFolio.trim().toLowerCase();
    const hasQuery = q.length > 0;
    const hasType = !!filterTipoDoc;
    const isSearchingNumber = hasQuery && !isNaN(parseInt(q, 10));
    const searchNum = isSearchingNumber ? parseInt(q, 10) : null;

    const set = new Set<number>();

    for (let i = 1; i <= totalLimit; i++) {
      const isOccupied = occupiedNumbersSet.has(i);
      const fol = occupiedMap.get(i);

      // Estado filter
      if (filterEstadoFolio === 'OCUPADOS' && !isOccupied) continue;
      if (filterEstadoFolio === 'LIBRES' && isOccupied) continue;

      // If filtering by document type, must be occupied with matching type
      if (hasType) {
        if (!fol || fol.tipoDocumento !== filterTipoDoc) continue;
      }

      // Query filter
      if (hasQuery) {
        if (isOccupied && fol) {
          const numMatch = fol.numero === searchNum;
          const carMatch = (fol.caratula || '').toLowerCase().includes(q);
          const asuMatch = (fol.asunto || '').toLowerCase().includes(q);
          const destMatch = (fol.destinatario || '').toLowerCase().includes(q);
          const solMatch = (fol.solicitante || '').toLowerCase().includes(q);
          const fechaMatch = (fol.fecha || '').includes(q);
          if (!numMatch && !carMatch && !asuMatch && !destMatch && !solMatch && !fechaMatch) {
            continue;
          }
        } else {
          // If free, only matches if searching specifically for this exact number
          if (searchNum !== i) continue;
        }
      }

      set.add(i);
    }

    return set;
  }, [totalLimit, occupiedNumbersSet, occupiedMap, searchFolio, filterEstadoFolio, filterTipoDoc]);

  // Compute first available number in active serie
  const firstFreeNumber = useMemo(() => {
    for (let i = 1; i <= totalLimit; i++) {
      if (!occupiedNumbersSet.has(i)) return i;
    }
    return totalLimit + 1;
  }, [occupiedNumbersSet, totalLimit]);

  // Global mouseup listener for drag-to-select
  useEffect(() => {
    if (!isDraggingRange) return;
    const handleGlobalMouseUp = () => {
      setIsDraggingRange(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDraggingRange]);

  // Handle mouse down to begin drag range selection
  const handleMouseDownCell = (num: number, e: React.MouseEvent) => {
    if (e.button !== 0 || !perms.canCreate) return; // Only primary button when create is allowed
    setIsDraggingRange(true);
    setDragAnchor(num);
    setHasDraggedOver(false);
    setLastClickedNumber(num);
  };

  // Handle mouse enter during drag
  const handleMouseEnterCell = (num: number, fol: FolioRegistro | null, rectTarget: HTMLElement) => {
    if (fol) {
      const rect = rectTarget.getBoundingClientRect();
      setHoveredFolio({ folio: fol, x: rect.left, y: rect.top });
    }
    if (perms.canCreate && isDraggingRange && dragAnchor !== null) {
      setHasDraggedOver(true);
      const start = Math.min(dragAnchor, num);
      const end = Math.max(dragAnchor, num);
      setSelectedRange({ start, end });
    }
  };

  // Handle mouse up
  const handleMouseUpCell = (num: number) => {
    if (isDraggingRange) {
      setIsDraggingRange(false);
      if (perms.canCreate && dragAnchor !== null && dragAnchor !== num) {
        const start = Math.min(dragAnchor, num);
        const end = Math.max(dragAnchor, num);
        setSelectedRange({ start, end });
      }
    }
  };

  // Handle cell click (for click without drag)
  const handleCellClick = (num: number, e: React.MouseEvent) => {
    // If the user just completed a drag selection across multiple cells, don't open single click modal
    if (hasDraggedOver) {
      setHasDraggedOver(false);
      return;
    }

    const isOccupied = occupiedMap.has(num);

    // If shift key held down and lastClickedNumber exists, select visual range
    if (perms.canCreate && e.shiftKey && lastClickedNumber !== null) {
      const start = Math.min(lastClickedNumber, num);
      const end = Math.max(lastClickedNumber, num);
      setSelectedRange({ start, end });
      return;
    }

    setLastClickedNumber(num);
    setSelectedRange(null);

    if (isOccupied) {
      const fol = occupiedMap.get(num)!;
      setSelectedFolio(fol);
      setIsDetailModalOpen(true);
    } else if (perms.canCreate) {
      setAssignStartNum(num);
      setAssignEndNum(undefined);
      setIsAssignModalOpen(true);
    }
  };

  // Open assignment for the first free number
  const handleAssignNextFree = () => {
    if (!perms.canCreate) return;
    setSelectedRange(null);
    setAssignStartNum(firstFreeNumber);
    setAssignEndNum(undefined);
    setIsAssignModalOpen(true);
  };

  // Open assignment for the selected Shift range
  const handleAssignSelectedRange = () => {
    if (!perms.canCreate || !selectedRange) return;
    setAssignStartNum(selectedRange.start);
    setAssignEndNum(selectedRange.end);
    setIsAssignModalOpen(true);
  };

  // Expand Grid by +100 numbers
  const handleExpandGrid = async () => {
    if (!perms.canEdit || !activeSerie || !activeSerie.id) return;
    const newLimit = (activeSerie.limiteFolios || 1000) + 100;
    await sgpManager.updateSerieNumerario(activeSerie.id, { limiteFolios: newLimit });
    loadData(activeSerie.id);
  };

  // Save Folios (Individual or Range)
  const handleSaveFolios = async (newFolios: Omit<FolioRegistro, 'id'>[]) => {
    if (!perms.canCreate) return;
    if (newFolios.length === 1) {
      await sgpManager.assignFolio(newFolios[0]);
    } else {
      await sgpManager.assignFoliosRange(newFolios);
    }
    setSelectedRange(null);
    loadData(activeSerieId || undefined);
  };

  // Update Folio from Detail Modal
  const handleUpdateFolio = async (id: number, changes: Partial<FolioRegistro>) => {
    if (!perms.canEdit) return;
    await sgpManager.updateFolio(id, changes);
    loadData(activeSerieId || undefined);
  };

  // Liberar Folio
  const handleLiberarFolio = async (id: number, liberarRango: boolean) => {
    if (!effectiveCanDelete) return;
    await sgpManager.liberarFolio(id, liberarRango);
    loadData(activeSerieId || undefined);
  };

  // Reiniciar Serie
  const handleConfirmReset = async () => {
    if (!perms.canResetCounters || !activeSerie?.id) return;
    await sgpManager.reiniciarNumerarioSerie(activeSerie.id);
    loadData(activeSerie.id);
  };

  // Percentages & Stats
  const totalOccupied = folios.length;
  const totalFree = Math.max(totalLimit - totalOccupied, 0);
  const percentOccupied = ((totalOccupied / totalLimit) * 100).toFixed(1);

  // Density cell class generator
  const getCellClasses = (densityMode: GridDensity) => {
    switch (densityMode) {
      case 'compact':
        return 'h-7 text-[10px] min-w-[34px]';
      case 'large':
        return 'h-11 text-xs min-w-[50px] font-bold';
      case 'standard':
      default:
        return 'h-9 text-[11px] min-w-[42px]';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
        <span className="text-xs font-semibold">Cargando Numerario Oficial y Grilla de Folios...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase">
              POLICÍA DE FORMOSA • D.G.P.C.
            </span>
            <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Numerario Oficial
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight flex items-center gap-2">
            <Hash className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Módulo de Numerario y Control de Folios</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Administración correlativa de folios en cuadrícula continua de 20 columnas, asignación individual y por bloques continuos.
          </p>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Asignar Siguiente Libre & Asignar Folio Manual */}
          {perms.canCreate && (
            <>
              <button
                onClick={handleAssignNextFree}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-all active:scale-95"
                title="Asignar el primer número disponible en esta serie"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>+ Asignar Siguiente (#{firstFreeNumber})</span>
              </button>

              <button
                onClick={() => {
                  setAssignStartNum(firstFreeNumber);
                  setAssignEndNum(undefined);
                  setIsAssignModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl transition-colors border border-blue-200 dark:border-blue-800 shadow-xs"
                title="Asignar o agregar un nuevo folio individual o por rango"
              >
                <Plus className="w-4 h-4" />
                <span>+ Asignar / Agregar Folio</span>
              </button>
            </>
          )}

          {/* Libro de Folios & Reportes */}
          <button
            onClick={() => setIsLibroModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-xs"
            title="Ver reporte consolidado, buscar folios y exportar a Excel/CSV"
          >
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>Libro de Folios</span>
          </button>

          {/* Administrar Tipos de Folios */}
          <button
            onClick={() => {
              setSeriesManagerInitialEdit(null);
              setSeriesManagerInitialCreate(false);
              setIsSeriesManagerOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-xs"
            title="Crear, editar o eliminar tipos de folios (series)"
          >
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>Tipos de Folios ({series.length})</span>
          </button>

          {/* Agregar más folios (posicionado al lado de Reiniciar Serie) */}
          {perms.canEdit && (
            <button
              onClick={handleExpandGrid}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl transition-colors border border-blue-200 dark:border-blue-800 shadow-xs"
              title="Ampliar cuadrícula agregando 100 folios más a esta serie"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>+ 100 Folios</span>
            </button>
          )}

          {/* Reiniciar Serie */}
          {perms.canResetCounters && (
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 rounded-xl transition-colors border border-red-200 dark:border-red-900"
              title="Reiniciar numerario de la serie activa para nuevo ciclo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar Serie</span>
            </button>
          )}
        </div>
      </div>

      {/* Series Independent Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        <div className="flex items-center gap-2 min-w-max">
          {series.map((s) => {
            const isActive = s.id === activeSerieId;
            return (
              <div
                key={s.id}
                className={`flex items-center rounded-xl transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectSerie(s.id!)}
                  className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold"
                >
                  <span>{s.nombre}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {s.prefijo}
                  </span>
                </button>
                {perms.canEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSeriesManagerInitialEdit(s);
                      setSeriesManagerInitialCreate(false);
                      setIsSeriesManagerOpen(true);
                    }}
                    className={`p-1.5 mr-1 rounded-lg transition-colors ${
                      isActive
                        ? 'text-blue-200 hover:text-white hover:bg-blue-700'
                        : 'text-slate-400 hover:text-blue-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title={`Editar tipo de folio "${s.nombre}"`}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {perms.canCreate && (
          <button
            onClick={() => {
              setSeriesManagerInitialEdit(null);
              setSeriesManagerInitialCreate(true);
              setIsSeriesManagerOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shrink-0 shadow-xs transition-all active:scale-95"
            title="Crear un nuevo tipo de folio"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nuevo Tipo de Folio</span>
          </button>
        )}
      </div>

      {/* Active Serie Clean Bar & Density Controls (sin libres, ocupados ni total de grilla) */}
      {activeSerie && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          
          {/* Serie Info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center font-black text-blue-600 dark:text-blue-400 font-mono text-xs border border-blue-200 dark:border-blue-800 shrink-0">
              {activeSerie.prefijo}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 dark:text-white">{activeSerie.nombre}</span>
                <span className="text-[10px] text-slate-400 font-mono">({activeSerie.anio || '2026'})</span>
                {perms.canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setSeriesManagerInitialEdit(activeSerie);
                      setSeriesManagerInitialCreate(false);
                      setIsSeriesManagerOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                    title="Editar nombre, prefijo o características de este tipo de folio"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <span className="text-[10px] text-slate-500 block truncate max-w-md">
                {activeSerie.descripcion || `Cuaderno correlativo de ${activeSerie.nombre}`}
              </span>
            </div>
          </div>

          {/* Density Selector */}
          <div className="flex items-center justify-end gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Densidad:</span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setDensity('compact')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  density === 'compact' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
                title="Densidad compacta (Celdas pequeñas)"
              >
                Compacta
              </button>
              <button
                type="button"
                onClick={() => setDensity('standard')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  density === 'standard' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
                title="Densidad estándar"
              >
                Estándar
              </button>
              <button
                type="button"
                onClick={() => setDensity('large')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  density === 'large' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
                title="Densidad grande (Celdas amplias)"
              >
                Grande
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Selected Range Floating Action Banner */}
      {selectedRange && (
        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xs font-bold block">
                Rango Seleccionado (por Arrastre o Selección): Folios N° {selectedRange.start} al {selectedRange.end}
              </span>
              <span className="text-[11px] text-blue-100">
                Total de casillas seleccionadas: {selectedRange.end - selectedRange.start + 1} folios
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedRange(null)}
              className="px-3 py-1.5 text-xs font-semibold text-white/80 hover:text-white"
            >
              Descartar Selección
            </button>
            {perms.canCreate && (
              <button
                onClick={handleAssignSelectedRange}
                className="px-4 py-1.5 text-xs font-bold text-blue-900 bg-white hover:bg-blue-50 rounded-xl shadow-md transition-all active:scale-95"
              >
                Asignar Rango Continuo ({selectedRange.end - selectedRange.start + 1} Folios)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search and Filters for Numerario Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-mono">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold underline underline-offset-2 ml-1"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="text-slate-400 text-xs">
            {activeFiltersCount > 0 && (
              <span>
                Coincidencias encontradas: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{matchingNumbersSet.size}</strong> folios
              </span>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-all">
            <div className="relative sm:col-span-5">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchFolio}
                onChange={(e) => setSearchFolio(e.target.value)}
                placeholder="Buscar por N° exacto, carátula, asunto, destinatario o fecha..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={filterEstadoFolio}
                onChange={(e) => setFilterEstadoFolio(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-semibold"
              >
                <option value="TODOS">Todos los Folios (Libres y Ocupados)</option>
                <option value="OCUPADOS">Solo Folios Ocupados ({totalOccupied})</option>
                <option value="LIBRES">Solo Folios Libres ({totalFree})</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={filterTipoDoc}
                onChange={(e) => setFilterTipoDoc(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white"
              >
                <option value="">Todos los Tipos de Trámite</option>
                {tiposDocumentoEnSerie.map((t, idx) => (
                  <option key={idx} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          1. CUADRÍCULA NUMÉRICA CONTINUA (20 COLUMNAS EXACTAS C1 a C20)
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        
        {/* Grid Title & Legends */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Cuadrícula Continua de Folios (1 al {totalLimit}):
            </span>
            <span className="text-[10px] text-slate-400 italic">
              (20 Columnas continuas • Haga clic en casilla libre para asignar, o en casilla roja para ver detalle)
            </span>
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
              <span className="text-slate-600 dark:text-slate-400">Libre / Disponible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded border border-red-500 bg-red-500/20 text-red-600 line-through text-[9px] flex items-center justify-center font-bold">
                X
              </span>
              <span className="text-red-600 dark:text-red-400 font-bold">Ocupado (Tachado)</span>
            </div>
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border-2 border-emerald-500 bg-emerald-500/30" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Coincidencia</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded border border-blue-500 bg-blue-500/30" />
              <span className="text-blue-600 dark:text-blue-400">Selección Rango</span>
            </div>
          </div>
        </div>

        {/* 20 Continuous Columns Container */}
        <div className="overflow-x-auto pb-4">
          <div className="inline-block min-w-full">
            {/* Continuous Cells Grid */}
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${numColumns}, minmax(40px, 1fr))` }}
            >
              {Array.from({ length: totalLimit }, (_, idx) => {
                const num = idx + 1;
                const isOccupied = occupiedMap.has(num);
                const fol = isOccupied ? occupiedMap.get(num)! : null;
                const isInSelectedRange = selectedRange && num >= selectedRange.start && num <= selectedRange.end;
                const isAnchor = lastClickedNumber === num;
                const isMatch = activeFiltersCount > 0 ? matchingNumbersSet.has(num) : true;

                return (
                  <button
                    key={num}
                    type="button"
                    onMouseDown={(e) => handleMouseDownCell(num, e)}
                    onMouseEnter={(e) => handleMouseEnterCell(num, fol, e.currentTarget)}
                    onMouseUp={() => handleMouseUpCell(num)}
                    onClick={(e) => handleCellClick(num, e)}
                    onMouseLeave={() => setHoveredFolio(null)}
                    className={`relative flex items-center justify-center rounded-lg font-mono transition-all select-none border ${
                      isOccupied || perms.canCreate ? 'cursor-pointer' : 'cursor-default'
                    } ${
                      getCellClasses(density)
                    } ${
                      isInSelectedRange
                        ? 'bg-blue-500/25 border-blue-500 ring-2 ring-blue-500 text-blue-700 dark:text-blue-300 font-bold'
                        : isOccupied
                        ? 'bg-red-500/15 border-red-500/50 text-red-600 dark:text-red-400 font-black line-through hover:bg-red-500/25 hover:border-red-600'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-slate-800'
                    } ${isAnchor ? 'ring-2 ring-blue-600' : ''} ${
                      activeFiltersCount > 0
                        ? isMatch
                          ? 'ring-2 ring-emerald-500 ring-offset-1 scale-105 z-10 shadow-sm'
                          : 'opacity-25 grayscale'
                        : ''
                    }`}
                    title={
                      fol
                        ? `Folio N° ${num} [OCUPADO]\nCarátula: ${fol.caratula}\nAsunto: ${fol.asunto}\nDestinatario: ${fol.destinatario}\nFecha: ${fol.fecha}`
                        : perms.canCreate
                        ? `Folio N° ${num} [DISPONIBLE] - Haga clic para asignar`
                        : `Folio N° ${num} [DISPONIBLE]`
                    }
                  >
                    <span>{num}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic Expand Button */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-500">
            Cuadrícula visualizada: 1 al {totalLimit} ({totalLimit / 20} filas de 20 columnas)
          </span>

          {perms.canEdit && (
            <button
              onClick={handleExpandGrid}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-xl border border-blue-200 dark:border-blue-900 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ampliar Grilla (+100 Números)</span>
            </button>
          )}
        </div>

      </div>

      {/* Floating Hover Tooltip Card (Rich Trámite Card) */}
      {hoveredFolio && (
        <div
          className="fixed z-50 pointer-events-none p-3.5 bg-slate-900/95 text-white backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl max-w-xs space-y-1.5 text-xs animate-in fade-in zoom-in-95"
          style={{
            left: Math.min(hoveredFolio.x + 10, window.innerWidth - 300),
            top: Math.max(hoveredFolio.y - 120, 10)
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
            <span className="font-mono font-bold text-red-400 text-xs">
              Folio #{hoveredFolio.folio.numero}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {hoveredFolio.folio.fecha}
            </span>
          </div>

          <div className="font-bold text-slate-100 line-clamp-1">
            {hoveredFolio.folio.caratula}
          </div>

          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
            {hoveredFolio.folio.asunto}
          </p>

          <div className="text-[10px] text-blue-300 truncate pt-0.5">
            Dest: {hoveredFolio.folio.destinatario}
          </div>

          <div className="text-[9px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Tipo: {hoveredFolio.folio.tipoDocumento}</span>
            <span className="text-amber-400 font-semibold">Clic para ver ficha</span>
          </div>
        </div>
      )}

      {/* Modal: Asignación de Folios (Individual y Rango) */}
      {activeSerie && (
        <AsignarFolioModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          serie={activeSerie}
          initialNumero={assignStartNum}
          initialRangoFin={assignEndNum}
          occupiedNumbers={occupiedNumbersSet}
          currentUser={currentUser}
          onSave={handleSaveFolios}
        />
      )}

      {/* Modal: Ficha de Detalle y Liberación */}
      {selectedFolio && activeSerie && (
        <DetalleFolioModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedFolio(null);
          }}
          folio={selectedFolio}
          serie={activeSerie}
          canDelete={effectiveCanDelete}
          onUpdateFolio={handleUpdateFolio}
          onLiberarFolio={handleLiberarFolio}
        />
      )}

      {/* Modal: Administración de Series */}
      <SeriesManagerModal
        isOpen={isSeriesManagerOpen}
        onClose={() => {
          setIsSeriesManagerOpen(false);
          setSeriesManagerInitialEdit(null);
          setSeriesManagerInitialCreate(false);
        }}
        series={series}
        delegacionId={delegacionId}
        initialEditSerie={seriesManagerInitialEdit}
        initialOpenCreate={seriesManagerInitialCreate}
        onRefresh={() => loadData(activeSerieId || undefined)}
        onSelectSerie={handleSelectSerie}
      />

      {/* Modal: Libro de Folios y Reportes */}
      {activeSerie && (
        <LibroFoliosModal
          isOpen={isLibroModalOpen}
          onClose={() => setIsLibroModalOpen(false)}
          activeSerie={activeSerie}
          allSeries={series}
          foliosActiveSerie={folios}
          allFolios={allDelegacionFolios}
          config={institutionalConfig}
          canDelete={effectiveCanDelete}
          onSelectFolio={(f) => {
            setIsLibroModalOpen(false);
            setSelectedFolio(f);
            setIsDetailModalOpen(true);
          }}
          onDeleteFolio={async (id) => {
            await handleLiberarFolio(id, false);
          }}
        />
      )}

      {/* Modal: Reiniciar Serie Segura */}
      {activeSerie && (
        <ReiniciarSerieModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          serie={activeSerie}
          totalOccupied={totalOccupied}
          onConfirmReset={handleConfirmReset}
        />
      )}

    </div>
  );
};
