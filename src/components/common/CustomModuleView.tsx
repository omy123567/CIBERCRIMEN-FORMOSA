import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  Clock,
  User,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Sliders,
  Trash2,
  FolderOpen
} from 'lucide-react';
import { NavModuleItem, SisPolUser, InstitutionalConfig } from '../../types/sgp';
import { usePermissions } from '../../context/PermissionsContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface CustomRecord {
  id: string;
  moduleId: string;
  fecha: string;
  hora: string;
  personalNombre: string;
  titulo: string;
  descripcion: string;
  estado: 'PENDIENTE' | 'EN_CURSO' | 'CONCLUIDO';
  observaciones?: string;
  delegacionId: number;
}

interface CustomModuleViewProps {
  currentModuleId: string;
  navModulesConfig: NavModuleItem[];
  currentUser: SisPolUser;
  delegacionId: number;
  institutionalConfig: InstitutionalConfig;
  onNavigate: (moduleId: string) => void;
  onOpenModuleAdmin?: () => void;
}

export const CustomModuleView: React.FC<CustomModuleViewProps> = ({
  currentModuleId,
  navModulesConfig,
  currentUser,
  delegacionId,
  institutionalConfig,
  onNavigate,
  onOpenModuleAdmin
}) => {
  const perms = usePermissions();
  const currentItem = navModulesConfig.find((m) => m.id === currentModuleId) || {
    id: currentModuleId,
    label: currentModuleId.startsWith('folder_') ? 'Carpeta Principal' : currentModuleId,
    order: 1,
    enabled: true,
    parentModuleId: null,
    isFolderGroup: currentModuleId.startsWith('folder_')
  };

  const parentFolder = currentItem.parentModuleId
    ? navModulesConfig.find((m) => m.id === currentItem.parentModuleId)
    : null;

  // Submodules if this is a folder
  const childSubmodules = useMemo(() => {
    return navModulesConfig.filter((m) => m.parentModuleId === currentItem.id && m.enabled);
  }, [navModulesConfig, currentItem.id]);

  // Operational records for this module
  const storageKey = `sispol_custom_records_${currentModuleId}_${delegacionId}`;
  const [records, setRecords] = useState<CustomRecord[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      setRecords(stored ? JSON.parse(stored) : []);
    } catch {
      setRecords([]);
    }
  }, [storageKey]);

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<'TODOS' | 'PENDIENTE' | 'EN_CURSO' | 'CONCLUIDO'>('TODOS');
  const [isNewRecordModalOpen, setIsNewRecordModalOpen] = useState(false);

  // New Record Form State
  const [formFecha, setFormFecha] = useState(new Date().toISOString().slice(0, 10));
  const [formHora, setFormHora] = useState(new Date().toTimeString().slice(0, 5));
  const [formPersonal, setFormPersonal] = useState(currentUser.nombreApellido || '');
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formEstado, setFormEstado] = useState<'PENDIENTE' | 'EN_CURSO' | 'CONCLUIDO'>('CONCLUIDO');
  const [formObservaciones, setFormObservaciones] = useState('');

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!perms.canCreate) return;
    if (!formTitulo.trim()) return;

    const newRec: CustomRecord = {
      id: `rec_${Date.now()}`,
      moduleId: currentModuleId,
      fecha: formFecha,
      hora: formHora,
      personalNombre: formPersonal.trim() || currentUser.username,
      titulo: formTitulo.trim(),
      descripcion: formDescripcion.trim(),
      estado: formEstado,
      observaciones: formObservaciones.trim(),
      delegacionId
    };

    const updated = [newRec, ...records];
    setRecords(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    // Reset Form
    setFormTitulo('');
    setFormDescripcion('');
    setFormObservaciones('');
    setIsNewRecordModalOpen(false);
  };

  const handleDeleteRecord = (id: string) => {
    if (!perms.canDelete) return;
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        !searchTerm.trim() ||
        r.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.personalNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
      const matchEstado = filterEstado === 'TODOS' || r.estado === filterEstado;
      return matchSearch && matchEstado;
    });
  }, [records, searchTerm, filterEstado]);

  // Export PDF Report
  const handleExportPDF = () => {
    if (!perms.canExport) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const policeName = institutionalConfig.policeForce || 'POLICÍA DE LA PROVINCIA DE FORMOSA';
    const subName = institutionalConfig.subdivision || 'Dirección General Policía Científica';
    const unitName = institutionalConfig.division || 'División Investigación Cibercrimen';

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(policeName.toUpperCase(), 14, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(subName, 14, 20);
    doc.text(unitName, 14, 25);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`REPORTE OPERATIVO: ${currentItem.label.toUpperCase()}`, 14, 35);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}`, 14, 41);
    doc.text(`Total de Registros Registrados: ${filteredRecords.length}`, 14, 46);

    // Table
    const tableData = filteredRecords.map((r, idx) => [
      String(idx + 1),
      r.fecha,
      r.hora,
      r.personalNombre,
      r.titulo,
      r.descripcion || '-',
      r.estado
    ]);

    autoTable(doc, {
      startY: 52,
      head: [['N°', 'Fecha', 'Hora', 'Personal a Cargo', 'Tarea / Novedad', 'Detalle Operativo', 'Estado']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      styles: { overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 20 },
        2: { cellWidth: 15 },
        3: { cellWidth: 35 },
        4: { cellWidth: 40 },
        5: { cellWidth: 45 },
        6: { cellWidth: 20, halign: 'center' }
      }
    });

    doc.save(`Reporte_${currentItem.label.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Breadcrumb Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span
                onClick={() => onNavigate('dashboard')}
                className="cursor-pointer hover:underline text-blue-600 dark:text-blue-400 font-semibold"
              >
                Inicio
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              {parentFolder ? (
                <>
                  <span
                    onClick={() => onNavigate(parentFolder.id)}
                    className="cursor-pointer hover:underline text-blue-600 dark:text-blue-400 font-semibold"
                  >
                    {parentFolder.label}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{currentItem.label}</span>
                </>
              ) : (
                <span className="text-slate-800 dark:text-slate-200 font-bold">{currentItem.label}</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-sm">
                {currentItem.isFolderGroup ? <FolderOpen className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {currentItem.label}
                  </h1>
                  {currentItem.isFolderGroup && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      Módulo Principal / Carpeta
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentItem.isFolderGroup
                    ? `Contenedor jerárquico oficial con ${childSubmodules.length} submódulo(s) operativos asignados.`
                    : `Gestión y registro operativo oficial para el módulo ${currentItem.label}.`}
                </p>
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenModuleAdmin && perms.canAdminModules && (
              <button
                type="button"
                onClick={onOpenModuleAdmin}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors border border-slate-300 dark:border-slate-700"
                title="Personalizar este módulo, renombrar o mover submódulos"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                <span>Personalizar Módulo</span>
              </button>
            )}

            {perms.canExport && (
              <button
                type="button"
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors border border-slate-300 dark:border-slate-700"
                title="Exportar reporte en formato PDF oficial"
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                <span>Exportar PDF</span>
              </button>
            )}

            {perms.canCreate && (
              <button
                type="button"
                onClick={() => setIsNewRecordModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nuevo Registro</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* If Folder: Display Submodules Cards Grid */}
      {currentItem.isFolderGroup && childSubmodules.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Submódulos Asignados a {currentItem.label} ({childSubmodules.length})
            </h3>
            <span className="text-[11px] text-slate-400">Haga clic en cualquier submódulo para acceder directamente</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {childSubmodules.map((sub) => (
              <div
                key={sub.id}
                onClick={() => onNavigate(sub.id)}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer shadow-xs hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {sub.label}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ID: {sub.id}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-500 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operational Table & Search Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              Libro de Novedades y Registros Operativos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Historial de actuaciones, personal interviniente y estado de ejecución.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por título, personal o descripción..."
                className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white w-64"
              />
            </div>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="CONCLUIDO">Concluido</option>
              <option value="EN_CURSO">En Curso</option>
              <option value="PENDIENTE">Pendiente</option>
            </select>
          </div>
        </div>

        {/* Records Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">N°</th>
                <th className="py-2.5 px-3">Fecha y Hora</th>
                <th className="py-2.5 px-3">Personal a Cargo</th>
                <th className="py-2.5 px-3">Actividad / Tarea</th>
                <th className="py-2.5 px-3">Detalle Operativo</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
                <th className="py-2.5 px-3 text-center w-16">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-6 h-6 text-slate-400" />
                      <span>No se encontraron registros operativos cargados en este módulo.</span>
                      {perms.canCreate && (
                        <button
                          type="button"
                          onClick={() => setIsNewRecordModalOpen(true)}
                          className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                        >
                          + Cargar el primer registro
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-white">{r.fecha}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.hora} hs</div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {r.personalNombre}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                      {r.titulo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {r.descripcion || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.estado === 'CONCLUIDO'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : r.estado === 'EN_CURSO'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {r.estado}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {perms.canDelete ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(r.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                          title="Eliminar este registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Record Modal */}
      {isNewRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Nuevo Registro en {currentItem.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewRecordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hora *
                  </label>
                  <input
                    type="time"
                    required
                    value={formHora}
                    onChange={(e) => setFormHora(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Personal a Cargo / Interviniente *
                </label>
                <input
                  type="text"
                  required
                  value={formPersonal}
                  onChange={(e) => setFormPersonal(e.target.value)}
                  placeholder="Nombre y jerarquía del personal responsable..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título de la Novedad / Tarea Realizada *
                </label>
                <input
                  type="text"
                  required
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="ej. Relevo de guardia, Control operativo de acceso, Peritaje..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detalle Operativo / Observaciones
                </label>
                <textarea
                  rows={3}
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Descripción detallada de la actuación realizada..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estado de la Actuación
                </label>
                <select
                  value={formEstado}
                  onChange={(e) => setFormEstado(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="CONCLUIDO">Concluido / Finalizado</option>
                  <option value="EN_CURSO">En Curso / En Desarrollo</option>
                  <option value="PENDIENTE">Pendiente / Por Iniciar</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewRecordModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-all active:scale-95"
                >
                  Guardar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
