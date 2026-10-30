import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  title: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageUrl, title }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="relative flex flex-col max-w-4xl w-full max-h-[90vh] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950 text-white">
          <div className="truncate pr-4">
            <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
            <span className="text-xs text-slate-400">Visor Oficial de Evidencia y Documentación</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Alejar"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-slate-400 tabular-nums">{Math.round(scale * 100)}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Acercar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleRotate}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Rotar"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="px-2 py-1 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Restablecer
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors ml-2"
              title="Descargar"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-900/50 transition-colors ml-2"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/80 min-h-[350px]">
          <img
            src={imageUrl}
            alt={title}
            className="max-w-full max-h-[70vh] object-contain transition-transform duration-150 select-none"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`
            }}
          />
        </div>
      </div>
    </div>
  );
};
