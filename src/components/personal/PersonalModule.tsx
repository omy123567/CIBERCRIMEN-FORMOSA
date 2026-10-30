import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Shield,
  Edit,
  Trash2,
  FileText,
  Clock,
  Phone,
  AlertCircle,
  Image as ImageIcon,
  Eye,
  X,
  CreditCard,
  Mail,
  MapPin,
  IdCard,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  ShieldAlert
} from 'lucide-react';
import { Personal, DynamicCatalog, InstitutionalConfig, DocumentoPersonal, PersonalCustomFields, Expediente } from '../../types/sgp';
import { PersonalFormModal } from './PersonalFormModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PersonalNominaPdfModal } from './PersonalNominaPdfModal';
import { PersonalFichaPdfModal } from './PersonalFichaPdfModal';
import { exportPersonalAgrupadoTxt, exportIndividualJson } from '../../utils/sgpBackupZip';
import { sgpManager } from '../../db/dexieDb';
import { AttachmentZoomModal } from '../common/AttachmentZoomModal';

interface PersonalModuleProps {
  personalList: Personal[];
  expedientes?: Expediente[];
  catalogs: DynamicCatalog[];
  institutionalConfig: InstitutionalConfig;
  onRefresh: () => void;
  onNavigateToLicencias?: (personId: number) => void;
  onNavigateToPpi?: () => void;
}

export const PersonalModule: React.FC<PersonalModuleProps> = ({
  personalList,
  expedientes = [],
  catalogs,
  institutionalConfig,
  onRefresh,
  onNavigateToPpi
}) => {
  // View mode: 'cards' | 'table'
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrupo, setFilterGrupo] = useState('');
  const [filterJerarquia, setFilterJerarquia] = useState('');
  const [filterDisponible, setFilterDisponible] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Personal | null>(null);
  const [viewingPersonDetails, setViewingPersonDetails] = useState<Personal | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // PDF Export Modals
  const [isNominaModalOpen, setIsNominaModalOpen] = useState(false);
  const [fichaModalTarget, setFichaModalTarget] = useState<{ person: Personal | null; mode: 'individual' | 'blank' } | null>(null);

  // Attachment zoom modal
  const [zoomDoc, setZoomDoc] = useState<{ src: string; title: string } | null>(null);

  const grupos = catalogs.filter((c) => c.category === 'Grupos').map((c) => c.value);
  const jerarquias = catalogs.filter((c) => c.category === 'Jerarquias').map((c) => c.value);

  // Filtered List
  const filteredPersonal = useMemo(() => {
    return personalList.filter((p) => {
      if (filterGrupo && p.grupo !== filterGrupo) return false;
      if (filterJerarquia && p.jerarquia !== filterJerarquia) return false;
      if (filterDisponible === 'true' && !p.disponible) return false;
      if (filterDisponible === 'false' && p.disponible) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const nameMatch = p.apellidoNombre.toLowerCase().includes(q);
        const dniMatch = p.dni.includes(q);
        const plazaMatch = p.plaza.toLowerCase().includes(q);
        const jerMatch = p.jerarquia.toLowerCase().includes(q);
        return nameMatch || dniMatch || plazaMatch || jerMatch;
      }
      return true;
    });
  }, [personalList, filterGrupo, filterJerarquia, filterDisponible, searchTerm]);

  // Actions
  const handleSavePerson = async (person: Personal) => {
    const db = (await import('../../db/dexieDb')).db;
    if (person.id) {
      await db.personal.put(person);
    } else {
      await db.personal.add(person);
    }
    sgpManager.notify();
    onRefresh();
  };

  const handleDeletePerson = async () => {
    if (deleteTargetId) {
      const db = (await import('../../db/dexieDb')).db;
      await db.personal.delete(deleteTargetId);
      // Also delete linked licenses
      await db.licencias.where('personalId').equals(deleteTargetId).delete();
      sgpManager.notify();
      setDeleteTargetId(null);
      onRefresh();
    }
  };

  const parseCustom = (person: Personal): PersonalCustomFields => {
    try {
      return person.customFieldsJson ? JSON.parse(person.customFieldsJson) : {};
    } catch {
      return {};
    }
  };

  const calculateAntiguedad = (fechaIngreso?: string): number => {
    if (!fechaIngreso) return 0;
    let anioIngreso = 0;
    if (fechaIngreso.includes('/')) {
      const parts = fechaIngreso.split('/');
      anioIngreso = parseInt(parts[2] || parts[0], 10);
    } else if (fechaIngreso.includes('-')) {
      const parts = fechaIngreso.split('-');
      anioIngreso = parseInt(parts[0], 10);
    }
    if (!anioIngreso || isNaN(anioIngreso)) return 0;
    const anioActual = new Date().getFullYear();
    const diff = anioActual - anioIngreso;
    return diff > 0 ? diff : 0;
  };

  const getPpiCountForPerson = (person: Personal) => {
    if (!expedientes || expedientes.length === 0) return 0;
    return expedientes.filter((exp) => {
      try {
        const c = exp.customFieldsJson ? JSON.parse(exp.customFieldsJson) : {};
        if (!c.isPPI) return false;
        const plazaMatch = c.ppiPlaza && person.plaza && c.ppiPlaza.trim().toLowerCase() === person.plaza.trim().toLowerCase();
        const dniMatch = c.ppiDni && person.dni && c.ppiDni.replace(/\D/g, '') === person.dni.replace(/\D/g, '');
        return plazaMatch || dniMatch;
      } catch {
        return false;
      }
    }).length;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Nómina y Legajos de Personal
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
              {personalList.length} Efectivos
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestión de fichas policiales, armamento a cargo, licencias de conducir y documentación anexada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setEditingPerson(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Efectivo</span>
          </button>

          <button
            onClick={() => setIsNominaModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 dark:border-blue-900"
            title="Generar Nómina Oficial PDF (Personalizable por Delegación, Grupos, Papel y Orientación)"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>PDF Nómina</span>
          </button>

          <button
            onClick={() => setFichaModalTarget({ person: null, mode: 'blank' })}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 rounded-xl transition-colors border border-amber-200 dark:border-amber-900"
            title="Generar Formulario de Legajo en Blanco (Plantilla con líneas de puntos para rellenar a mano)"
          >
            <FileCheck className="w-4 h-4 text-amber-600" />
            <span>Formulario en Blanco</span>
          </button>

          <button
            onClick={() => exportPersonalAgrupadoTxt(personalList)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
            title="Exportar archivo de texto agrupado por Jerarquía"
          >
            <FileText className="w-4 h-4" />
            <span>TXT Agrupado</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Apellido, Nombre, DNI, Plaza o Jerarquía..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <select
            value={filterJerarquia}
            onChange={(e) => setFilterJerarquia(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">Todas las Jerarquías</option>
            {jerarquias.map((j, i) => (
              <option key={i} value={j}>{j}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterGrupo}
            onChange={(e) => setFilterGrupo(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">Todas las Guardias / Secciones</option>
            {grupos.map((g, i) => (
              <option key={i} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* View Switcher: Cards vs Table */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('cards')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'cards'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Fichas
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Planilla
          </button>
        </div>
      </div>

      {/* Main Content View */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPersonal.map((person) => {
            const custom = parseCustom(person);
            const docs = custom.documentosAdjuntos || [];
            const antiguedad = calculateAntiguedad(person.fechaIngreso);

            return (
              <div
                key={person.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Bar Card */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                        {person.jerarquia}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {person.apellidoNombre}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                        <span>DNI: {person.dni}</span>
                        <span>•</span>
                        <span>Plaza: {person.plaza}</span>
                      </div>
                      {getPpiCountForPerson(person) > 0 && (
                        <div className="mt-1.5">
                          <span
                            onClick={() => onNavigateToPpi?.()}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/40"
                            title="Ver causas en el Módulo PPI"
                          >
                            <ShieldAlert className="w-3 h-3 text-purple-600" />
                            <span>{getPpiCountForPerson(person)} Causa(s) PPI vinculada(s)</span>
                          </span>
                        </div>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        person.disponible
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {person.disponible ? 'Disponible' : person.motivoNoDisponible || 'No Disponible'}
                    </span>
                  </div>

                  {/* Section & Seniority */}
                  <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Guardia / Turno</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {person.grupo}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Antigüedad</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {antiguedad} años
                      </span>
                    </div>
                  </div>

                  {/* Equipment & Driver License */}
                  <div className="mt-3 space-y-2 text-xs">
                    {/* Licencia de Conducir */}
                    <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <CreditCard className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-[11px] font-medium truncate">
                          Lic. Conducir: {custom.licenciaConducirCategorias?.join(', ') || 'S/D'}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          custom.licenciaConducirEstado === 'VENCIDA'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                            : custom.licenciaConducirEstado === 'NO_POSEE'
                            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        }`}
                      >
                        {custom.licenciaConducirEstado || 'VIGENTE'}
                      </span>
                    </div>

                    {/* Armamento Asignado & Estado */}
                    <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-[11px] font-medium truncate">
                          {custom.armaAsignada || 'Sin arma asignada'}
                        </span>
                      </div>
                      {custom.armaEstado && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            custom.armaEstado === 'ASIGNADA'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                          }`}
                        >
                          {custom.armaEstado}
                        </span>
                      )}
                    </div>

                    {/* Documentos Anexados Badge */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setViewingPersonDetails(person)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          docs.length > 0
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 hover:bg-purple-100'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>
                          {docs.length > 0 ? `${docs.length} Doc(s) Anexado(s)` : 'Ver Ficha Completa'}
                        </span>
                      </button>

                      {docs.length > 0 && (
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                          DNI/Carnet
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 flex-wrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingPersonDetails(person)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Ficha</span>
                    </button>

                    <button
                      onClick={() => setFichaModalTarget({ person, mode: 'individual' })}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 dark:border-blue-900"
                      title="Generar Ficha de Legajo Oficial en PDF con todos los datos"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ficha PDF</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingPerson(person);
                        setIsFormOpen(true);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                      title="Editar Efectivo"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeleteTargetId(person.id!)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                      title="Eliminar Efectivo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Jerarquía y Nombre</th>
                  <th className="px-3 py-3">DNI / Plaza</th>
                  <th className="px-3 py-3">Guardia / Turno</th>
                  <th className="px-3 py-3 text-center">Antigüedad</th>
                  <th className="px-3 py-3">Licencia Conducir</th>
                  <th className="px-3 py-3">Arma Asignada</th>
                  <th className="px-3 py-3 text-center">Adjuntos</th>
                  <th className="px-3 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                {filteredPersonal.map((person) => {
                  const custom = parseCustom(person);
                  const docs = custom.documentosAdjuntos || [];
                  const antiguedad = calculateAntiguedad(person.fechaIngreso);

                  return (
                    <tr key={person.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        <div className="font-bold">{person.apellidoNombre}</div>
                        <div className="text-[11px] text-blue-600 dark:text-blue-400">{person.jerarquia}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px]">
                        <div>DNI: {person.dni}</div>
                        <div className="text-slate-400">Plaza: {person.plaza}</div>
                      </td>
                      <td className="px-3 py-3">{person.grupo}</td>
                      <td className="px-3 py-3 text-center font-mono font-bold text-blue-600">
                        {antiguedad} a.
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-mono text-[11px]">{custom.licenciaConducirCategorias?.join(', ') || 'S/D'}</div>
                        <span
                          className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                            custom.licenciaConducirEstado === 'VENCIDA'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {custom.licenciaConducirEstado || 'VIGENTE'}
                        </span>
                      </td>
                      <td className="px-3 py-3 truncate max-w-[140px]">
                        <div>{custom.armaAsignada || 'Sin arma'}</div>
                        {custom.armaEstado && custom.armaEstado !== 'ASIGNADA' && (
                          <span className="text-[9px] font-bold text-rose-600">
                            {custom.armaEstado}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => setViewingPersonDetails(person)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[11px] hover:bg-purple-100"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>{docs.length}</span>
                        </button>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            person.disponible
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {person.disponible ? 'Activo' : 'No Disp.'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setFichaModalTarget({ person, mode: 'individual' })}
                            className="p-1 text-blue-700 dark:text-blue-400 hover:bg-blue-50 rounded"
                            title="Ficha Oficial PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingPerson(person);
                              setIsFormOpen(true);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(person.id!)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details & Document Preview Modal */}
      {viewingPersonDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setViewingPersonDetails(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="p-3 bg-blue-600/10 text-blue-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase">
                  {viewingPersonDetails.jerarquia} • Plaza {viewingPersonDetails.plaza}
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {viewingPersonDetails.apellidoNombre}
                </h2>
                <div className="text-xs text-slate-500 font-mono">
                  DNI: {viewingPersonDetails.dni} • Fecha Ingreso: {viewingPersonDetails.fechaIngreso}
                </div>
              </div>
            </div>

            {/* Parse Custom Details */}
            {(() => {
              const custom = parseCustom(viewingPersonDetails);
              const docs = custom.documentosAdjuntos || [];
              const antiguedad = calculateAntiguedad(viewingPersonDetails.fechaIngreso);

              return (
                <div className="space-y-4 text-xs">
                  {/* Grid of Personal Data */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Sexo / Est. Civil</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {custom.sexo === 'F' ? 'Femenino' : 'Masculino'} • {custom.estadoCivil || 'S/D'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Antigüedad</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                        {antiguedad} años de servicio
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Guardia</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {viewingPersonDetails.grupo}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Teléfono</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {custom.telefono || 'Sin teléfono'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Email</span>
                      <span className="text-slate-800 dark:text-slate-200 truncate block">
                        {custom.email || 'Sin email'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Domicilio</span>
                      <span className="text-slate-800 dark:text-slate-200 truncate block">
                        {custom.domicilio ? `${custom.domicilio} (${custom.localidad || ''})` : 'Sin domicilio'}
                      </span>
                    </div>
                  </div>

                  {/* Driver License & Health Insurance */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <span>Licencia de Conducir</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 space-y-0.5">
                        <div>N°: {custom.licenciaConducirNumero || 'N/A'}</div>
                        <div>Categorías: <span className="font-bold text-blue-600">{custom.licenciaConducirCategorias?.join(', ') || 'Ninguna'}</span></div>
                        <div>Vencimiento: {custom.licenciaConducirVencimiento || 'S/D'} ({custom.licenciaConducirEstado || 'VIGENTE'})</div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                        <IdCard className="w-4 h-4 text-emerald-600" />
                        <span>Obra Social</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 space-y-0.5">
                        <div>Entidad: {custom.obraSocial || 'I.A.S.E.P.'}</div>
                        <div>N° Credencial: {custom.numeroCredencial || 'S/D'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Equipment */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      <span>Equipamiento Asignado</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                      <div>
                        Arma: <span className="font-semibold text-slate-900 dark:text-white">{custom.armaAsignada || 'Sin arma'}</span>
                        {custom.armaEstado && custom.armaEstado !== 'ASIGNADA' && (
                          <div className="text-rose-600 font-bold mt-0.5">
                            Estado: {custom.armaEstado} ({custom.armaMotivoRetencion})
                          </div>
                        )}
                      </div>
                      <div>
                        Chaleco: <span className="font-semibold text-slate-900 dark:text-white">{custom.chalecoAsignado || 'Sin chaleco'}</span>
                        {custom.chalecoEstado && custom.chalecoEstado !== 'ASIGNADO' && (
                          <div className="text-rose-600 font-bold mt-0.5">
                            Estado: {custom.chalecoEstado} ({custom.chalecoMotivoRetencion})
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Document Attachments Gallery with Zoom Viewer */}
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-purple-600" />
                      <span>Documentos e Imágenes Anexadas ({docs.length})</span>
                    </h3>

                    {docs.length === 0 ? (
                      <div className="p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400">
                        No hay archivos ni fotos adjuntas en el legajo.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {docs.map((doc) => (
                          <div
                            key={doc.id}
                            className="group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2 shadow-xs"
                          >
                            <div className="h-28 w-full bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center relative">
                              <img
                                src={doc.dataUrl}
                                alt={doc.titulo}
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => setZoomDoc({ src: doc.dataUrl || '', title: doc.titulo || 'Documento' })}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                                title="Ver con Zoom"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="mt-1.5 text-[11px] font-bold text-slate-900 dark:text-white truncate">
                              {doc.titulo}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">
                              {doc.tipo} • {doc.fechaSubida}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setFichaModalTarget({ person: viewingPersonDetails, mode: 'individual' })}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95"
              >
                <FileText className="w-4 h-4" />
                <span>Generar Ficha PDF Oficial</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingPersonDetails(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Zoom Modal */}
      {zoomDoc && (
        <AttachmentZoomModal
          isOpen={true}
          imageSrc={zoomDoc.src}
          title={zoomDoc.title}
          onClose={() => setZoomDoc(null)}
        />
      )}

      {/* Personal Form Modal */}
      <PersonalFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSavePerson}
        initialData={editingPerson}
        catalogs={catalogs}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        title="Eliminar Efectivo Policial"
        message="¿Está seguro que desea eliminar este efectivo de la nómina? Se borrarán sus datos y el historial de licencias asociado de forma permanente."
        confirmText="Sí, Eliminar"
        danger={true}
        onConfirm={handleDeletePerson}
        onClose={() => setDeleteTargetId(null)}
      />

      {/* Nomina PDF Options & Preview Modal */}
      {isNominaModalOpen && (
        <PersonalNominaPdfModal
          isOpen={isNominaModalOpen}
          onClose={() => setIsNominaModalOpen(false)}
          personalList={personalList}
          config={institutionalConfig}
        />
      )}

      {/* Ficha Individual & Formulario en Blanco Modal */}
      {fichaModalTarget && (
        <PersonalFichaPdfModal
          isOpen={true}
          onClose={() => setFichaModalTarget(null)}
          config={institutionalConfig}
          personal={fichaModalTarget.person}
          mode={fichaModalTarget.mode}
        />
      )}
    </div>
  );
};
