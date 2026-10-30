import React from 'react';
import { InstitutionalConfig } from '../../types/sgp';

interface InstitutionalLetterheadProps {
  config: InstitutionalConfig;
  className?: string;
  showMottos?: boolean;
  reportTitle?: string;
  subTitle?: string;
}

export const InstitutionalLetterhead: React.FC<InstitutionalLetterheadProps> = ({
  config,
  className = '',
  showMottos = true,
  reportTitle,
  subTitle
}) => {
  const leftLogo = config.logoLeftUrl || '/logo-policia-formosa.png';
  const rightLogo = config.logoRightUrl || config.logoDataUrl || '/logo-dgpc.png';
  const mottoLeft = config.mottoLeft ?? '"La seguridad pública es una construcción colectiva"';
  const mottoRight = config.mottoRight ?? 'D.G.P.C.';

  return (
    <div className={`w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pb-3 pt-1 px-2 ${className}`}>
      <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
        {/* Left Logo and Motto */}
        <div className="flex flex-col items-center text-center shrink-0 w-36">
          <img
            src={leftLogo}
            alt="Escudo Policía de Formosa"
            className="h-16 w-auto object-contain drop-shadow-xs"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/logo-policia-formosa.png';
            }}
          />
          {showMottos && mottoLeft && (
            <span className="text-[9px] text-slate-500 italic mt-1 leading-tight block max-w-[140px]">
              {mottoLeft}
            </span>
          )}
        </div>

        {/* Center Typography */}
        <div className="flex-1 text-center space-y-0.5 px-2">
          {config.headerLines && config.headerLines.length > 0 ? (
            config.headerLines.map((line) => {
              const sizeClass =
                line.size === 'XL'
                  ? 'text-sm sm:text-base tracking-wider'
                  : line.size === 'LG'
                  ? 'text-xs sm:text-sm tracking-wide'
                  : line.size === 'MD'
                  ? 'text-[11px] sm:text-xs'
                  : line.size === 'SM'
                  ? 'text-[10px] sm:text-[11px]'
                  : 'text-[9px] sm:text-[10px]';

              const colorClass =
                line.color === 'AZUL_POLICIAL'
                  ? 'text-[#1E3A8A] dark:text-blue-400'
                  : line.color === 'GRIS_OSCURO'
                  ? 'text-slate-800 dark:text-slate-200'
                  : line.color === 'GRIS_SUAVE'
                  ? 'text-slate-500 dark:text-slate-400'
                  : 'text-slate-950 dark:text-white';

              const weightClass = line.bold ? 'font-black' : 'font-normal';
              const underlineClass = line.underline
                ? 'underline decoration-[#1E3A8A] decoration-1 underline-offset-2'
                : '';

              return (
                <div
                  key={line.id}
                  className={`${sizeClass} ${colorClass} ${weightClass} ${underlineClass} leading-tight`}
                >
                  {line.text}
                </div>
              );
            })
          ) : (
            <>
              <h2 className="text-sm sm:text-base font-black tracking-wider text-[#1E3A8A] dark:text-blue-400 uppercase">
                {config.policeForce || 'POLICÍA DE LA PROVINCIA DE FORMOSA'}
              </h2>
              <h3 className="text-xs sm:text-sm font-bold tracking-wide text-[#1E3A8A] dark:text-blue-300 uppercase">
                {config.division || 'DIVISIÓN INVESTIGACIÓN CIBERCRIMEN'}
              </h3>
              <h4 className="text-xs sm:text-sm font-black tracking-wide text-[#1E3A8A] dark:text-blue-200 underline uppercase decoration-[#1E3A8A] decoration-1 underline-offset-2">
                {config.subdivision || 'DELEGACIÓN POLICÍA CIENTÍFICA LAGUNA BLANCA'}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium pt-0.5">
                {config.addressLine1 || config.unitLocation || 'Calle San Martín e H. Irigoyen - Bº Centro - Laguna Blanca - C.P. 3613'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium font-mono">
                {config.addressLine2 || 'Tel.: 3704-040169 / E-mail: pol.delgcrimlagunablanca@formosa.gov.ar'}
              </p>
            </>
          )}
        </div>

        {/* Right Logo and Subtext */}
        <div className="flex flex-col items-center text-center shrink-0 w-36">
          <img
            src={rightLogo}
            alt="Escudo D.G.P.C."
            className="h-16 w-auto object-contain drop-shadow-xs"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/logo-dgpc.png';
            }}
          />
          {showMottos && mottoRight && (
            <span className="text-[10px] font-black text-[#1E3A8A] dark:text-blue-400 tracking-wider mt-1 block">
              {mottoRight}
            </span>
          )}
        </div>
      </div>

      {(reportTitle || subTitle) && (
        <div className="pt-2.5 mt-2 border-t border-slate-200 dark:border-slate-700 text-left px-2">
          {reportTitle && (
            <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              {reportTitle}
            </h5>
          )}
          {subTitle && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {subTitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
