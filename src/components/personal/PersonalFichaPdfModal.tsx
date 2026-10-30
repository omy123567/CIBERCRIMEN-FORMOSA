import React, { useState } from 'react';
import { X, FileText, Download, Eye, Layers, Compass, User, FileEdit } from 'lucide-react';
import { Personal, InstitutionalConfig } from '../../types/sgp';
import {
  generateFichaPersonalDoc,
  generateFichaFormularioBlancoDoc,
  SgpPaperSize,
  SgpOrientation
} from '../../utils/sgpPdfGenerator';
import { PdfPreviewModal } from '../common/PdfPreviewModal';

interface PersonalFichaPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: InstitutionalConfig;
  personal?: Personal | null; // If null, mode is blank form
  mode?: 'individual' | 'blank';
}

export const PersonalFichaPdfModal: React.FC<PersonalFichaPdfModalProps> = ({
  isOpen,
  onClose,
  config,
  personal,
  mode = personal ? 'individual' : 'blank'
}) => {
  const [paperSize, setPaperSize] = useState<SgpPaperSize>('a4');
  const [orientation, setOrientation] = useState<SgpOrientation>('portrait');

  // Preview Modal state
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFilename, setPreviewFilename] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  if (!isOpen) return null;

  const isBlank = mode === 'blank' || !personal;

  const buildDoc = (pSize = paperSize, pOrient = orientation) => {
    if (isBlank) {
      return generateFichaFormularioBlancoDoc(config, { paperSize: pSize, orientation: pOrient });
    } else {
      return generateFichaPersonalDoc(config, personal!, { paperSize: pSize, orientation: pOrient });
    }
  };

  const getDocTitle = () => {
    if (isBlank) {
      return 'Formulario de Legajo Policial (Plantilla en Blanco)';
    }
    return `Ficha de Legajo - ${personal?.jerarquia} ${personal?.apellidoNombre}`;
  };

  const getDocFilename = () => {
    if (isBlank) {
      return `SGP_Formulario_Blanco_Legajo_${new Date().toISOString().slice(0, 10)}.pdf`;
    }
    return `SGP_Ficha_${personal?.plaza}_${personal?.apellidoNombre.replace(/[^a-zA-Z]/g, '_')}.pdf`;
  };

  const handleOpenPreview = () => {
    const doc = buildDoc();
    const blob = doc.output('blob');
    setPreviewBlob(blob);
    setPreviewFilename(getDocFilename());
    setIsPreviewOpen(true);
  };

  const handleDownloadDirect = () => {
    const doc = buildDoc();
    doc.save(getDocFilename());
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl ${
                  isBlank
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'
                    : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600'
                }`}
              >
                {isBlank ? <FileEdit className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isBlank ? 'Formulario de Legajo en Blanco' : 'Ficha de Legajo Individual'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isBlank
                    ? 'Plantilla normalizada con líneas de puntos para rellenar a mano'
                    : `Hoja de servicio oficial con todos los datos registrados del efectivo`}
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

          {/* Person summary if individual */}
          {!isBlank && personal && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {personal.jerarquia} {personal.apellidoNombre}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  DNI: {personal.dni} • Plaza: {personal.plaza} • {personal.grupo || 'Sin grupo'}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  personal.disponible
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {personal.disponible ? 'ACTIVO' : 'LICENCIA'}
              </span>
            </div>
          )}

          {/* Form Options */}
          <div className="space-y-4 text-xs">
            {/* Format selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleOpenPreview}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 dark:border-blue-900"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Vista Preliminar</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadDirect}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* PDF Document Preview Modal */}
      {previewBlob && (
        <PdfPreviewModal
          isOpen={isPreviewOpen}
          pdfBlob={previewBlob}
          title={getDocTitle()}
          filename={previewFilename}
          paperSize={paperSize}
          orientation={orientation}
          onChangeFormat={handleChangePreviewFormat}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </>
  );
};
