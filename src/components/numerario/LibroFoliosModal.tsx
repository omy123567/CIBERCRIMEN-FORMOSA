import React, { useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  Search,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  Layers,
  Calendar,
  Building,
  User,
  ExternalLink
} from 'lucide-react';
import { FolioRegistro, NumerarioSerie, InstitutionalConfig } from '../../types/sgp';

interface LibroFoliosModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSerie: NumerarioSerie;
  allSeries: NumerarioSerie[];
  foliosActiveSerie: FolioRegistro[];
  allFolios: FolioRegistro[];
  config: InstitutionalConfig;
  onSelectFolio: (folio: FolioRegistro) => void;
}

export const LibroFoliosModal: React.FC<LibroFoliosModalProps> = ({
  isOpen,
  onClose,
  activeSerie,
  allSeries,
  foliosActiveSerie,
  allFolios,
  config,
  onSelectFolio
}) => {
  const [viewScope, setViewScope] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('ALL');

  if (!isOpen) return null;

  // Source list depending on scope
  const sourceFolios = viewScope === 'ACTIVE' ? foliosActiveSerie : allFolios;

  // Extract unique document types
  const docTypes = Array.from(new Set(sourceFolios.map(f => f.tipoDocumento).filter(Boolean)));

  // Filtered List
  const filtered = sourceFolios.filter((f) => {
    if (filterTipo !== 'ALL' && f.tipoDocumento !== filterTipo) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const numMatch = f.numero.toString().includes(q);
      const caratulaMatch = (f.caratula || '').toLowerCase().includes(q);
      const asuntoMatch = (f.asunto || '').toLowerCase().includes(q);
      const destMatch = (f.destinatario || '').toLowerCase().includes(q);
      const solicMatch = (f.solicitante || '').toLowerCase().includes(q);
      return numMatch || caratulaMatch || asuntoMatch || destMatch || solicMatch;
    }
    return true;
  }).sort((a, b) => a.numero - b.numero);

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Folio N°', 'Serie', 'Carátula', 'Tipo Documento', 'Asunto / Objeto', 'Destinatario', 'Iniciador / Solicitante', 'Fecha', 'Hora', 'Usuario Registrador', 'Observaciones'];
    
    const rows = filtered.map((f) => {
      const serieObj = allSeries.find(s => s.id === f.serieId);
      const serieName = serieObj ? `${serieObj.nombre} (${serieObj.prefijo})` : activeSerie.nombre;
      return [
        f.numero.toString(),
        serieName,
        f.caratula,
        f.tipoDocumento,
        `"${(f.asunto || '').replace(/"/g, '""')}"`,
        `"${(f.destinatario || '').replace(/"/g, '""')}"`,
        `"${(f.solicitante || '').replace(/"/g, '""')}"`,
        f.fecha,
        f.hora,
        f.usuarioAsigno || '',
        `"${(f.observaciones || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const scopeLabel = viewScope === 'ACTIVE' ? activeSerie.prefijo : 'UNIFICADO';
    link.download = `SGP_Libro_Folios_${scopeLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full p-6 shadow-2xl space-y-5 my-6 max-h-[92vh] flex flex-col">
        
        {/* Header - Hidden in Print */}
        <div className="print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/10 text-blue-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Libro Oficial de Registro y Control de Folios
              </h3>
              <p className="text-xs text-slate-500">
                Planilla correlativa de trámites registrados, buscador y exportación oficial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 rounded-xl transition-colors shadow-xs"
              title="Exportar a Excel / CSV con UTF-8"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel / CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors shadow-xs"
              title="Imprimir libro de folios"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scope Selector: Active Serie vs Unified - Hidden in Print */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Alcance:</span>
            <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewScope('ACTIVE')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewScope === 'ACTIVE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Serie Actual: {activeSerie.nombre}
              </button>
              <button
                type="button"
                onClick={() => setViewScope('ALL')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewScope === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Reporte General Unificado (Todas las Series)
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
            <div className="relative w-full max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por N°, carátula, asunto..."
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            {docTypes.length > 0 && (
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="ALL">Todos los Tipos</option>
                {docTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Printable Official Header */}
        <div className="hidden print:block text-center border-b border-black pb-3 space-y-1">
          <h2 className="text-sm font-black uppercase tracking-wider">
            {config.policeForce || 'POLICÍA DE LA PROVINCIA DE FORMOSA'}
          </h2>
          <h3 className="text-xs font-bold uppercase">
            {config.subdivision || 'DIRECCIÓN GENERAL POLICÍA CIENTÍFICA'}
          </h3>
          <h4 className="text-sm font-bold text-blue-900 pt-1">
            LIBRO OFICIAL DE CONTROL DE NUMERARIO Y REGISTRO DE FOLIOS
          </h4>
          <p className="text-[10px] text-slate-600">
            {viewScope === 'ACTIVE' ? `Serie: ${activeSerie.nombre} (${activeSerie.prefijo})` : 'Reporte Unificado de Todas las Series'} • Total Folios Registrados: {filtered.length} • Emisión: {new Date().toLocaleDateString('es-AR')}
          </p>
        </div>

        {/* Records Table */}
        <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 w-16 text-center">Folio</th>
                {viewScope === 'ALL' && <th className="p-3">Serie</th>}
                <th className="p-3">Carátula / Código</th>
                <th className="p-3">Tipo Trámite</th>
                <th className="p-3">Asunto / Objeto</th>
                <th className="p-3">Destinatario</th>
                <th className="p-3">Iniciador</th>
                <th className="p-3 text-center">Fecha</th>
                <th className="p-3 text-right print:hidden">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={viewScope === 'ALL' ? 9 : 8} className="p-8 text-center text-slate-400">
                    No se encontraron folios registrados bajo los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filtered.map((f) => {
                  const serieObj = allSeries.find(s => s.id === f.serieId);
                  const isRange = Boolean(f.rangoInicio && f.rangoFin && f.rangoInicio !== f.rangoFin);

                  return (
                    <tr
                      key={f.id}
                      onClick={() => onSelectFolio(f)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    >
                      <td className="p-3 font-mono font-black text-center text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20">
                        #{f.numero}
                      </td>

                      {viewScope === 'ALL' && (
                        <td className="p-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {serieObj?.prefijo || 'SERIE'}
                          </span>
                        </td>
                      )}

                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-200 whitespace-nowrap">
                        {f.caratula}
                        {isRange && (
                          <span className="ml-1 text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 font-sans font-bold">
                            Bloque
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {f.tipoDocumento}
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="font-medium text-slate-900 dark:text-white line-clamp-2">
                          {f.asunto}
                        </div>
                        {f.observaciones && (
                          <div className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5">
                            Obs: {f.observaciones}
                          </div>
                        )}
                      </td>

                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200 max-w-[140px] truncate" title={f.destinatario}>
                        {f.destinatario}
                      </td>

                      <td className="p-3 text-slate-600 dark:text-slate-400 max-w-[120px] truncate">
                        {f.solicitante || '-'}
                      </td>

                      <td className="p-3 text-center whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {f.fecha}
                      </td>

                      <td className="p-3 text-right print:hidden whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFolio(f);
                          }}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                          title="Ver Ficha Detallada"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800 print:hidden">
          <span>
            Mostrando <strong>{filtered.length}</strong> folios registrados.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
