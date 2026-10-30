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
  Printer
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
  const [series, setSeries] = useState<NumerarioSerie[]>([]);
  const [activeSerieId, setActiveSerieId] = useState<number | null>(null);
  const [folios, setFolios] = useState<FolioRegistro[]>([]);
  const [allDelegacionFolios, setAllDelegacionFolios] = useState<FolioRegistro[]>([]);
  const [loading, setLoading] = useState(true);

  // Density: compact, standard, large
  const [density, setDensity] = useState<GridDensity>('standard');

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignStartNum, setAssignStartNum] = useState<number>(1);
  const [assignEndNum, setAssignEndNum] = useState<number | undefined>(undefined);

  const [selectedFolio, setSelectedFolio] = useState<FolioRegistro | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isSeriesManagerOpen, setIsSeriesManagerOpen] = useState(false);
  const [isLibroModalOpen, setIsLibroModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Multi-selection range with Shift + Click
  const [lastClickedNumber, setLastClickedNumber] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);

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

  // Compute first available number in active serie
  const firstFreeNumber = useMemo(() => {
    for (let i = 1; i <= totalLimit; i++) {
      if (!occupiedNumbersSet.has(i)) return i;
    }
    return totalLimit + 1;
  }, [occupiedNumbersSet, totalLimit]);

  // Handle cell click
  const handleCellClick = (num: number, e: React.MouseEvent) => {
    const isOccupied = occupiedMap.has(num);

    // If shift key held down and lastClickedNumber exists, select visual range
    if (e.shiftKey && lastClickedNumber !== null) {
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
    } else {
      setAssignStartNum(num);
      setAssignEndNum(undefined);
      setIsAssignModalOpen(true);
    }
  };

  // Open assignment for the first free number
  const handleAssignNextFree = () => {
    setSelectedRange(null);
    setAssignStartNum(firstFreeNumber);
    setAssignEndNum(undefined);
    setIsAssignModalOpen(true);
  };

  // Open assignment for the selected Shift range
  const handleAssignSelectedRange = () => {
    if (!selectedRange) return;
    setAssignStartNum(selectedRange.start);
    setAssignEndNum(selectedRange.end);
    setIsAssignModalOpen(true);
  };

  // Expand Grid by +100 numbers
  const handleExpandGrid = async () => {
    if (!activeSerie || !activeSerie.id) return;
    const newLimit = (activeSerie.limiteFolios || 1000) + 100;
    await sgpManager.updateSerieNumerario(activeSerie.id, { limiteFolios: newLimit });
    loadData(activeSerie.id);
  };

  // Save Folios (Individual or Range)
  const handleSaveFolios = async (newFolios: Omit<FolioRegistro, 'id'>[]) => {
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
    await sgpManager.updateFolio(id, changes);
    loadData(activeSerieId || undefined);
  };

  // Liberar Folio
  const handleLiberarFolio = async (id: number, liberarRango: boolean) => {
    await sgpManager.liberarFolio(id, liberarRango);
    loadData(activeSerieId || undefined);
  };

  // Reiniciar Serie
  const handleConfirmReset = async () => {
    if (!activeSerie?.id) return;
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
          {/* Asignar Siguiente Libre */}
          <button
            onClick={handleAssignNextFree}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-all active:scale-95"
            title="Asignar el primer número disponible en esta serie"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>+ Asignar Siguiente Libre (#{firstFreeNumber})</span>
          </button>

          {/* Libro de Folios & Reportes */}
          <button
            onClick={() => setIsLibroModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-xs"
            title="Ver reporte consolidado, buscar folios y exportar a Excel/CSV"
          >
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>Libro de Folios</span>
          </button>

          {/* Administrar Series */}
          <button
            onClick={() => setIsSeriesManagerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-xs"
            title="Crear o editar series de numerario"
          >
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>Series ({series.length})</span>
          </button>

          {/* Reiniciar Serie */}
          {canDelete && (
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
        <div className="flex items-center gap-1.5 min-w-max">
          {series.map((s) => {
            const isActive = s.id === activeSerieId;
            return (
              <button
                key={s.id}
                onClick={() => handleSelectSerie(s.id!)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
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
            );
          })}
        </div>

        <button
          onClick={() => setIsSeriesManagerOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nueva Serie</span>
        </button>
      </div>

      {/* Stats Summary Bar & Grid Density Controls */}
      {activeSerie && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          
          {/* Card 1: Serie Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center font-black text-blue-600 dark:text-blue-400 font-mono text-sm border border-blue-200 dark:border-blue-800">
              {activeSerie.prefijo}
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Serie Activa:</span>
              <span className="text-xs font-black text-slate-900 dark:text-white block">{activeSerie.nombre}</span>
              <span className="text-[10px] text-slate-500">Año Oficial: {activeSerie.anio || '2026'}</span>
            </div>
          </div>

          {/* Card 2: Metrics Counters */}
          <div className="flex items-center justify-around border-y md:border-y-0 md:border-x border-slate-100 dark:border-slate-800 py-2 md:py-0 px-2">
            <div className="text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Folios Libres</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">{totalFree}</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
            <div className="text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Ocupados</span>
              <span className="text-base font-black text-red-600 dark:text-red-400 font-mono">{totalOccupied}</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
            <div className="text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Grilla</span>
              <span className="text-base font-black text-slate-700 dark:text-slate-300 font-mono">{totalLimit}</span>
            </div>
          </div>

          {/* Card 3: Occupation Progress */}
          <div className="space-y-1.5 flex flex-col justify-center">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Ocupación de Numerario:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{percentOccupied}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${percentOccupied}%` }}
              />
            </div>
          </div>

          {/* Card 4: Density Selector & +100 expansion */}
          <div className="flex items-center justify-end gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setDensity('compact')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  density === 'compact' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
                title="Densidad compacta (Celdas pequeñas)"
              >
                Compacta
              </button>
              <button
                type="button"
                onClick={() => setDensity('standard')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  density === 'standard' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
                title="Densidad estándar"
              >
                Estándar
              </button>
              <button
                type="button"
                onClick={() => setDensity('large')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  density === 'large' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
                title="Densidad grande (Celdas amplias)"
              >
                Grande
              </button>
            </div>

            <button
              onClick={handleExpandGrid}
              className="px-2.5 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-xl border border-blue-200 dark:border-blue-900 whitespace-nowrap"
              title="Ampliar dinámicamente +100 casillas a esta serie"
            >
              +100 Folios
            </button>
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
                Rango Seleccionado con Shift: Folios N° {selectedRange.start} al {selectedRange.end}
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
            <button
              onClick={handleAssignSelectedRange}
              className="px-4 py-1.5 text-xs font-bold text-blue-900 bg-white hover:bg-blue-50 rounded-xl shadow-md transition-all active:scale-95"
            >
              Asignar Rango Continuo ({selectedRange.end - selectedRange.start + 1} Folios)
            </button>
          </div>
        </div>
      )}

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
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded border border-blue-500 bg-blue-500/30" />
              <span className="text-blue-600 dark:text-blue-400">Selección Rango</span>
            </div>
          </div>
        </div>

        {/* 20 Continuous Columns Container */}
        <div className="overflow-x-auto pb-4">
          <div className="inline-block min-w-full">
            {/* Column Header Titles (C1 to C20) */}
            <div
              className="grid gap-1 mb-1 text-center font-mono font-bold text-[9px] text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1"
              style={{ gridTemplateColumns: `repeat(${numColumns}, minmax(40px, 1fr))` }}
            >
              {Array.from({ length: numColumns }, (_, i) => (
                <div key={i} className="truncate">
                  C{i + 1}
                </div>
              ))}
            </div>

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

                return (
                  <button
                    key={num}
                    type="button"
                    onClick={(e) => handleCellClick(num, e)}
                    onMouseEnter={(e) => {
                      if (fol) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredFolio({ folio: fol, x: rect.left, y: rect.top });
                      }
                    }}
                    onMouseLeave={() => setHoveredFolio(null)}
                    className={`relative flex items-center justify-center rounded-lg font-mono transition-all select-none border ${
                      getCellClasses(density)
                    } ${
                      isInSelectedRange
                        ? 'bg-blue-500/25 border-blue-500 ring-2 ring-blue-500 text-blue-700 dark:text-blue-300 font-bold'
                        : isOccupied
                        ? 'bg-red-500/15 border-red-500/50 text-red-600 dark:text-red-400 font-black line-through hover:bg-red-500/25 hover:border-red-600'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-slate-800'
                    } ${isAnchor ? 'ring-2 ring-blue-600' : ''}`}
                    title={
                      fol
                        ? `Folio N° ${num} [OCUPADO]\nCarátula: ${fol.caratula}\nAsunto: ${fol.asunto}\nDestinatario: ${fol.destinatario}\nFecha: ${fol.fecha}`
                        : `Folio N° ${num} [DISPONIBLE] - Haga clic para asignar`
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

          <button
            onClick={handleExpandGrid}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-xl border border-blue-200 dark:border-blue-900 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ampliar Grilla (+100 Números)</span>
          </button>
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
          canDelete={canDelete}
          onUpdateFolio={handleUpdateFolio}
          onLiberarFolio={handleLiberarFolio}
        />
      )}

      {/* Modal: Administración de Series */}
      <SeriesManagerModal
        isOpen={isSeriesManagerOpen}
        onClose={() => setIsSeriesManagerOpen(false)}
        series={series}
        delegacionId={delegacionId}
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
          onSelectFolio={(f) => {
            setIsLibroModalOpen(false);
            setSelectedFolio(f);
            setIsDetailModalOpen(true);
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
