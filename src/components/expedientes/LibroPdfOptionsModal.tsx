import React, { useState, useMemo } from 'react';
import { X, FileText, Calendar, Filter, Eye, Download, Hash, Layers, Compass } from 'lucide-react';
import { Expediente, InstitutionalConfig, ExpedienteCustomFields } from '../../types/sgp';
import { generateExpedientesLogbookDoc, SgpPaperSize, SgpOrientation } from '../../utils/sgpPdfGenerator';
import { PdfPreviewModal } from '../common/PdfPreviewModal';

interface LibroPdfOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expedientes: Expediente[];
  config: InstitutionalConfig;
}

export const LibroPdfOptionsModal: React.FC<LibroPdfOptionsModalProps> = ({
  isOpen,
  onClose,
  expedientes,
  config
}) => {
  const [periodo, setPeriodo] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM'>('ALL');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [desdeNroExpediente, setDesdeNroExpediente] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'ALL' | 'CON_OFICIO' | 'FALTA_OFICIO' | 'SOLO_PPI'>('ALL');
  const [conGraficos, setConGraficos] = useState<boolean>(true);
  const [paperSize, setPaperSize] = useState<SgpPaperSize>('a4');
  const [orientation, setOrientation] = useState<SgpOrientation>('landscape');


  // Preview Modal state
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFilename, setPreviewFilename] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Filtered Expedientes for the Logbook
  const filteredExpedientes = useMemo(() => {
    return expedientes.filter((e) => {
      let custom: ExpedienteCustomFields = {};
      try {
        custom = e.customFieldsJson ? JSON.parse(e.customFieldsJson) : {};
      } catch {
        // ignore
      }

      // Filter by Type
      if (filtroTipo === 'CON_OFICIO' && custom.isFaltaOficio) return false;
      if (filtroTipo === 'FALTA_OFICIO' && !custom.isFaltaOficio) return false;
      if (filtroTipo === 'SOLO_PPI' && !custom.isPPI) return false;

      // Filter "Desde N° de Expediente"
      if (desdeNroExpediente.trim()) {
        const threshold = parseInt(desdeNroExpediente.trim().replace(/\D/g, ''), 10);
        if (!isNaN(threshold)) {
          const expNum = parseInt(e.nroExpediente.replace(/\D/g, ''), 10);
          if (!isNaN(expNum) && expNum < threshold) {
            return false;
          }
        }
      }

      // Filter by Time / Period
      if (periodo === 'ALL') return true;
      if (!e.fechaIngreso) return true;

      const parts = e.fechaIngreso.split('/');
      if (parts.length !== 3) return true;
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (periodo === 'TODAY') {
        return (
          date.getDate() === now.getDate() &&
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      }

      if (periodo === 'WEEK') {
        const diffDays = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }

      if (periodo === 'MONTH') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }

      if (periodo === 'YEAR') {
        return date.getFullYear() === (parseInt(e.anio, 10) || now.getFullYear());
      }

      if (periodo === 'CUSTOM') {
        if (fechaDesde) {
          const [fy, fm, fd] = fechaDesde.split('-').map(Number);
          const fromDate = new Date(fy, fm - 1, fd);
          if (date < fromDate) return false;
        }
        if (fechaHasta) {
          const [ty, tm, td] = fechaHasta.split('-').map(Number);
          const toDate = new Date(ty, tm - 1, td, 23, 59, 59);
          if (date > toDate) return false;
        }
      }

      return true;
    });
  }, [expedientes, periodo, fechaDesde, fechaHasta, desdeNroExpediente, filtroTipo]);

  if (!isOpen) return null;

  const getFilterTitle = () => {
    let t = 'Libro Oficial de Registro de Expedientes';
    if (periodo === 'TODAY') t += ' • Período Diario';
    else if (periodo === 'WEEK') t += ' • Período Semanal';
    else if (periodo === 'MONTH') t += ' • Período Mensual';
    else if (periodo === 'YEAR') t += ' • Período Anual';
    else if (periodo === 'CUSTOM') t += ` • Del ${fechaDesde || 'inicio'} al ${fechaHasta || 'cierre'}`;

    if (desdeNroExpediente.trim()) {
      t += ` (Desde Expte. N° ${desdeNroExpediente.trim()})`;
    }
    return t;
  };

  const buildDoc = (pSize = paperSize, pOrient = orientation) => {
    const title = getFilterTitle();
    return generateExpedientesLogbookDoc(config, filteredExpedientes, title, {
      paperSize: pSize,
      orientation: pOrient
    });
  };

  const handleOpenPreview = () => {
    const doc = buildDoc();
    const blob = doc.output('blob');
    setPreviewBlob(blob);
    setPreviewFilename(`SGP_Libro_Expedientes_${new Date().toISOString().slice(0, 10)}.pdf`);
    setIsPreviewOpen(true);
  };

  const handleDownloadDirect = () => {
    const doc = buildDoc();
    doc.save(`SGP_Libro_Expedientes_${new Date().toISOString().slice(0, 10)}.pdf`);
    onClose();
  };

  const handleChangePreviewFormat = (newSize: SgpPaperSize, newOrient: SgpOrientation) => {
    setPaperSize(newSize);
    setOrientation(newOrient);
    const doc = buildDoc(newSize, newOrient);
    setPreviewBlob(doc.output('blob'));
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Generar Libro Oficial en PDF
                </h3>
                <p className="text-xs text-slate-500">
                  Selección de período temporal, N° inicial, tamaño de papel y orientación
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Options */}
          <div className="space-y-4 text-xs">
            {/* 1. Selector de Tiempo / Período */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Período Temporal de la Vista</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { id: 'ALL', label: 'Todos' },
                  { id: 'TODAY', label: 'Hoy' },
                  { id: 'WEEK', label: 'Esta Semana' },
                  { id: 'MONTH', label: 'Este Mes' },
                  { id: 'YEAR', label: 'Este Año' },
                  { id: 'CUSTOM', label: 'Rango Fechas' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPeriodo(p.id as any)}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all ${
                      periodo === p.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {periodo === 'CUSTOM' && (
                <div className="grid grid-cols-2 gap-3 mt-2.5 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Desde Fecha:</label>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Hasta Fecha:</label>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Filtro "Desde N° de Expediente" */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-600" />
                <span>Especificar desde qué N° de Expediente emitir</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ej: 120 (Incluirá del 120 en adelante)..."
                  value={desdeNroExpediente}
                  onChange={(e) => setDesdeNroExpediente(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {desdeNroExpediente && (
                  <button
                    type="button"
                    onClick={() => setDesdeNroExpediente('')}
                    className="text-xs text-slate-400 hover:text-rose-500 px-2 py-1"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* 3. Filtro por Tipo de Causa */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                <span>Tipo de Actuaciones</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'ALL', label: 'Todos' },
                  { id: 'CON_OFICIO', label: 'Con Oficio' },
                  { id: 'FALTA_OFICIO', label: 'Sin Oficio' },
                  { id: 'SOLO_PPI', label: 'Solo PPI' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltroTipo(f.id as any)}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all ${
                      filtroTipo === f.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Tamaño de Papel y Orientación */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tamaño de Papel</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'a4', label: 'A4' },
                    { id: 'legal', label: 'Oficio' },
                    { id: 'letter', label: 'Carta' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPaperSize(p.id as any)}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        paperSize === p.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-blue-600" />
                  <span>Orientación de Hoja</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'landscape', label: 'Horizontal (Recom.)' },
                    { id: 'portrait', label: 'Vertical' }
                  ].map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOrientation(o.id as any)}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        orientation === o.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Opciones de Gráficos y Estadísticas */}
            <label className="flex items-center gap-2 p-2 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800 cursor-pointer">
              <input
                type="checkbox"
                checked={conGraficos}
                onChange={(e) => setConGraficos(e.target.checked)}
                className="rounded border-blue-400 text-blue-600"
              />
              <span className="text-xs">Incluir Resumen Gráfico / Estadístico de Expedientes</span>
            </label>

            {/* Total Filtered Preview Counter */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 flex items-center justify-between">

              <span className="text-xs text-blue-900 dark:text-blue-300 font-medium">
                Expedientes listos para incluir en el reporte oficial:
              </span>
              <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                {filteredExpedientes.length} expedientes
              </span>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleOpenPreview}
              disabled={filteredExpedientes.length === 0}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl transition-all shadow-xs ${
                filteredExpedientes.length > 0
                  ? 'bg-slate-800 hover:bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              title="Abrir vista preliminar del documento antes de descargar"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Vista Preliminar</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadDirect}
              disabled={filteredExpedientes.length === 0}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all active:scale-95 ${
                filteredExpedientes.length > 0
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Descargar PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Document Preview Modal */}
      {isPreviewOpen && (
        <PdfPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          title={getFilterTitle()}
          pdfBlob={previewBlob}
          filename={previewFilename}
          paperSize={paperSize}
          orientation={orientation}
          onChangeFormat={handleChangePreviewFormat}
        />
      )}
    </>
  );
};
