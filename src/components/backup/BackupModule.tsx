import React, { useState, useRef } from 'react';
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
  HardDrive
} from 'lucide-react';
import { SgpBackupData, Personal } from '../../types/sgp';
import {
  exportSgpCopiaCompletaZip,
  importSgpCopiaCompletaZip,
  exportIndividualJson,
  exportPersonalAgrupadoTxt
} from '../../utils/sgpBackupZip';
import { saveAs } from 'file-saver';
import { sgpManager } from '../../db/dexieDb';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface BackupModuleProps {
  backupData: SgpBackupData;
  onRefresh: () => void;
}

export const BackupModule: React.FC<BackupModuleProps> = ({ backupData, onRefresh }) => {
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  const fileInputZipRef = useRef<HTMLInputElement>(null);
  const fileInputJsonRef = useRef<HTMLInputElement>(null);

  // 1. Export SGP_CopiaCompleta.zip
  const handleExportZip = async () => {
    setIsExportingZip(true);
    try {
      await exportSgpCopiaCompletaZip();
    } catch (err: any) {
      alert(`Error al generar ZIP: ${err.message}`);
    } finally {
      setIsExportingZip(false);
    }
  };

  // 2. Export backup_data.json single file
  const handleExportSingleJson = () => {
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    saveAs(blob, 'backup_data.json');
  };

  // 3. Import SGP_CopiaCompleta.zip
  const handleFileZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);
    const result = await importSgpCopiaCompletaZip(file);
    setIsImporting(false);
    setImportStatus(result);
    if (result.success) {
      onRefresh();
    }
    if (fileInputZipRef.current) fileInputZipRef.current.value = '';
  };

  // 4. Import backup_data.json
  const handleFileJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);
    try {
      const text = await file.text();
      const parsed: SgpBackupData = JSON.parse(text);
      if (!Array.isArray(parsed.personal) || !Array.isArray(parsed.expedientes)) {
        throw new Error('Estructura de JSON inválida. Debe contener tablas de personal y expedientes.');
      }
      await sgpManager.restoreBackupData(parsed);
      setImportStatus({
        success: true,
        message: 'Base de datos "backup_data.json" restaurada exitosamente.'
      });
      onRefresh();
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: `Error al restaurar JSON: ${err.message}`
      });
    } finally {
      setIsImporting(false);
      if (fileInputJsonRef.current) fileInputJsonRef.current.value = '';
    }
  };

  // 5. Factory Reset
  const handleFactoryReset = async () => {
    await sgpManager.seedInitial();
    onRefresh();
    setImportStatus({
      success: true,
      message: 'Base de datos restablecida a los valores de fábrica iniciales.'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Archive className="w-6 h-6 text-blue-600" />
            <span>Centro de Respaldos e Interoperabilidad SisPol</span>
          </h1>
          <p className="text-xs text-slate-500">
            Exportación e importación 100% compatible con la app móvil (ZIP con adjuntos y backup_data.json)
          </p>
        </div>
      </div>

      {/* Database Entity Status Grid */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Estado de la Base de Datos Local (IndexedDB / Dexie.js)
            </h2>
          </div>
          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Offline-First Activo
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
            { label: 'Catálogos', count: backupData.dynamicCatalogs.length }
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
                Archivo ZIP con "backup_data.json" y carpeta "attachments/" con fotos de oficios y recibos
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Este paquete es exactamente idéntico al generado por la aplicación Android de SisPol.
            Permite respaldar o restaurar la totalidad del sistema incluyendo todas las imágenes de cadena de custodia y recibos de elevación.
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
                Archivo de texto JSON con las 9 entidades completas
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Exporta o restaura directamente el archivo raíz <code className="font-mono text-blue-600">backup_data.json</code> sin comprimir.
            Ideal para migraciones rápidas de datos tabulares y metadatos.
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

      {/* Status Alert if import executed */}
      {importStatus && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
            importStatus.success
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200'
          }`}
        >
          {importStatus.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{importStatus.message}</span>
        </div>
      )}

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
            { label: 'Catálogos (JSON)', fn: () => exportIndividualJson('Catalogos', backupData.dynamicCatalogs) }
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
            Reinicia la base de datos con los datos institucionales de prueba de Laguna Blanca y limpia modificaciones locales.
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
        message="¿Está seguro de que desea reiniciar la base de datos? Se cargarán los datos predeterminados de la Delegación Laguna Blanca y se sobreescribirán los registros locales no respaldados."
        confirmText="Restablecer"
        danger={true}
      />
    </div>
  );
};
