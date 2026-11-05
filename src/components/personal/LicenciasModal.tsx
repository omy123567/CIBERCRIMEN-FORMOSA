import React, { useState } from 'react';
import { X, Calendar, Plus, Save, Clock, AlertTriangle, RotateCcw, CheckCircle, FileText } from 'lucide-react';
import { Personal, Licencia, TipoLicencia, InstitutionalConfig } from '../../types/sgp';
import { calcularCuatrienioPersonal } from '../../utils/licenciasCuatrienio';
import { generateCuatrienioDoc, SgpPaperSize, SgpOrientation } from '../../utils/sgpPdfGenerator';
import { PdfPreviewModal } from '../common/PdfPreviewModal';

interface LicenciasModalProps {
  isOpen: boolean;
  onClose: () => void;
  personal: Personal;
  licencias: Licencia[];
  onSaveLicencia: (lic: Licencia) => void;
  onUpdatePeriodStatus: (personalId: number, anio: number, newStatus: 'AUTOMÁTICO' | 'MANUAL' | 'VENCIDA' | 'SIN DÍAS', manualDays?: number) => void;
  onVencerAnteriores: (personalId: number, anioBase: number) => void;
  onInterruptLicencia: (licenciaId: number, devueltos: number, motivo: string) => void;
  institutionalConfig: InstitutionalConfig;
  anioBase?: number;
}

export const LicenciasModal: React.FC<LicenciasModalProps> = ({
  isOpen,
  onClose,
  personal,
  licencias,
  onSaveLicencia,
  onUpdatePeriodStatus,
  onVencerAnteriores,
  onInterruptLicencia,
  institutionalConfig,
  anioBase = 2026
}) => {
  const cuatrienio = calcularCuatrienioPersonal(personal, licencias, anioBase);

  // New License State
  const [showAddForm, setShowAddForm] = useState(false);
  const [tipoLicencia, setTipoLicencia] = useState<TipoLicencia>('Anual');
  const [anioPeriodo, setAnioPeriodo] = useState<number>(anioBase);
  const [diasHabilesTomados, setDiasHabilesTomados] = useState<number>(14);
  const [sumaDiasViaje, setSumaDiasViaje] = useState(false);
  const [disposicionViaje, setDisposicionViaje] = useState('');
  const [diasPermitidosViaje, setDiasPermitidosViaje] = useState<number>(2);
  const [observaciones, setObservaciones] = useState('');

  // PDF Preview State
  const [previewPdfBlob, setPdfPreviewBlob] = useState<{
    blob: Blob;
    title: string;
    filename: string;
    paperSize: SgpPaperSize;
    orientation: SgpOrientation;
  } | null>(null);

  const handleOpenCuatrienioPdf = (
    paperSize: SgpPaperSize = 'a4',
    orientation: SgpOrientation = 'portrait'
  ) => {
    const doc = generateCuatrienioDoc(institutionalConfig, personal, cuatrienio, licencias, {
      paperSize,
      orientation
    });
    const blob = doc.output('blob');
    setPdfPreviewBlob({
      blob,
      title: `Estado de Licencias y Cuatrienio - ${personal.apellidoNombre}`,
      filename: `SGP_Cuatrienio_${personal.apellidoNombre.replace(/[^a-zA-Z]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`,
      paperSize,
      orientation
    });
  };

  // Multi-period imputation state (e.g. 7 days from 2024, 14 days from 2025)
  const [isMultiPeriod, setIsMultiPeriod] = useState(false);
  const [multiPeriodInput, setMultiPeriodInput] = useState<Record<string, number>>({});

  // Interrupt modal
  const [interruptingLic, setInterruptingLic] = useState<Licencia | null>(null);
  const [diasDevueltos, setDiasDevueltos] = useState<number>(0);
  const [motivoInterrupcion, setMotivoInterrupcion] = useState('');

  if (!isOpen) return null;

  const handleSubmitLicencia = (e: React.FormEvent) => {
    e.preventDefault();

    let periodosDetalleJson = '';
    let totalTomados = diasHabilesTomados;

    if (isMultiPeriod && Object.keys(multiPeriodInput).length > 0) {
      periodosDetalleJson = JSON.stringify(multiPeriodInput);
      totalTomados = Object.values(multiPeriodInput).reduce((a, b) => a + Number(b), 0);
    } else {
      periodosDetalleJson = JSON.stringify({ [anioPeriodo.toString()]: diasHabilesTomados });
    }

    const nuevaLicencia: Licencia = {
      personalId: personal.id || 0,
      jerarquia: personal.jerarquia,
      plaza: personal.plaza,
      apellidoNombre: personal.apellidoNombre,
      dni: personal.dni,
      fechaIngreso: personal.fechaIngreso,
      tipoLicencia,
      anioPeriodo,
      diasHabilesTomados: totalTomados,
      sumaDiasViaje,
      disposicionViaje: sumaDiasViaje ? disposicionViaje : '',
      diasPermitidosViaje: sumaDiasViaje ? diasPermitidosViaje : 0,
      fueInterrumpida: false,
      fechaInterrupcion: '',
      motivoInterrupcion: '',
      diasRestantesDevueltos: 0,
      observaciones,
      periodosDetalleJson,
      fechaSalida: '', // Strictly omitted from UI
      fechaReanudacion: '', // Strictly omitted from UI
      delegacionId: personal.delegacionId || 1
    };

    onSaveLicencia(nuevaLicencia);
    setShowAddForm(false);
    setObservaciones('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 text-blue-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Cuatrienio y Saldo de Licencias Policiales
              </h2>
              <p className="text-xs text-slate-500">
                {personal.jerarquia} {personal.apellidoNombre} • DNI: {personal.dni} • Plaza: {personal.plaza}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Antigüedad & Escala Oficial Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/60">
            <div>
              <span className="text-[11px] font-semibold text-slate-500">Fecha de Ingreso:</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">{personal.fechaIngreso || '-'}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500">Antigüedad (Años Calendario):</span>
              <p className="text-sm font-bold text-blue-700 dark:text-blue-400 font-mono">
                {cuatrienio.antiguedadAnios} años
              </p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500">Escala Anual Reglamentaria:</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {cuatrienio.escalaDiasBase} días hábiles
              </p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500">Saldo Total Disponible:</span>
              <p className="text-base font-extrabold text-emerald-600 font-mono">
                {cuatrienio.totalSaldoDisponible} días
              </p>
            </div>
          </div>

          {/* CUATRIENIO: 4 Años Independientes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Cuatrienio Oficial ({cuatrienio.periodos.map((p) => p.anio).join(' - ')})
              </h3>
              <button
                type="button"
                onClick={() => personal.id && onVencerAnteriores(personal.id, anioBase)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-lg border border-rose-200 dark:border-rose-900 transition-colors"
                title="Caducar saldos de años anteriores"
              >
                Vencer &lt; {anioBase}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {cuatrienio.periodos.map((per) => {
                let badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300';
                if (per.estado === 'VENCIDA') badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 font-bold';
                if (per.estado === 'SIN DÍAS') badgeColor = 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                if (per.estado === 'MANUAL') badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300';

                return (
                  <div
                    key={per.anio}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                        {per.anio}
                      </span>
                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-semibold ${badgeColor}`}>
                        {per.estado}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Asignados:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{per.diasAsignados} d</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Tomados:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{per.diasTomados} d</span>
                      </div>
                      {per.diasDevueltos > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Devueltos:</span>
                          <span className="font-mono">+{per.diasDevueltos} d</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <span className="font-bold text-slate-900 dark:text-white">Saldo:</span>
                        <span className="text-base font-extrabold text-blue-600 font-mono">
                          {per.saldoRestante} d
                        </span>
                      </div>
                    </div>

                    {/* Quick status toggle button */}
                    <div className="flex items-center gap-1 pt-1">
                      <button
                        onClick={() =>
                          personal.id &&
                          onUpdatePeriodStatus(
                            personal.id,
                            per.anio,
                            per.estado === 'VENCIDA' ? 'AUTOMÁTICO' : 'VENCIDA'
                          )
                        }
                        className="text-[10px] text-slate-400 hover:text-rose-600 underline"
                      >
                        {per.estado === 'VENCIDA' ? 'Restablecer' : 'Vencer año'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Historial de Licencias Imputadas
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenCuatrienioPdf()}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                title="Abrir vista preliminar de cuatrienio"
              >
                Exportar Ficha PDF
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Imputar Licencia</span>
              </button>
            </div>
          </div>

          {/* Form to Add License */}
          {showAddForm && (
            <form
              onSubmit={handleSubmitLicencia}
              className="p-5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-blue-200 dark:border-blue-900/60 space-y-4 animate-in fade-in"
            >
              <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase">
                Imputar Nueva Licencia Policial
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Licencia
                  </label>
                  <select
                    value={tipoLicencia}
                    onChange={(e) => setTipoLicencia(e.target.value as TipoLicencia)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Anual">Anual (Descuenta Cuatrienio)</option>
                    <option value="Invernal">Invernal (5 días fijos)</option>
                    <option value="Extraordinaria">Extraordinaria</option>
                    <option value="Examen">Examen</option>
                    <option value="Fallecimiento Familiar">Fallecimiento Familiar</option>
                    <option value="Matrimonio">Matrimonio</option>
                    <option value="Atención Familiar">Atención Familiar</option>
                  </select>
                </div>

                {!isMultiPeriod ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Año de Período a Imputar
                      </label>
                      <select
                        value={anioPeriodo}
                        onChange={(e) => setAnioPeriodo(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      >
                        {cuatrienio.periodos.map((p) => (
                          <option key={p.anio} value={p.anio}>
                            Período {p.anio} (Saldo: {p.saldoRestante} d)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Días Hábiles a Tomar
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={49}
                        value={diasHabilesTomados}
                        onChange={(e) => setDiasHabilesTomados(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Imputación Simultánea en 2 o más períodos:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {cuatrienio.periodos.map((p) => (
                        <div key={p.anio} className="flex flex-col">
                          <span className="text-[11px] text-slate-500 font-mono">{p.anio}:</span>
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={multiPeriodInput[p.anio.toString()] || ''}
                            onChange={(e) =>
                              setMultiPeriodInput({
                                ...multiPeriodInput,
                                [p.anio.toString()]: Number(e.target.value) || 0
                              })
                            }
                            className="px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-period switch */}
              {tipoLicencia === 'Anual' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="multi-period-toggle"
                    checked={isMultiPeriod}
                    onChange={(e) => setIsMultiPeriod(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 w-4 h-4"
                  />
                  <label htmlFor="multi-period-toggle" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    Afectar 2 o más períodos en simultáneo (ej. 7 días de 2024 y 14 de 2025)
                  </label>
                </div>
              )}

              {/* Días de Viaje */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sumaDiasViaje}
                    onChange={(e) => setSumaDiasViaje(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 w-4 h-4"
                  />
                  <span>Suma días por viaje</span>
                </label>

                {sumaDiasViaje && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">N° Disposición de Viaje</label>
                      <input
                        type="text"
                        value={disposicionViaje}
                        onChange={(e) => setDisposicionViaje(e.target.value)}
                        placeholder="ej. DISP-JEF-1940/26"
                        className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Días Permitidos por Viaje</label>
                      <input
                        type="number"
                        min={1}
                        max={4}
                        value={diasPermitidosViaje}
                        onChange={(e) => setDiasPermitidosViaje(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observaciones / Motivo
                </label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Detalles adicionales..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Confirmar e Imputar</span>
                </button>
              </div>
            </form>
          )}

          {/* Licencias Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Período</th>
                  <th className="py-2.5 px-3">Días Tomados</th>
                  <th className="py-2.5 px-3">Viaje</th>
                  <th className="py-2.5 px-3">Estado / Interrupción</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {licencias.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                      No hay licencias registradas para este efectivo.
                    </td>
                  </tr>
                ) : (
                  licencias.map((lic) => (
                    <tr key={lic.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {lic.tipoLicencia}
                      </td>
                      <td className="py-2.5 px-3 font-mono">{lic.anioPeriodo}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                        {lic.diasHabilesTomados} días
                      </td>
                      <td className="py-2.5 px-3">
                        {lic.sumaDiasViaje ? (
                          <span className="text-emerald-600 font-medium">
                            +{lic.diasPermitidosViaje}d ({lic.disposicionViaje || 'Con disp.'})
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {lic.fueInterrumpida ? (
                          <span className="text-amber-700 dark:text-amber-400 font-medium">
                            Interrumpida (+{lic.diasRestantesDevueltos}d devueltos)
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400">Completada</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {!lic.fueInterrumpida && (
                          <button
                            type="button"
                            onClick={() => {
                              setInterruptingLic(lic);
                              setDiasDevueltos(1);
                              setMotivoInterrupcion('');
                            }}
                            className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                          >
                            Interrumpir
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenCuatrienioPdf()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-xl border border-blue-200 dark:border-blue-900 transition-colors shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Planilla Cuatrienio PDF</span>
            </button>
            <span className="text-xs text-slate-400 hidden sm:inline">
              * Cómputo de 4 años independientes.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal Interrupción */}
      {interruptingLic && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Interrumpir Licencia y Reintegrar Días
            </h3>
            <p className="text-xs text-slate-500">
              Indique los días hábiles no gozados que deben ser reincorporados al saldo del período {interruptingLic.anioPeriodo}:
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Días a Devolver
              </label>
              <input
                type="number"
                min={1}
                max={interruptingLic.diasHabilesTomados}
                value={diasDevueltos}
                onChange={(e) => setDiasDevueltos(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Motivo de Interrupción
              </label>
              <input
                type="text"
                value={motivoInterrupcion}
                onChange={(e) => setMotivoInterrupcion(e.target.value)}
                placeholder="ej. Requerimiento urgente de servicio por orden de jefatura..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setInterruptingLic(null)}
                className="px-3 py-1.5 text-xs text-slate-500"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (interruptingLic.id) {
                    onInterruptLicencia(interruptingLic.id, diasDevueltos, motivoInterrupcion);
                    setInterruptingLic(null);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl"
              >
                Confirmar Interrupción
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Document Preview Modal */}
      {previewPdfBlob && (
        <PdfPreviewModal
          isOpen={true}
          pdfBlob={previewPdfBlob.blob}
          title={previewPdfBlob.title}
          filename={previewPdfBlob.filename}
          paperSize={previewPdfBlob.paperSize}
          orientation={previewPdfBlob.orientation}
          onChangeFormat={(newSize, newOrient) => {
            handleOpenCuatrienioPdf(newSize, newOrient);
          }}
          onClose={() => setPdfPreviewBlob(null)}
        />
      )}
    </div>
  );
};
