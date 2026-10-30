import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Download,
  Printer,
  FileText,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

export type SgpPaperSize = 'a4' | 'legal' | 'letter';
export type SgpOrientation = 'portrait' | 'landscape';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  pdfBlob: Blob | null;
  filename: string;
  paperSize?: SgpPaperSize;
  orientation?: SgpOrientation;
  onChangeFormat?: (paperSize: SgpPaperSize, orientation: SgpOrientation) => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  pdfBlob,
  filename,
  paperSize = 'a4',
  orientation = 'portrait',
  onChangeFormat
}) => {
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [currentSize, setCurrentSize] = useState<SgpPaperSize>(paperSize);
  const [currentOrientation, setCurrentOrientation] = useState<SgpOrientation>(orientation);

  useEffect(() => {
    setCurrentSize(paperSize);
  }, [paperSize]);

  useEffect(() => {
    setCurrentOrientation(orientation);
  }, [orientation]);

  // Keep a stable blob URL ref to avoid premature revocation
  const activeUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !pdfBlob) {
      setDataUri(null);
      setBlobUrl(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(false);

    // 1. Create a stable Blob URL
    const url = URL.createObjectURL(pdfBlob);
    activeUrlRef.current = url;
    setBlobUrl(url);

    // 2. Also convert to base64 Data URI for guaranteed permanence
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setDataUri(base64);
      setIsLoading(false);
    };
    reader.onerror = () => {
      setIsLoading(false);
    };
    reader.readAsDataURL(pdfBlob);

    return () => {
      if (activeUrlRef.current) {
        // Delay revocation slightly so in-flight requests finish
        const toRevoke = activeUrlRef.current;
        setTimeout(() => {
          try {
            URL.revokeObjectURL(toRevoke);
          } catch {
            // ignore
          }
        }, 1500);
        activeUrlRef.current = null;
      }
    };
  }, [isOpen, pdfBlob]);

  if (!isOpen || !pdfBlob) return null;

  const resolvedSource = dataUri || blobUrl;

  const handleDownload = () => {
    if (!resolvedSource) return;
    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    const a = document.createElement('a');
    a.href = resolvedSource;
    a.download = cleanFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenNewTab = () => {
    if (!resolvedSource) return;
    // Open in native full browser window
    const win = window.open();
    if (win) {
      win.document.write(
        `<html><head><title>${title}</title><style>body,html{margin:0;padding:0;height:100%;overflow:hidden;background:#0f172a;}</style></head><body><embed width="100%" height="100%" name="plugin" src="${resolvedSource}" type="application/pdf"></body></html>`
      );
    } else {
      window.open(resolvedSource, '_blank');
    }
  };

  const handlePrint = () => {
    if (!resolvedSource) return;
    const iframe = document.getElementById('pdf-preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      } catch {
        // fallback to open new tab
      }
    }
    handleOpenNewTab();
  };

  const handleChangePaperSize = (newSize: SgpPaperSize) => {
    setCurrentSize(newSize);
    if (onChangeFormat) {
      onChangeFormat(newSize, currentOrientation);
    }
  };

  const handleChangeOrientation = (newOrient: SgpOrientation) => {
    setCurrentOrientation(newOrient);
    if (onChangeFormat) {
      onChangeFormat(currentSize, newOrient);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3 bg-slate-950 border-b border-slate-800 text-white shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl ring-1 ring-blue-500/30 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white tracking-wide truncate">
                Vista Preliminar de Reporte Oficial
              </h3>
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-md">
                {title} • {filename}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Format & Orientation Controls (if onChangeFormat is provided) */}
            {onChangeFormat && (
              <div className="flex items-center gap-2 bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-700 text-xs">
                {/* Paper Size */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Papel:</span>
                  <button
                    type="button"
                    onClick={() => handleChangePaperSize('a4')}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                      currentSize === 'a4'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    A4
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangePaperSize('legal')}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                      currentSize === 'legal'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Oficio
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangePaperSize('letter')}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                      currentSize === 'letter'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Carta
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-700" />

                {/* Orientation */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Orientación:</span>
                  <button
                    type="button"
                    onClick={() => handleChangeOrientation('portrait')}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded flex items-center gap-1 ${
                      currentOrientation === 'portrait'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Orientación Vertical"
                  >
                    <span>Vertical</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeOrientation('landscape')}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded flex items-center gap-1 ${
                      currentOrientation === 'landscape'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Orientación Horizontal"
                  >
                    <span>Horizontal</span>
                  </button>
                </div>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 text-xs text-slate-300">
              <button
                onClick={() => setZoomLevel((prev) => Math.max(prev - 10, 60))}
                className="p-1 hover:text-white"
                title="Reducir zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] w-10 text-center">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((prev) => Math.min(prev + 10, 160))}
                className="p-1 hover:text-white"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                className="p-1 hover:text-white ml-0.5 border-l border-slate-700 pl-1.5"
                title="Restablecer 100%"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Abrir en Pestaña Completa */}
            <button
              onClick={handleOpenNewTab}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
              title="Abrir en pestaña completa independiente"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Pestaña Completa</span>
            </button>

            {/* Imprimir */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
              title="Imprimir documento"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Descargar PDF */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all shadow-xs active:scale-95"
              title="Descargar archivo PDF al equipo"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PDF</span>
            </button>

            {/* Cerrar */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
              title="Cerrar vista previa"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Container */}
        <div className="flex-1 bg-slate-950 p-2 sm:p-3 overflow-hidden flex flex-col relative">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs gap-3">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Generando y preparando vista preliminar del reporte...</span>
            </div>
          ) : resolvedSource ? (
            <div className="w-full h-full rounded-xl overflow-hidden bg-white shadow-2xl relative flex flex-col">
              <object
                data={`${resolvedSource}#toolbar=1&navpanes=0&zoom=${zoomLevel}`}
                type="application/pdf"
                className="w-full h-full flex-1"
                onError={() => setLoadError(true)}
              >
                <iframe
                  id="pdf-preview-iframe"
                  src={`${resolvedSource}#toolbar=1&navpanes=0`}
                  title={title}
                  className="w-full h-full border-0"
                />
              </object>

              {loadError && (
                <div className="absolute inset-0 bg-slate-900/90 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <AlertCircle className="w-12 h-12 text-amber-400" />
                  <div className="max-w-md">
                    <h4 className="text-base font-bold text-white mb-1">
                      El navegador restringió la vista del visor interno
                    </h4>
                    <p className="text-xs text-slate-300">
                      Puede visualizar el documento sin restricciones abriéndolo directamente o descargándolo:
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleOpenNewTab}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Abrir en Pestaña Nueva</span>
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar Directamente</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs gap-3">
              <AlertCircle className="w-8 h-8 text-amber-500" />
              <span>No se pudo generar la vista preliminar del documento.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
