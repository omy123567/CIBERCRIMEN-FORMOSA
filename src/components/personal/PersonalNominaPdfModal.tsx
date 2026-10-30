import React, { useState, useMemo } from 'react';
import { X, FileText, Download, Eye, Users, Layers, Compass } from 'lucide-react';
import { Personal, InstitutionalConfig } from '../../types/sgp';
import {
  generatePersonalRosterDoc,
  SgpPaperSize,
  SgpOrientation,
  PersonalRosterOptions
} from '../../utils/sgpPdfGenerator';
import { PdfPreviewModal } from '../common/PdfPreviewModal';

interface PersonalNominaPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  personalList: Personal[];
  config: InstitutionalConfig;
}

export const PersonalNominaPdfModal: React.FC<PersonalNominaPdfModalProps> = ({
  isOpen,
  onClose,
  personalList,
  config
}) => {
  // Options state
  const [discriminarGrupos, setDiscriminarGrupos] = useState<boolean>(true);
  const [estadoRevista, setEstadoRevista] = useState<'ALL' | 'DISPONIBLE' | 'LICENCIA'>('ALL');
  const [conGraficos, setConGraficos] = useState<boolean>(true);
  const [includeArmamento, setIncludeArmamento] = useState<boolean>(true);
  const [includeContacto, setIncludeContacto] = useState<boolean>(true);
  const [paperSize, setPaperSize] = useState<SgpPaperSize>('a4');
  const [orientation, setOrientation] = useState<SgpOrientation>('landscape');


  // Preview Modal state
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFilename, setPreviewFilename] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Compute filtered count
  const effectiveCount = useMemo(() => {
    return personalList.filter((p) => {
      if (estadoRevista === 'DISPONIBLE' && !p.disponible) return false;
      if (estadoRevista === 'LICENCIA' && p.disponible) return false;
      return true;
    }).length;
  }, [personalList, estadoRevista]);

  if (!isOpen) return null;

  const buildDoc = (pSize = paperSize, pOrient = orientation) => {
    const options: PersonalRosterOptions = {
      discriminarGrupos,
      estadoRevista,
      paperSize: pSize,
      orientation: pOrient
    };
    return generatePersonalRosterDoc(config, personalList, options);
  };

  const handleOpenPreview = () => {
    const doc = buildDoc();
    const blob = doc.output('blob');
    setPreviewBlob(blob);
    setPreviewFilename(`SGP_Nomina_Personal_${new Date().toISOString().slice(0, 10)}.pdf`);
    setIsPreviewOpen(true);
  };

  const handleDownloadDirect = () => {
    const doc = buildDoc();
    doc.save(`SGP_Nomina_Personal_${new Date().toISOString().slice(0, 10)}.pdf`);
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
              <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Opciones de Exportación: Nómina de Personal
                </h3>
                <p className="text-xs text-slate-500">
                  Seleccione discriminación por grupos, tamaño de papel y orientación
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
            {/* 1. Discriminación por Grupos / Guardias */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
              <input
                type="checkbox"
                id="discriminarGrupos"
                checked={discriminarGrupos}
                onChange={(e) => setDiscriminarGrupos(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="discriminarGrupos" className="cursor-pointer select-none">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                  Discriminar y agrupar por Grupos / Guardias
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Agrupa la nómina con encabezados institucionales para cada Guardia / Sección (Turno A, Turno B, Administración) con cómputo de subtotales independientes.
                </span>
              </label>
            </div>

            {/* 2. Estado de Revista */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Situación de Revista</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ALL', label: 'Todos los Efectivos' },
                  { id: 'DISPONIBLE', label: 'Solo Activos (Disponibles)' },
                  { id: 'LICENCIA', label: 'Solo con Licencia' }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setEstadoRevista(st.id as any)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${
                      estadoRevista === st.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Selección de Datos Específicos y Gráficos */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Datos a Incluir en el Documento:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeArmamento}
                    onChange={(e) => setIncludeArmamento(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Armamento Provisto</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeContacto}
                    onChange={(e) => setIncludeContacto(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Teléfonos de Contacto</span>
                </label>
              </div>
              <label className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={conGraficos}
                  onChange={(e) => setConGraficos(e.target.checked)}
                  className="rounded border-blue-400 text-blue-600"
                />
                <span>Incluir Resumen Gráfico / Estadístico de Efectivos</span>
              </label>
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

            {/* Total Efectivos Count Banner */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 flex items-center justify-between">
              <span className="text-xs text-blue-900 dark:text-blue-300 font-medium">
                Efectivos a incluir en la nómina oficial:
              </span>
              <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                {effectiveCount} efectivos
              </span>
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
          title="Nómina General de Personal Policial"
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
