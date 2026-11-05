import React, { useState, useEffect } from 'react';
import { X, Save, Car, Shield, AlertTriangle } from 'lucide-react';
import { Movil, MovilCondicion, DynamicCatalog } from '../../types/sgp';

interface MovilFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (movil: Movil) => void;
  initialData?: Movil | null;
  catalogs: DynamicCatalog[];
  delegacionId?: number;
}

export const MovilFormModal: React.FC<MovilFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  catalogs,
  delegacionId
}) => {
  const marcas = catalogs.filter((c) => c.category === 'Marca Movil').map((c) => c.value);
  const modelos = catalogs.filter((c) => c.category === 'Modelo Movil').map((c) => c.value);
  const aseguradoras = catalogs.filter((c) => c.category === 'Aseguradoras').map((c) => c.value);

  const [identificador, setIdentificador] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [dominio, setDominio] = useState('');
  const [chasis, setChasis] = useState('');
  const [motor, setMotor] = useState('');
  const [condicion, setCondicion] = useState<MovilCondicion>('En Servicio');
  const [kmActual, setKmActual] = useState('0');
  const [kmUltimoService, setKmUltimoService] = useState('0');
  const [kmProximoService, setKmProximoService] = useState('10000');
  const [vencimientoRto, setVencimientoRto] = useState('');
  const [vencimientoSeguro, setVencimientoSeguro] = useState('');
  const [companiaSeguro, setCompaniaSeguro] = useState('');
  const [numeroPoliza, setNumeroPoliza] = useState('');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (initialData) {
      setIdentificador(initialData.identificador || '');
      setMarca(initialData.marca || '');
      setModelo(initialData.modelo || '');
      setDominio(initialData.dominio || '');
      setChasis(initialData.chasis || '');
      setMotor(initialData.motor || '');
      setCondicion(initialData.condicion || 'En Servicio');
      setKmActual(initialData.kmActual || '0');
      setKmUltimoService(initialData.kmUltimoService || '0');
      setKmProximoService(initialData.kmProximoService || '10000');
      setVencimientoRto(initialData.vencimientoRto || '');
      setVencimientoSeguro(initialData.vencimientoSeguro || '');
      setCompaniaSeguro(initialData.companiaSeguro || '');
      setNumeroPoliza(initialData.numeroPoliza || '');
      setObservaciones(initialData.observaciones || '');
    } else {
      setIdentificador(`JP-${String(Math.floor(Math.random() * 80) + 20)}`);
      setMarca(marcas[0] || 'Toyota');
      setModelo(modelos[0] || 'Hilux 2.8 4x4');
      setDominio('');
      setChasis('');
      setMotor('');
      setCondicion('En Servicio');
      setKmActual('45000');
      setKmUltimoService('40000');
      setKmProximoService('50000');
      setVencimientoRto('15/12/2026');
      setVencimientoSeguro('30/11/2026');
      setCompaniaSeguro(aseguradoras[0] || 'Provincia Seguros');
      setNumeroPoliza('');
      setObservaciones('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const movilData: Movil = {
      id: initialData?.id,
      identificador,
      marca,
      modelo,
      dominio: dominio.toUpperCase(),
      chasis,
      motor,
      condicion,
      kmActual,
      kmUltimoService,
      kmProximoService,
      vencimientoRto,
      vencimientoSeguro,
      companiaSeguro,
      numeroPoliza,
      observaciones,
      delegacionId: initialData?.delegacionId || delegacionId || 1
    };

    onSave(movilData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 text-blue-600 rounded-lg">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {initialData ? 'Editar Móvil Policial' : 'Registrar Nuevo Móvil'}
              </h2>
              <span className="text-xs text-slate-500">Parque Automotor • D.D.P.C.L.B.</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Identificador / N° (*)
              </label>
              <input
                type="text"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="ej. M-101 o JP-24"
                required
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dominio (Patente) (*)
              </label>
              <input
                type="text"
                value={dominio}
                onChange={(e) => setDominio(e.target.value)}
                placeholder="ej. AF 782 PL"
                required
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Condición Operativa (*)
              </label>
              <select
                value={condicion}
                onChange={(e) => setCondicion(e.target.value as MovilCondicion)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="En Servicio">En Servicio</option>
                <option value="Taller">Taller</option>
                <option value="Fuera de Servicio">Fuera de Servicio</option>
                <option value="En Reserva">En Reserva</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Marca
              </label>
              <select
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {marcas.map((m, i) => (
                  <option key={i} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Modelo
              </label>
              <select
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {modelos.map((m, i) => (
                  <option key={i} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                N° de Chasis
              </label>
              <input
                type="text"
                value={chasis}
                onChange={(e) => setChasis(e.target.value)}
                placeholder="N° de bastidor..."
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                N° de Motor
              </label>
              <input
                type="text"
                value={motor}
                onChange={(e) => setMotor(e.target.value)}
                placeholder="N° de motor..."
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* ODÓMETRO & SERVICE */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
              Control de Odómetro y Mantenimiento (Service)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Km Odómetro Actual (*)</label>
                <input
                  type="number"
                  value={kmActual}
                  onChange={(e) => setKmActual(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Km Último Service</label>
                <input
                  type="number"
                  value={kmUltimoService}
                  onChange={(e) => setKmUltimoService(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Km Próximo Service (*)</label>
                <input
                  type="number"
                  value={kmProximoService}
                  onChange={(e) => setKmProximoService(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* DOCUMENTACIÓN (RTO & SEGURO) */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
              Documentación y Vencimientos Obligatorios
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Vencimiento RTO (DD/MM/AAAA)</label>
                <input
                  type="text"
                  value={vencimientoRto}
                  onChange={(e) => setVencimientoRto(e.target.value)}
                  placeholder="15/12/2026"
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Vencimiento Seguro (DD/MM/AAAA)</label>
                <input
                  type="text"
                  value={vencimientoSeguro}
                  onChange={(e) => setVencimientoSeguro(e.target.value)}
                  placeholder="30/11/2026"
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Compañía Aseguradora</label>
                <select
                  value={companiaSeguro}
                  onChange={(e) => setCompaniaSeguro(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {aseguradoras.map((a, i) => (
                    <option key={i} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Número de Póliza</label>
                <input
                  type="text"
                  value={numeroPoliza}
                  onChange={(e) => setNumeroPoliza(e.target.value)}
                  placeholder="POL-881920"
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observaciones
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-slate-600">
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Móvil</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
