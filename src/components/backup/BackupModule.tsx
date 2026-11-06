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
  AlertCircle,
  Sparkles,
  Zap,
  Check,
  X
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

type TabType = 'general' | 'vaciar_todo' | 'eliminar_periodo' | 'restaurar_periodo' | 'exportar_periodo';

interface ClearAllOptions {
  clearExpedientes: boolean;
  clearPersonal: boolean;
  clearFolios: boolean;
  clearPersonas: boolean;
  clearLicencias: boolean;
  clearMoviles: boolean;
  clearReparaciones: boolean;
  clearRecargos: boolean;
  clearCharlas: boolean;
}

const DEFAULT_CLEAR_OPTIONS: ClearAllOptions = {
  clearExpedientes: true,
  clearPersonal: true,
  clearFolios: true,
  clearPersonas: true,
  clearLicencias: true,
  clearMoviles: true,
  clearReparaciones: true,
  clearRecargos: true,
  clearCharlas: true
};

export const BackupModule: React.FC<BackupModuleProps> = ({ backupData, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isRestoringPeriod, setIsRestoringPeriod] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ success: boolean; message: string } | null>(null);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  // File Inputs
  const fileInputZipRef = useRef<HTMLInputElement>(null);
  const fileInputJsonRef = useRef<HTMLInputElement>(null);
  const fileInputRestorePeriodRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // State for "Vaciar Todo (Iniciar Sistema Limpio)"
  // -------------------------------------------------------------
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearAllConfirmText, setClearAllConfirmText] = useState('');
  const [autoBackupBeforeClear, setAutoBackupBeforeClear] = useState(true);
  const [clearOptions, setClearOptions] = useState<ClearAllOptions>({ ...DEFAULT_CLEAR_OPTIONS });

  const totalOperationalRecords = useMemo(() => {
    return (
      (backupData.expedientes?.length || 0) +
      (backupData.personal?.length || 0) +
      (backupData.foliosNumerario?.length || 0) +
      (backupData.personas?.length || 0) +
      (backupData.licencias?.length || 0) +
      (backupData.moviles?.length || 0) +
      (backupData.reparaciones?.length || 0) +
      (backupData.recargos?.length || 0) +
      (backupData.charlas?.length || 0)
    );
  }, [backupData]);

  const selectedClearCount = useMemo(() => {
    let count = 0;
    if (clearOptions.clearExpedientes) count += (backupData.expedientes?.length || 0);
    if (clearOptions.clearPersonal) count += (backupData.personal?.length || 0);
    if (clearOptions.clearFolios) count += (backupData.foliosNumerario?.length || 0);
    if (clearOptions.clearPersonas) count += (backupData.personas?.length || 0);
    if (clearOptions.clearLicencias) count += (backupData.licencias?.length || 0);
    if (clearOptions.clearMoviles) count += (backupData.moviles?.length || 0);
    if (clearOptions.clearReparaciones) count += (backupData.reparaciones?.length || 0);
    if (clearOptions.clearRecargos) count += (backupData.recargos?.length || 0);
    if (clearOptions.clearCharlas) count += (backupData.charlas?.length || 0);
    return count;
  }, [backupData, clearOptions]);

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
      message: 'Base de datos restablecida a los valores iniciales de prueba.'
    });
  };

  // -------------------------------------------------------------
  // Handlers for "Vaciar Todo (Iniciar Sistema Limpio)"
  // -------------------------------------------------------------
  const toggleClearOption = (key: keyof ClearAllOptions) => {
    setClearOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllClearOptions = (val: boolean) => {
    setClearOptions({
      clearExpedientes: val,
      clearPersonal: val,
      clearFolios: val,
      clearPersonas: val,
      clearLicencias: val,
      clearMoviles: val,
      clearReparaciones: val,
      clearRecargos: val,
      clearCharlas: val
    });
  };

  const handleInitiateClearAll = () => {
    if (selectedClearCount === 0) {
      alert('No hay módulos seleccionados o los registros ya están en 0.');
      return;
    }
    setClearAllConfirmText('');
    setShowClearAllModal(true);
  };

  const handleExecuteClearAll = async () => {
    if (clearAllConfirmText.trim().toUpperCase() !== 'ELIMINAR TODO') {
      alert('Debe escribir exactamente "ELIMINAR TODO" para confirmar el vaciado del sistema.');
      return;
    }

    setShowClearAllModal(false);
    setIsClearingAll(true);
    setStatusMessage(null);

    try {
      // 1. Automatic complete safety backup if selected
      if (autoBackupBeforeClear) {
        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const dateStr = new Date().toISOString().slice(0, 10);
        saveAs(blob, `sisdic_copia_seguridad_completa_previa_vaciado_${dateStr}.json`);
      }

      // 2. Perform wipe on IndexedDB and SQLite
      await sgpManager.clearAllData(clearOptions);

      setStatusMessage({
        success: true,
        message: `Base de datos vaciada con éxito (${selectedClearCount} registros eliminados). El sistema está completamente limpio para cargar sus propios datos reales.`
      });

      onRefresh();
    } catch (err: any) {
      setStatusMessage({
        success: false,
        message: `Error al vaciar los datos: ${err.message}`
      });
    } finally {
      setIsClearingAll(false);
    }
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
      if (autoBackupBeforePurge) {
        const safetyBackup = extractPeriodBackup(backupData, purgeRange, purgeEntities);
        const jsonStr = JSON.stringify(safetyBackup, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const dateStr = new Date().toISOString().slice(0, 10);
        saveAs(blob, `resguardo_seguridad_previo_purga_${purgePeriod}_${dateStr}.json`);
      }

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
            <span>Configuración: Centro de Respaldos y Gestión de Datos</span>
          </h1>
          <p className="text-xs text-slate-500">
            Administración completa de datos: respaldos completos (ZIP/JSON), depuración por períodos y vaciado total para iniciar con datos reales propios.
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

        {/* Tab Vaciar Todo */}
        <button
          onClick={() => setActiveTab('vaciar_todo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'vaciar_todo'
              ? 'bg-red-600 text-white shadow-xs shadow-red-500/30 ring-2 ring-red-500/20'
              : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40'
          }`}
        >
          <Trash2 className="w-4 h-4 text-red-500" />
          <span>Vaciar Todo (Iniciar Sistema Limpio)</span>
        </button>

        <button
          onClick={() => setActiveTab('eliminar_periodo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'eliminar_periodo'
              ? 'bg-rose-600 text-white shadow-xs shadow-rose-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Eliminar por Período</span>
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
      {/* TAB: VACIAR TODO (INICIAR SISTEMA LIMPIO) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'vaciar_todo' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-red-200 dark:border-red-900/50 shadow-xl space-y-6">
            {/* Header Box */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-red-100 dark:border-red-900/30 pb-5">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 flex items-center justify-center text-red-600 shrink-0 ring-4 ring-red-50 dark:ring-red-950/40">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Vaciar Todo el Sistema (Iniciar con Datos Reales Propios)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Elimina todos los datos de prueba y registros precargados dejando los contadores en 0 para que pueda ingresar sus propios expedientes, legajos y evidencias institucionales.
                  </p>
                </div>
              </div>

              <div className="px-4 py-2 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-right">
                <span className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 block">Registros Actuales Cargados</span>
                <span className="text-xl font-black font-mono text-red-700 dark:text-red-300">{totalOperationalRecords}</span>
              </div>
            </div>

            {/* Step 1: Respaldo Preventivo */}
            <div className="p-5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Paso 1: Copia de Seguridad Preventiva (Recomendado)</span>
              </div>
              <p className="text-xs text-blue-800 dark:text-blue-300/80 leading-relaxed">
                Antes de vaciar el sistema, le recomendamos descargar una copia de seguridad completa con todos los datos actuales. Podrá restaurarla en cualquier momento si lo necesita.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExportSingleJson}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Descargar Copia Completa (JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportZip}
                  disabled={isExportingZip}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExportingZip ? 'Generando ZIP...' : 'Descargar ZIP con Adjuntos'}</span>
                </button>
              </div>

              <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/40">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoBackupBeforeClear}
                    onChange={(e) => setAutoBackupBeforeClear(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-sm"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Generar y descargar automáticamente copia de seguridad completa antes de vaciar la base de datos
                  </span>
                </label>
              </div>
            </div>

            {/* Step 2: Selección de Módulos a Vaciar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Paso 2: Módulos a Vaciar (Seleccione los datos que desea poner a cero):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAllClearOptions(true)}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Seleccionar Todos
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    onClick={() => setAllClearOptions(false)}
                    className="text-[11px] font-bold text-slate-500 hover:underline"
                  >
                    Deseleccionar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { key: 'clearExpedientes' as const, label: 'Expedientes & Evidencias', count: backupData.expedientes?.length || 0, desc: 'Causas judiciales y pericias' },
                  { key: 'clearPersonal' as const, label: 'Personal & Legajos', count: backupData.personal?.length || 0, desc: 'Efectivos policiales precargados' },
                  { key: 'clearFolios' as const, label: 'Numerario & Folios', count: backupData.foliosNumerario?.length || 0, desc: 'Folios y asignaciones de numerario' },
                  { key: 'clearPersonas' as const, label: 'Personas (Evidencias)', count: backupData.personas?.length || 0, desc: 'Personas investigadas e imputadas' },
                  { key: 'clearLicencias' as const, label: 'Licencias & Cuatrienio', count: backupData.licencias?.length || 0, desc: 'Novedades y registros de licencias' },
                  { key: 'clearRecargos' as const, label: 'Recargos de Servicio', count: backupData.recargos?.length || 0, desc: 'Planillas de recargos operativos' },
                  { key: 'clearMoviles' as const, label: 'Parque Automotor (Móviles)', count: backupData.moviles?.length || 0, desc: 'Móviles y patrulleros' },
                  { key: 'clearReparaciones' as const, label: 'Reparaciones Mecánicas', count: backupData.reparaciones?.length || 0, desc: 'Historial de taller y services' },
                  { key: 'clearCharlas' as const, label: 'Charlas & Capacitaciones', count: backupData.charlas?.length || 0, desc: 'Eventos y charlas preventivas' }
                ].map((item) => {
                  const isChecked = clearOptions[item.key];
                  return (
                    <div
                      key={item.key}
                      onClick={() => toggleClearOption(item.key)}
                      className={`p-3.5 rounded-2xl border cursor-pointer select-none transition-all flex items-start justify-between gap-3 ${
                        isChecked
                          ? 'border-red-400 bg-red-50/40 dark:bg-red-950/20 text-slate-900 dark:text-white ring-1 ring-red-400/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-400'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-red-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold block">{item.label}</span>
                          <span className="text-[10px] text-slate-500 block">{item.desc}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        item.count > 0 ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        {item.count}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Nota de Seguridad:</strong> Su usuario administrador, contraseñas, roles de acceso y categorías de catálogos base se mantendrán intactos para que pueda seguir administrando el sistema.
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-950 text-white rounded-2xl border border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Total a Vaciar:
                </span>
                <span className="text-base font-black font-mono text-red-400">
                  {selectedClearCount} registros seleccionados para eliminar
                </span>
              </div>

              <button
                type="button"
                onClick={handleInitiateClearAll}
                disabled={isClearingAll || selectedClearCount === 0}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs shadow-lg shadow-red-950/60 transition-all active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isClearingAll ? 'Vaciando Base de Datos...' : `Vaciar Todos los Datos (${selectedClearCount} registros)`}</span>
              </button>
            </div>
          </div>

          {/* Modal de Confirmación de Vaciado */}
          {showClearAllModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 border-2 border-red-500 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
                <div className="flex items-center gap-3 text-red-600">
                  <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Confirmar Vaciado Total de la Base de Datos
                    </h3>
                    <span className="text-xs text-red-600 font-bold uppercase tracking-wider">
                      Acción irreversible de puesta a cero
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-xs text-red-950 dark:text-red-200 space-y-2">
                  <p>
                    Está a punto de eliminar <strong>{selectedClearCount} registros cargados</strong> del sistema (expedientes, personal, folios, evidencias, etc.) para comenzar desde cero con sus propios datos reales.
                  </p>
                  {autoBackupBeforeClear && (
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold pt-1">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Se generará y descargará automáticamente un archivo JSON con la copia completa antes de vaciar.</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Escriba exactamente <span className="font-mono text-red-600 font-black">ELIMINAR TODO</span> para confirmar:
                  </label>
                  <input
                    type="text"
                    value={clearAllConfirmText}
                    onChange={(e) => setClearAllConfirmText(e.target.value)}
                    placeholder="ELIMINAR TODO"
                    className="w-full px-4 py-2.5 text-sm font-mono uppercase bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setShowClearAllModal(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExecuteClearAll}
                    disabled={clearAllConfirmText.trim().toUpperCase() !== 'ELIMINAR TODO'}
                    className="px-6 py-2.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-40 transition-colors shadow-lg shadow-red-950/40"
                  >
                    Vaciar Todo Ahora
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: RESPALDOS GENERALES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Banner Directo: Vaciar datos para cargar los propios */}
          <div className="p-5 bg-gradient-to-r from-red-950/30 via-slate-900 to-slate-900 rounded-2xl border-2 border-red-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>¿Desea vaciar todos los datos precargados para ingresar los suyos?</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
                    {totalOperationalRecords} registros
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Elimine los expedientes, legajos y numerario de prueba con resguardo preventivo automático antes de vaciar.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('vaciar_todo')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 shrink-0"
            >
              Vaciar Todo y Empezar Limpio
            </button>
          </div>

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
          <div className="p-5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                Restablecer a Valores Iniciales de Fábrica (Datos Demo)
              </h4>
              <p className="text-xs text-slate-500">
                Reinicia la base de datos con los datos institucionales de prueba de Laguna Blanca.
              </p>
            </div>

            <button
              onClick={() => setIsConfirmResetOpen(true)}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-600 transition-colors shrink-0"
            >
              Restablecer Valores Demo
            </button>
          </div>

          <ConfirmDialog
            isOpen={isConfirmResetOpen}
            onClose={() => setIsConfirmResetOpen(false)}
            onConfirm={handleFactoryReset}
            title="Restablecer a Valores de Fábrica"
            message="¿Está seguro de que desea reiniciar la base de datos? Se cargarán los datos predeterminados de prueba y se sobreescribirán los registros locales."
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
                  Permite purgar registros transaccionales u operativos correspondientes a una semana, mes, año o rango de fechas específico.
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
