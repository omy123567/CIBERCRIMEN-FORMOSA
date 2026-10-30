import React, { useState, useRef, useEffect } from 'react';
import { X, Check, RotateCw, Sun, Sliders, Crop, RefreshCcw } from 'lucide-react';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onSave: (editedDataUrl: string) => void;
  title?: string;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onSave,
  title = 'Editar y Mejorar Documento'
}) => {
  const [brightness, setBrightness] = useState<number>(100); // 50 to 150
  const [contrast, setContrast] = useState<number>(100); // 50 to 150
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [grayscale, setGrayscale] = useState<boolean>(false);
  const [cropPercent, setCropPercent] = useState<number>(0); // 0 to 40% margin crop

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const isRotated90or270 = rotation % 180 !== 0;
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      canvas.width = isRotated90or270 ? naturalHeight : naturalWidth;
      canvas.height = isRotated90or270 ? naturalWidth : naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Filters
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) ${grayscale ? 'grayscale(100%)' : ''}`;

      // Transformations (rotation)
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Apply optional margin crop
      const cropPxW = (naturalWidth * cropPercent) / 200;
      const cropPxH = (naturalHeight * cropPercent) / 200;
      const drawW = naturalWidth - cropPxW * 2;
      const drawH = naturalHeight - cropPxH * 2;

      ctx.drawImage(
        img,
        cropPxW,
        cropPxH,
        drawW,
        drawH,
        -canvas.width / 2,
        -canvas.height / 2,
        canvas.width,
        canvas.height
      );
      ctx.restore();
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc, brightness, contrast, rotation, grayscale, cropPercent]);

  if (!isOpen) return null;

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const editedUrl = canvas.toDataURL('image/jpeg', 0.88);
    onSave(editedUrl);
    onClose();
  };

  const handleReset = () => {
    setBrightness(100);
    setContrast(100);
    setRotation(0);
    setGrayscale(false);
    setCropPercent(0);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold">{title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Preview */}
        <div className="flex items-center justify-center bg-slate-950 p-2 rounded-xl border border-slate-800 max-h-72 overflow-hidden">
          <canvas
            ref={canvasRef}
            className="max-h-68 max-w-full object-contain rounded-lg shadow-inner"
          />
        </div>

        {/* Editing Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 text-xs">
          {/* Brightness */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                Brillo
              </span>
              <span className="font-mono text-slate-400">{brightness}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="160"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Contrast */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                Contraste
              </span>
              <span className="font-mono text-slate-400">{contrast}%</span>
            </div>
            <input
              type="range"
              min="60"
              max="160"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Crop margins */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Crop className="w-3.5 h-3.5 text-emerald-400" />
                Recorte de bordes
              </span>
              <span className="font-mono text-slate-400">{cropPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={cropPercent}
              onChange={(e) => setCropPercent(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Rotation & Grayscale */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Girar 90° ({rotation}°)</span>
            </button>

            <label className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg cursor-pointer font-semibold transition-colors">
              <input
                type="checkbox"
                checked={grayscale}
                onChange={(e) => setGrayscale(e.target.checked)}
                className="rounded accent-blue-500"
              />
              <span>Blanco/Negro</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Imagen Mejorada</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
