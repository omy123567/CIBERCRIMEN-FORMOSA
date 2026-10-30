import React, { useState } from 'react';
import { X, FileDown, CheckSquare, Calendar, Filter, Eye, Download, Layers, Compass } from 'lucide-react';
import { Movil, Reparacion, InstitutionalConfig } from '../../types/sgp';
import { generateMovilFichaTecnicaDoc, SgpPaperSize, SgpOrientation } from '../../utils/sgpPdfGenerator';
import { PdfPreviewModal } from '../common/PdfPreviewModal';

interface MovilPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  movil: Movil;
  reparaciones: Reparacion[];
  institutionalConfig: InstitutionalConfig;
}

export const MovilPdfModal: React.FC<MovilPdfModalProps> = ({
  isOpen,
  onClose,
  movil,
  reparaciones,
  institutionalConfig
}) => {
  const [includeIdentification, setIncludeIdentification] = useState(true);
  const [includeCondition, setIncludeCondition] = useState(true);
  const [includeService, setIncludeService] = useState(true);
  const [includeRto, setIncludeRto] = useState(true);
  const [includeInsurance, setIncludeInsurance] = useState(true);
  const [includeRepairs, setIncludeRepairs] = useState(true);
  const [includeObservations, setIncludeObservations] = useState(true);
  const [conGraficos, setConGraficos] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);

  // Period options: 'all' | 'weekly' | 'monthly' | 'annual' | 'custom'
  const [repairPeriod, setRepairPeriod] = useState<'all' | 'weekly' | 'monthly' | 'annual' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [paperSize, setPaperSize] = useState<SgpPaperSize>('a4');
  const [orientation, setOrientation] = useState<SgpOrientation>('portrait');

  // Preview Modal state
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFilename, setPreviewFilename] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  if (!isOpen) return null;

  const buildDoc = (pSize = paperSize, pOrient = orientation) => {
    return generateMovilFichaTecnicaDoc(institutionalConfig, movil, reparaciones, {
      includeIdentification,
      includeCondition,
      includeService,
      includeRto,
      includeInsurance,
      includeRepairs,
      includeObservations,
      conGraficos,
      includeSignature,
      repairPeriod,
      customStartDate,
      customEndDate,
      paperSize: pSize,
      orientation: pOrient
    });
  };


  const handleOpenPreview = () => {
    const doc = buildDoc();
    const blob = doc.output('blob');
    setPreviewBlob(blob);
    setPreviewFilename(`SGP_Ficha_Movil_${movil.identificador}_${new Date().toISOString().slice(0, 10)}.pdf`);
    setIsPreviewOpen(true);
  };

  const handleDownloadDirect = () => {
    const doc = buildDoc();
    doc.save(`SGP_Ficha_Movil_${movil.identificador}_${new Date().toISOString().slice(0, 10)}.pdf`);
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/10 text-blue-600 rounded-lg">
                <FileDown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Ficha Técnica Vehicular en PDF
                </h3>
                <p className="text-xs text-slate-500">
                  Móvil {movil.identificador} ({movil.dominio})
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section toggles */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
              Secciones a Incluir en la Ficha
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={includeIdentification}
                  onChange={(e) => setIncludeIdentification(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>Identificación y Odómetro</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={includeCondition}
                  onChange={(e) => setIncludeCondition(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>Condición Operativa</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={includeService}
                  onChange={(e) => setIncludeService(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>Control Lubricación (Service)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={includeRto}
                  onChange={(e) => setIncludeRto(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>Vencimiento R.T.O.</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={includeInsurance}
                  onChange={(e) => setIncludeInsurance(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>Póliza de Seguro</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={includeRepairs}
                  onChange={(e) => setIncludeRepairs(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>Historial Reparaciones</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={includeObservations}
                  onChange={(e) => setIncludeObservations(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>Observaciones y Novedades</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={includeSignature}
                  onChange={(e) => setIncludeSignature(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>Firma de la Superioridad</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                <input
                  type="checkbox"
                  checked={conGraficos}
                  onChange={(e) => setConGraficos(e.target.checked)}
                  className="rounded border-blue-400 text-blue-600"
                />
                <span>Incluir Gráficos / Barra de Diagnóstico</span>
              </label>
            </div>
          </div>


          {/* REGLA ESPECÍFICA: Período de reparaciones a incluir */}
          {includeRepairs && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-blue-200 dark:border-blue-900/60 space-y-3">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase block">
                Filtro de Período de Reparaciones a Imprimir:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'all', label: '1. Todas (Completo)' },
                  { id: 'weekly', label: '2. Semanal' },
                  { id: 'monthly', label: '3. Mensual' },
                  { id: 'annual', label: '4. Anual' },
                  { id: 'custom', label: '5. Rango Específico' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setRepairPeriod(p.id as any)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border text-left transition-all ${
                      repairPeriod === p.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {repairPeriod === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Fecha Desde</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Fecha Hasta</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Formato y Orientación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
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
                  { id: 'portrait', label: 'Vertical (Recom.)' },
                  { id: 'landscape', label: 'Horizontal' }
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

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button onClick={onClose} className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400">
              Cancelar
            </button>
            <button
              onClick={handleOpenPreview}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 dark:border-blue-900"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Vista Preliminar</span>
            </button>
            <button
              onClick={handleDownloadDirect}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Descargar PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Document Preview Modal */}
      {previewBlob && (
        <PdfPreviewModal
          isOpen={isPreviewOpen}
          pdfBlob={previewBlob}
          onClose={() => setIsPreviewOpen(false)}
          title={`Ficha Técnica - Móvil ${movil.identificador}`}
          filename={previewFilename}
          paperSize={paperSize}
          orientation={orientation}
          onChangeFormat={handleChangePreviewFormat}
        />
      )}
    </>
  );
};
