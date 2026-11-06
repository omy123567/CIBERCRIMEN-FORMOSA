import React, { useState, useRef, useMemo } from 'react';
import {
  Archive,
  Download,
  Upload,
  Database,
  FileJson,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  Trash2,
  Calendar,
  Filter,
  ShieldAlert,
  Clock,
  Layers,
  CheckSquare,
  Square,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { SgpBackupData } from '../../types/sgp';
import {
  exportSgpCopiaCompletaZip,
  importSgpCopiaCompletaZip,
  exportIndividualJson
} from '../../utils/sgpBackupZip';
import { saveAs } from 'file-saver';
import { sgpManager } from '../../db/dexieDb';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  PeriodType,
  calculatePeriodRange,
  countRecordsInPeriod,
  extractPeriodBackup,
  EntitySelection,
  DEFAULT_ENTITY_SELECTION,
  PeriodCounts,
  parseDateToTime,
  isTimestampInPeriod,
  toInputDateFormat
} from '../../utils/periodFilter';

interface BackupModuleProps {
  backupData: SgpBackupData;
  onRefresh: () => void;
}

type TabType = 'general' | 'eliminar_periodo' | 'restaurar_periodo' | 'exportar_periodo';

export const BackupModule: React.FC<BackupModuleProps> = ({ backupData, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isRestoringPeriod, setIsRestoringPeriod] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ success: boolean; message: string } | null>(null);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  // File Inputs
  const fileInputZipRef = useRef<HTMLInputElement>(null);
  const fileInputJsonRef = useRef<HTMLInputElement>(null);
  const fileInputRestorePeriodRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // State for "Eliminar por Período"
  // -------------------------------------------------------------
  const [purgePeriod, setPurgePeriod] = useState<PeriodType>('mes');
  const [purgeCustomStart, setPurgeCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toInputDateFormat(d);
  });
  const [purgeCustomEnd, setPurgeCustomEnd] = useState<string>(() => toInputDateFormat(new Date()));
  const [purgeEntities, setPurgeEntities] = useState<EntitySelection>({ ...DEFAULT_ENTITY_SELECTION });
  const [autoBackupBeforePurge, setAutoBackupBeforePurge] = useState(true);
  const [showPurgeConfirmModal, setShowPurgeConfirmModal] = useState(false);
  const [purgeConfirmationText, setPurgeConfirmationText] = useState('');

  // Calculate purge date range and live count of affected records
  const purgeRange = useMemo(() => {
    return calculatePeriodRange(purgePeriod, purgeCustomStart, purgeCustomEnd);
  }, [purgePeriod, purgeCustomStart, purgeCustomEnd]);

  const purgeCounts = useMemo(() => {
    return countRecordsInPeriod(backupData, purgeRange, purgeEntities);
  }, [backupData, purgeRange, purgeEntities]);

  // -------------------------------------------------------------
  // State for "Restaurar por Período"
  // -------------------------------------------------------------
  const [restoreFileParsed, setRestoreFileParsed] = useState<Partial<SgpBackupData> | null>(null);
  const [restoreFileName, setRestoreFileName] = useState<string>('');
  const [restorePeriodType, setRestorePeriodType] = useState<PeriodType | 'todo'>('mes');
  const [restoreCustomStart, setRestoreCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toInputDateFormat(d);
  });
  const [restoreCustomEnd, setRestoreCustomEnd] = useState<string>(() => toInputDateFormat(new Date()));
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [restoreEntities, setRestoreEntities] = useState<EntitySelection>({ ...DEFAULT_ENTITY_SELECTION });

  const restoreRange = useMemo(() => {
    if (restorePeriodType === 'todo') {
      return {
        type: 'personalizado' as PeriodType,
        startDate: new Date(1970, 0, 1),
        endDate: new Date(2100, 11, 31),
        startStr: '1970-01-01',
        endStr: '2100-12-31',
        label: 'Todos los Registros del Archivo'
      };
    }
    return calculatePeriodRange(restorePeriodType, restoreCustomStart, restoreCustomEnd);
  }, [restorePeriodType, restoreCustomStart, restoreCustomEnd]);

  const restoreCounts = useMemo(() => {
    if (!restoreFileParsed) return null;
    return countRecordsInPeriod(restoreFileParsed, restoreRange, restoreEntities);
  }, [restoreFileParsed, restoreRange, restoreEntities]);

  // -------------------------------------------------------------
  // State for "Exportar por Período"
  // -------------------------------------------------------------
  const [exportPeriodType, setExportPeriodType] = useState<PeriodType>('mes');
  const [exportCustomStart, setExportCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toInputDateFormat(d);
  });
  const [exportCustomEnd, setExportCustomEnd] = useState<string>(() => toInputDateFormat(new Date()));
  const [exportEntities, setExportEntities] = useState<EntitySelection>({ ...DEFAULT_ENTITY_SELECTION });

  const exportRange = useMemo(() => {
    return calculatePeriodRange(exportPeriodType, exportCustomStart, exportCustomEnd);
  }, [exportPeriodType, exportCustomStart, exportCustomEnd]);

  const exportCounts = useMemo(() => {
    return countRecordsInPeriod(backupData, exportRange, exportEntities);
  }, [backupData, exportRange, exportEntities]);

  // -------------------------------------------------------------
  // Handlers for General Tab
  // -------------------------------------------------------------
  const handleExportZip = async () => {
    setIsExportingZip(true);
    try {
      await exportSgpCopiaCompletaZip();
      setStatusMessage({ success: true, message: 'Copia Completa SGP_CopiaCompleta.zip generada exitosamente.' });
    } catch (err: any) {
      setStatusMessage({ success: false, message: `Error al generar ZIP: ${err.message}` });
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleExportSingleJson = () => {
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const filename = `sisdic_backup_completo_${new Date().toISOString().slice(0, 10)}.json`;
    saveAs(blob, filename);
    setStatusMessage({ success: true, message: `Archivo ${filename} descargado exitosamente.` });
  };

  const handleFileZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setStatusMessage(null);
    const result = await importSgpCopiaCompletaZip(file);
    setIsImporting(false);
    setStatusMessage(result);
    if (result.success) {
      onRefresh();
    }
    if (fileInputZipRef.current) fileInputZipRef.current.value = '';
  };

  const handleFileJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setStatusMessage(null);
    try {
      const text = await file.text();
      const parsed: SgpBackupData = JSON.parse(text);
      if (!Array.isArray(parsed.personal) || !Array.isArray(parsed.expedientes)) {
        throw new Error('Estructura de JSON inválida. Debe contener tablas de personal y expedientes.');
      }
      await sgpManager.restoreBackupData(parsed);
      setStatusMessage({
        success: true,
        message: 'Base de datos "backup_data.json" restaurada exitosamente.'
      });
      onRefresh();
    } catch (err: any) {
      setStatusMessage({
        success: false,
        message: `Error al restaurar JSON: ${err.message}`
      });
    } finally {
      setIsImporting(false);
      if (fileInputJsonRef.current) fileInputJsonRef.current.value = '';
    }
  };

  const handleFactoryReset = async () => {
    await sgpManager.seedInitial();
    onRefresh();
    setStatusMessage({
      success: true,
      message: 'Base de datos restablecida a los valores iniciales de fábrica.'
    });
  };

  // -------------------------------------------------------------
  // Handlers for "Eliminar por Período"
  // -------------------------------------------------------------
  const togglePurgeEntity = (key: keyof EntitySelection) => {
    setPurgeEntities(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllPurgeEntities = (value: boolean) => {
    setPurgeEntities({
      expedientes: value,
      foliosNumerario: value,
      personas: value,
      licencias: value,
      recargos: value,
      reparaciones: value,
      charlas: value
    });
  };

  const handleInitiatePurge = () => {
    if (purgeCounts.total === 0) {
      alert('No hay registros coincidentes para el período y módulos seleccionados.');
      return;
    }
    setPurgeConfirmationText('');
    setShowPurgeConfirmModal(true);
  };

  const handleExecutePurge = async () => {
    if (purgeConfirmationText.trim().toUpperCase() !== 'CONFIRMAR') {
      alert('Debe escribir exactamente "CONFIRMAR" para ejecutar la depuración.');
      return;
    }

    setShowPurgeConfirmModal(false);
    setIsPurging(true);
    setStatusMessage(null);

    try {
      // 1. Automatic pre-purge safety backup if enabled
      if (autoBackupBeforePurge) {
        const safetyBackup = extractPeriodBackup(backupData, purgeRange, purgeEntities);
        const jsonStr = JSON.stringify(safetyBackup, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const dateStr = new Date().toISOString().slice(0, 10);
        saveAs(blob, `resguardo_seguridad_previo_purga_${purgePeriod}_${dateStr}.json`);
      }

      // 2. Perform deletion on both local Dexie and central SQLite
      const result = await sgpManager.purgeDataByPeriod(purgeRange, purgeEntities, backupData.delegacionId);

      setStatusMessage({
        success: true,
        message: `Depuración completada con éxito. Se eliminaron ${result.total} registros correspondientes a: ${purgeRange.label}.`
      });

      onRefresh();
    } catch (err: any) {
      setStatusMessage({
        success: false,
        message: `Error al depurar registros del período: ${err.message}`
      });
    } finally {
      setIsPurging(false);
    }
  };

  // -------------------------------------------------------------
  // Handlers for "Restaurar por Período"
  // -------------------------------------------------------------
  const handleFileForPeriodRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('El archivo no contiene un JSON válido.');
      }
      setRestoreFileParsed(parsed);
      setRestoreFileName(file.name);
      setStatusMessage({
        success: true,
        message: `Archivo "${file.name}" cargado. Seleccione el período y módulos para restaurar.`
      });
    } catch (err: any) {
      alert(`Error al leer archivo de respaldo: ${err.message}`);
    }
  };

  const handleExecuteRestorePeriod = async () => {
    if (!restoreFileParsed) {
      alert('Debe cargar primero un archivo de respaldo JSON.');
      return;
    }

    if (!restoreCounts || restoreCounts.total === 0) {
      alert('No se encontraron registros en el archivo para el período seleccionado.');
      return;
    }

    const confirmMsg = restoreMode === 'replace'
      ? `¿ATENCIÓN: Modo Sobrescribir activado. Se eliminarán los registros actuales correspondientes a este período (${restoreRange.label}) y se reemplazarán con los del archivo (${restoreCounts.total} registros)?`
      : `¿Confirma la restauración / fusión de ${restoreCounts.total} registros del período ${restoreRange.label}?`;

    if (!window.confirm(confirmMsg)) return;

    setIsRestoringPeriod(true);
    setStatusMessage(null);

    try {
      const result = await sgpManager.restoreDataByPeriod(
        restoreFileParsed,
        restoreRange,
        restoreEntities,
        restoreMode,
        backupData.delegacionId
      );

      setStatusMessage({
        success: true,
        message: `Restauración por período finalizada. Se incorporaron ${result.total} registros para el período ${restoreRange.label}.`
      });

      onRefresh();
    } catch (err: any) {
      setStatusMessage({
        success: false,
        message: `Error durante la restauración: ${err.message}`
      });
    } finally {
      setIsRestoringPeriod(false);
    }
  };

  // -------------------------------------------------------------
  // Handlers for "Exportar por Período"
  // -------------------------------------------------------------
  const handleExecuteExportPeriod = () => {
    if (exportCounts.total === 0) {
      alert('No hay registros coincidentes para el período seleccionado.');
      return;
    }

    const periodData = extractPeriodBackup(backupData, exportRange, exportEntities);
    const jsonStr = JSON.stringify(periodData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const filename = `sisdic_respaldo_${exportPeriodType}_${exportRange.startStr}_al_${exportRange.endStr}.json`;
    saveAs(blob, filename);

    setStatusMessage({
      success: true,
      message: `Copia liviana descargada: ${filename} (${exportCounts.total} registros).`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Archive className="w-6 h-6 text-blue-600 shrink-0" />
            <span>Configuración: Centro de Respaldos y Depuración por Períodos</span>
          </h1>
          <p className="text-xs text-slate-500">
            Exportación, importación total e interoperable, con capacidad de eliminación y restauración selectiva por períodos (Semana, Mes, Año, Personalizado).
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'general'
              ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Respaldos Globales (ZIP / JSON)</span>
        </button>

        <button
          onClick={() => setActiveTab('eliminar_periodo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'eliminar_periodo'
              ? 'bg-rose-600 text-white shadow-xs shadow-rose-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Eliminar Datos por Período</span>
        </button>

        <button
          onClick={() => setActiveTab('restaurar_periodo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'restaurar_periodo'
              ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Restaurar Datos por Período</span>
        </button>

        <button
          onClick={() => setActiveTab('exportar_periodo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'exportar_periodo'
              ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Exportar Respaldo Parcial</span>
        </button>
      </div>

      {/* Global Status Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-fadeIn ${
            statusMessage.success
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            <span className="font-medium">{statusMessage.message}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold underline opacity-70 hover:opacity-100"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: RESPALDOS GENERALES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Database Entity Status Grid */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Estado Actual de Registros en Base de Datos (SQLite Central & IndexedDB)
                </h2>
              </div>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Compresión & Sincronización Activa
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { label: 'Personal', count: backupData.personal.length },
                { label: 'Expedientes', count: backupData.expedientes.length },
                { label: 'Móviles', count: backupData.moviles.length },
                { label: 'Reparaciones', count: backupData.reparaciones.length },
                { label: 'Recargos', count: backupData.recargos.length },
                { label: 'Charlas', count: backupData.charlas.length },
                { label: 'Licencias', count: backupData.licencias.length },
                { label: 'Personas', count: backupData.personas?.length || 0 }
              ].map((entity, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center space-y-1"
                >
                  <span className="text-[10px] uppercase font-bold text-slate-500">{entity.label}</span>
                  <p className="text-xl font-black font-mono text-slate-900 dark:text-white">{entity.count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Main Import/Export Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Panel 1: Paquete Completo ZIP Interoperable */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Archive className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    SGP_CopiaCompleta.zip (Con Adjuntos)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Archivo ZIP con backup_data.json y carpeta attachments con fotos periciales
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Este paquete es 100% compatible con la versión móvil y de escritorio. Permite respaldar o restaurar la totalidad del sistema incluyendo imágenes y recibos oficiales.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleExportZip}
                  disabled={isExportingZip}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExportingZip ? 'Comprimiendo ZIP...' : 'Exportar SGP_CopiaCompleta.zip'}</span>
                </button>

                <input
                  type="file"
                  accept=".zip"
                  ref={fileInputZipRef}
                  onChange={handleFileZipUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputZipRef.current?.click()}
                  disabled={isImporting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>{isImporting ? 'Extrayendo...' : 'Importar Copia ZIP'}</span>
                </button>
              </div>
            </div>

            {/* Panel 2: backup_data.json Unificado */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <FileJson className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    backup_data.json (Estructura Raíz Unificada)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Archivo de texto JSON con las entidades completas y metadatos
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Exporta o restaura directamente el archivo raíz <code className="font-mono text-blue-600">backup_data.json</code> sin comprimir. Ideal para migraciones rápidas de datos tabulares.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleExportSingleJson}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 rounded-xl shadow-xs transition-all active:scale-95"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Exportar backup_data.json</span>
                </button>

                <input
                  type="file"
                  accept=".json"
                  ref={fileInputJsonRef}
                  onChange={handleFileJsonUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputJsonRef.current?.click()}
                  disabled={isImporting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>Importar backup_data.json</span>
                </button>
              </div>
            </div>
          </div>

          {/* Individual Exports Section */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
              Exportaciones Individuales por Módulo
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Personal (JSON)', fn: () => exportIndividualJson('Personal', backupData.personal) },
                { label: 'Expedientes (JSON)', fn: () => exportIndividualJson('Expedientes', backupData.expedientes) },
                { label: 'Móviles (JSON)', fn: () => exportIndividualJson('Moviles', backupData.moviles) },
                { label: 'Reparaciones (JSON)', fn: () => exportIndividualJson('Reparaciones', backupData.reparaciones) },
                { label: 'Recargos (JSON)', fn: () => exportIndividualJson('Recargos', backupData.recargos) },
                { label: 'Charlas (JSON)', fn: () => exportIndividualJson('Charlas', backupData.charlas) },
                { label: 'Licencias (JSON)', fn: () => exportIndividualJson('Licencias', backupData.licencias) },
                { label: 'Personas (JSON)', fn: () => exportIndividualJson('Personas', backupData.personas || []) }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={item.fn}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <span>{item.label}</span>
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                </button>
              ))}
            </div>
          </div>

          {/* Dangerous Zone / Factory Reset */}
          <div className="p-5 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase">
                Restablecer a Valores Iniciales de Fábrica
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-400">
                Reinicia la base de datos con los datos institucionales predeterminados de prueba y limpia modificaciones locales.
              </p>
            </div>

            <button
              onClick={() => setIsConfirmResetOpen(true)}
              className="px-4 py-2 text-xs font-bold text-rose-700 hover:text-white hover:bg-rose-600 rounded-xl border border-rose-300 dark:border-rose-800 transition-colors shrink-0"
            >
              Restablecer Base de Datos
            </button>
          </div>

          <ConfirmDialog
            isOpen={isConfirmResetOpen}
            onClose={() => setIsConfirmResetOpen(false)}
            onConfirm={handleFactoryReset}
            title="Restablecer a Valores de Fábrica"
            message="¿Está seguro de que desea reiniciar la base de datos? Se cargarán los datos predeterminados y se sobreescribirán los registros locales no respaldados."
            confirmText="Restablecer"
            danger={true}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: ELIMINAR DATOS POR PERÍODO */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'eliminar_periodo' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-rose-200 dark:border-rose-900/40 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-rose-100 dark:border-rose-900/30 pb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Depuración y Eliminación Selectiva por Período
                </h2>
                <p className="text-xs text-slate-500">
                  Permite purgar registros transaccionales u operativos (expedientes, folios, licencias, recargos, etc.) correspondientes a una semana, mes, año o rango de fechas específico.
                </p>
              </div>
            </div>

            {/* 1. Selector de Período */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                1. Seleccionar Período a Depurar:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'semana', label: 'Semana Actual', desc: 'Últimos 7 días' },
                  { id: 'mes', label: 'Mes Actual', desc: 'Mes en curso' },
                  { id: 'anio', label: 'Año Actual', desc: 'Año calendario en curso' },
                  { id: 'personalizado', label: 'Personalizado', desc: 'Rango de fechas específico' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPurgePeriod(item.id as PeriodType)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      purgePeriod === item.id
                        ? 'border-rose-600 bg-rose-50/80 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200 shadow-xs ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-xs font-bold">{item.label}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.desc}</span>
                  </button>
                ))}
              </div>

              {/* Custom Date Pickers */}
              {purgePeriod === 'personalizado' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Fecha Desde (Inicio):
                    </label>
                    <input
                      type="date"
                      value={purgeCustomStart}
                      onChange={(e) => setPurgeCustomStart(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Fecha Hasta (Fin):
                    </label>
                    <input
                      type="date"
                      value={purgeCustomEnd}
                      onChange={(e) => setPurgeCustomEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/40">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Rango Activo: {purgeRange.label} (Desde {purgeRange.startStr} hasta {purgeRange.endStr})</span>
              </div>
            </div>

            {/* 2. Selector de Entidades / Módulos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  2. Módulos y Tablas a Incluir en la Depuración:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAllPurgeEntities(true)}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Seleccionar Todos
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    onClick={() => setAllPurgeEntities(false)}
                    className="text-[11px] font-bold text-slate-500 hover:underline"
                  >
                    Deseleccionar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'expedientes' as const, label: 'Expedientes & Pericias', count: purgeCounts.expedientes },
                  { key: 'foliosNumerario' as const, label: 'Folios de Numerario', count: purgeCounts.foliosNumerario },
                  { key: 'personas' as const, label: 'Personas Investigadas', count: purgeCounts.personas },
                  { key: 'licencias' as const, label: 'Licencias de Personal', count: purgeCounts.licencias },
                  { key: 'recargos' as const, label: 'Recargos Operativos', count: purgeCounts.recargos },
                  { key: 'reparaciones' as const, label: 'Reparaciones Móviles', count: purgeCounts.reparaciones },
                  { key: 'charlas' as const, label: 'Charlas & Capacitación', count: purgeCounts.charlas }
                ].map((item) => {
                  const isChecked = purgeEntities[item.key];
                  return (
                    <div
                      key={item.key}
                      onClick={() => togglePurgeEntity(item.key)}
                      className={`p-3 rounded-xl border cursor-pointer select-none transition-all flex items-center justify-between ${
                        isChecked
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="text-xs font-semibold">{item.label}</span>
                      </div>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                        item.count > 0 ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {item.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Live Preview & Confirmation Bar */}
            <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Resumen de Registros Afectados en este Período:
                </span>
                <span className="text-sm font-black font-mono text-rose-400">
                  {purgeCounts.total} registros identificados para eliminar
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoBackupBeforePurge}
                    onChange={(e) => setAutoBackupBeforePurge(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-sm"
                  />
                  <span className="text-xs text-slate-200 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Descargar automáticamente copia de seguridad preventiva antes de eliminar (Recomendado)
                  </span>
                </label>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleInitiatePurge}
                disabled={isPurging || purgeCounts.total === 0}
                className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-950/40 transition-all active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isPurging ? 'Eliminando Registros...' : `Eliminar ${purgeCounts.total} Registros de este Período`}</span>
              </button>
            </div>
          </div>

          {/* Security Confirmation Modal */}
          {showPurgeConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center gap-3 text-rose-600">
                  <AlertCircle className="w-7 h-7 shrink-0" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Confirmación de Seguridad Policial
                  </h3>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Está a punto de eliminar de forma irreversible <strong className="text-rose-600">{purgeCounts.total} registros</strong> correspondientes al período:
                  <br />
                  <strong className="text-slate-900 dark:text-white font-mono mt-1 block">«{purgeRange.label}»</strong>
                </p>

                {autoBackupBeforePurge && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Se descargará automáticamente un archivo JSON con el resguardo de estos {purgeCounts.total} registros antes de purgar.</span>
                  </div>
                )}

                <div className="space-y-1.5 pt-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Escriba <span className="font-mono text-rose-600 font-black">CONFIRMAR</span> para proceder:
                  </label>
                  <input
                    type="text"
                    value={purgeConfirmationText}
                    onChange={(e) => setPurgeConfirmationText(e.target.value)}
                    placeholder="CONFIRMAR"
                    className="w-full px-3 py-2 text-sm font-mono uppercase bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setShowPurgeConfirmModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExecutePurge}
                    disabled={purgeConfirmationText.trim().toUpperCase() !== 'CONFIRMAR'}
                    className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-40 transition-colors"
                  >
                    Ejecutar Depuración
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: RESTAURAR DATOS POR PERÍODO */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'restaurar_periodo' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-emerald-100 dark:border-emerald-900/30 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600 shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Restauración Selectiva de Datos por Período
                </h2>
                <p className="text-xs text-slate-500">
                  Cargue un archivo de respaldo previo (JSON) y restaure únicamente los registros correspondientes a la semana, mes, año o rango de fechas seleccionado sin alterar otros datos.
                </p>
              </div>
            </div>

            {/* File Upload Box */}
            <div className="p-5 border-2 border-dashed border-emerald-300 dark:border-emerald-800/80 rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/20 text-center space-y-3">
              <FileJson className="w-8 h-8 text-emerald-600 mx-auto" />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {restoreFileName ? `Archivo Cargado: ${restoreFileName}` : 'Seleccione o arrastre el archivo de respaldo (JSON)'}
                </span>
                <span className="text-[11px] text-slate-500">
                  Puede ser un backup_data.json completo o un resguardo previo de depuración
                </span>
              </div>

              <input
                type="file"
                accept=".json"
                ref={fileInputRestorePeriodRef}
                onChange={handleFileForPeriodRestore}
                className="hidden"
              />

              <button
                onClick={() => fileInputRestorePeriodRef.current?.click()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                {restoreFileName ? 'Cambiar Archivo' : 'Cargar Archivo JSON'}
              </button>
            </div>

            {/* Configuration for restoration if file is loaded */}
            {restoreFileParsed && (
              <div className="space-y-6 pt-2 animate-fadeIn">
                {/* 1. Selector de Período para restaurar */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    1. Período a Extraer y Restaurar desde el Archivo:
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { id: 'semana', label: 'Semana Actual', desc: 'Últimos 7 días' },
                      { id: 'mes', label: 'Mes Actual', desc: 'Mes en curso' },
                      { id: 'anio', label: 'Año Actual', desc: 'Año en curso' },
                      { id: 'personalizado', label: 'Personalizado', desc: 'Rango fecha' },
                      { id: 'todo', label: 'Todo el Archivo', desc: 'Sin filtro fecha' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setRestorePeriodType(item.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          restorePeriodType === item.id
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <span className="block text-xs font-bold">{item.label}</span>
                        <span className="text-[10px] text-slate-500">{item.desc}</span>
                      </button>
                    ))}
                  </div>

                  {restorePeriodType === 'personalizado' && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Fecha Desde:
                        </label>
                        <input
                          type="date"
                          value={restoreCustomStart}
                          onChange={(e) => setRestoreCustomStart(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Fecha Hasta:
                        </label>
                        <input
                          type="date"
                          value={restoreCustomEnd}
                          onChange={(e) => setRestoreCustomEnd(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Modo de Restauración */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    2. Modo de Incorporación:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      restoreMode === 'merge'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}>
                      <input
                        type="radio"
                        name="restoreMode"
                        checked={restoreMode === 'merge'}
                        onChange={() => setRestoreMode('merge')}
                        className="mt-1"
                      />
                      <div>
                        <span className="block text-xs font-bold text-slate-900 dark:text-white">
                          Fusión Inteligente (Conservar registros existentes)
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Agrega o actualiza los registros del período sin eliminar datos existentes de otras fechas ni crear duplicados.
                        </p>
                      </div>
                    </label>

                    <label className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      restoreMode === 'replace'
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/40'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}>
                      <input
                        type="radio"
                        name="restoreMode"
                        checked={restoreMode === 'replace'}
                        onChange={() => setRestoreMode('replace')}
                        className="mt-1"
                      />
                      <div>
                        <span className="block text-xs font-bold text-slate-900 dark:text-white">
                          Sobrescribir únicamente el período seleccionado
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Limpia los registros actuales pertenecientes a este rango y los reemplaza fielmente con los del archivo.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Preview of items detected in file */}
                {restoreCounts && (
                  <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-slate-300 uppercase">
                        Registros Detectados en el Archivo para este Período:
                      </span>
                      <span className="text-sm font-black font-mono text-emerald-400">
                        {restoreCounts.total} registros listos
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div className="bg-slate-800/60 p-2 rounded-lg">Expedientes: {restoreCounts.expedientes}</div>
                      <div className="bg-slate-800/60 p-2 rounded-lg">Folios: {restoreCounts.foliosNumerario}</div>
                      <div className="bg-slate-800/60 p-2 rounded-lg">Personas: {restoreCounts.personas}</div>
                      <div className="bg-slate-800/60 p-2 rounded-lg">Licencias: {restoreCounts.licencias}</div>
                      <div className="bg-slate-800/60 p-2 rounded-lg">Recargos: {restoreCounts.recargos}</div>
                      <div className="bg-slate-800/60 p-2 rounded-lg">Reparaciones: {restoreCounts.reparaciones}</div>
                      <div className="bg-slate-800/60 p-2 rounded-lg">Charlas: {restoreCounts.charlas}</div>
                    </div>
                  </div>
                )}

                {/* Execute button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleExecuteRestorePeriod}
                    disabled={isRestoringPeriod || !restoreCounts || restoreCounts.total === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRestoringPeriod ? 'animate-spin' : ''}`} />
                    <span>{isRestoringPeriod ? 'Restaurando...' : `Restaurar ${restoreCounts?.total || 0} Registros del Período`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: EXPORTAR RESPALDO PARCIAL */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'exportar_periodo' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900/40 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-indigo-100 dark:border-indigo-900/30 pb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Exportación Parcial y Copia Liviana por Período
                </h2>
                <p className="text-xs text-slate-500">
                  Genere un archivo JSON liviano que contenga exclusivamente los registros correspondientes al período seleccionado (ideal para auditorías, transferencias rápidas y archivo histórico).
                </p>
              </div>
            </div>

            {/* Period Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Seleccionar Período a Exportar:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'semana', label: 'Semana Actual', desc: 'Últimos 7 días' },
                  { id: 'mes', label: 'Mes Actual', desc: 'Mes en curso' },
                  { id: 'anio', label: 'Año Actual', desc: 'Año calendario en curso' },
                  { id: 'personalizado', label: 'Personalizado', desc: 'Rango de fechas' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setExportPeriodType(item.id as PeriodType)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      exportPeriodType === item.id
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-xs font-bold">{item.label}</span>
                    <span className="text-[10px] text-slate-500">{item.desc}</span>
                  </button>
                ))}
              </div>

              {exportPeriodType === 'personalizado' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Fecha Desde:
                    </label>
                    <input
                      type="date"
                      value={exportCustomStart}
                      onChange={(e) => setExportCustomStart(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Fecha Hasta:
                    </label>
                    <input
                      type="date"
                      value={exportCustomEnd}
                      onChange={(e) => setExportCustomEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Counts preview */}
            <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-300 block">
                  Período: {exportRange.label}
                </span>
                <span className="text-[11px] text-slate-400">
                  Total de registros a empaquetar: <strong className="text-indigo-400 font-mono font-bold">{exportCounts.total}</strong>
                </span>
              </div>

              <button
                onClick={handleExecuteExportPeriod}
                disabled={exportCounts.total === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Copia Liviana ({exportCounts.total})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
