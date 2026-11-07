import React, { useState } from 'react';
import { Download, Smartphone, Laptop, CheckCircle2, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installedNotice, setInstalledNotice] = useState(false);

  // If already running in standalone mode (installed app), show a subtle active badge or hide
  if (isInstalled) {
    return (
      <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/40 border border-emerald-700/40 text-[11px] font-semibold text-emerald-300" title="Aplicación S.I.S.D.I.C. instalada y funcionando en modo local/online">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>App Instalada</span>
      </div>
    );
  }

  // Chromium / Android / Windows Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={async () => {
          const ok = await install();
          if (ok) {
            setInstalledNotice(true);
            setTimeout(() => setInstalledNotice(false), 4000);
          }
        }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white text-xs font-bold shadow-md shadow-blue-900/30 border border-sky-400/30 transition-all cursor-pointer active:scale-95"
        title="Instalar S.I.S.D.I.C. en este dispositivo (Android, Windows, macOS, Linux)"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">Instalar</span>
      </button>
    );
  }

  // iOS Safari flow (Add to Home Screen)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-sky-500/40 text-sky-300 text-xs font-bold transition-all"
          title="Instalar en iPhone o iPad"
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>Instalar iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-sky-400" />
                  <h3 className="text-sm font-bold text-white">Instalar en iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-300 leading-relaxed">
                <p className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] shrink-0">1</span>
                  <span>Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba) en la barra de Safari.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] shrink-0">2</span>
                  <span>Desliza hacia abajo y selecciona <strong>"Agregar a pantalla de inicio"</strong>.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] shrink-0">3</span>
                  <span>Toca <strong>Agregar</strong> en la esquina superior derecha.</span>
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-xs font-bold text-white transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Generic fallback: Desktop or mobile browser with install advice
  return (
    <button
      onClick={() => {
        alert('Para instalar S.I.S.D.I.C. en este navegador:\n• En Chrome/Edge: Haz clic en el ícono de instalar en la barra de direcciones o en Menú > Instalar S.I.S.D.I.C.\n• En celular: Menú de opciones > Instalar o Agregar a Pantalla Principal.');
      }}
      className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all"
      title="Instalar aplicación en PC / Móvil"
    >
      <Laptop className="w-3.5 h-3.5 text-blue-400 shrink-0" />
      <span>Instalar</span>
    </button>
  );
};
