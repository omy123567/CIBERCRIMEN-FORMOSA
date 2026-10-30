import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Maximize2 } from 'lucide-react';

interface AttachmentZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  imageSrc?: string;
  title?: string;
  subtitle?: string;
}

export const AttachmentZoomModal: React.FC<AttachmentZoomModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageSrc,
  title = 'Vista Preliminar de Archivo Adjunto',
  subtitle
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  const effectiveImage = imageUrl || imageSrc;
  if (!isOpen || !effectiveImage) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = effectiveImage;
    link.download = `${title.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-70 bg-black/90 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 select-none animate-in fade-in"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-3 text-white max-w-4xl w-full mx-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="text-sm font-bold truncate max-w-md">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 font-mono">{subtitle}</p>}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl">
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
            title="Alejar (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono px-2 text-slate-300 min-w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
            title="Acercar (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
            title="Restablecer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRotation((prev) => (prev + 90) % 360)}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
            title="Rotar 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
            title="Descargar imagen"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-rose-400 hover:text-rose-200 rounded-lg hover:bg-rose-950/50 transition-colors ml-2"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main viewport with zoom transform */}
      <div
        className="flex-1 flex items-center justify-center overflow-auto p-4 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`
          }}
        >
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[82vh] max-w-[90vw] object-contain rounded-xl shadow-2xl border border-slate-800"
          />
        </div>
      </div>

      {/* Footer helper */}
      <div className="text-center text-xs text-slate-500 font-mono">
        Haga clic fuera o presione cerrar para salir • Rotación: {rotation}° • Escala: {Math.round(zoom * 100)}%
      </div>
    </div>
  );
};
