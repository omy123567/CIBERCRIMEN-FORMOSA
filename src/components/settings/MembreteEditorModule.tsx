import React, { useState, useId } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  RotateCcw,
  Check,
  Building2,
  FileText,
  Eye,
  Info
} from 'lucide-react';
import { InstitutionalConfig, MembreteLine } from '../../types/sgp';
import { InstitutionalLetterhead } from '../common/InstitutionalLetterhead';
import { sgpManager } from '../../db/dexieDb';

interface MembreteEditorModuleProps {
  institutionalConfig: InstitutionalConfig;
  onRefresh: () => void;
}

const DEFAULT_HEADER_LINES: MembreteLine[] = [
  {
    id: 'line-1',
    text: 'POLICÍA DE LA PROVINCIA DE FORMOSA',
    bold: true,
    underline: false,
    size: 'XL',
    color: 'AZUL_POLICIAL'
  },
  {
    id: 'line-2',
    text: 'DIVISIÓN INVESTIGACIÓN CIBERCRIMEN',
    bold: true,
    underline: false,
    size: 'LG',
    color: 'AZUL_POLICIAL'
  },
  {
    id: 'line-3',
    text: 'DELEGACIÓN POLICÍA CIENTÍFICA LAGUNA BLANCA',
    bold: true,
    underline: true,
    size: 'LG',
    color: 'AZUL_POLICIAL'
  },
  {
    id: 'line-4',
    text: 'Calle San Martín e H. Irigoyen - Bº Centro - Laguna Blanca - C.P. 3613',
    bold: false,
    underline: false,
    size: 'SM',
    color: 'GRIS_SUAVE'
  },
  {
    id: 'line-5',
    text: 'Tel.: 3704-040169 / E-mail: pol.delgcrimlagunablanca@formosa.gov.ar',
    bold: false,
    underline: false,
    size: 'SM',
    color: 'GRIS_SUAVE'
  }
];

export const MembreteEditorModule: React.FC<MembreteEditorModuleProps> = ({
  institutionalConfig,
  onRefresh
}) => {
  // Lines state
  const [lines, setLines] = useState<MembreteLine[]>(
    institutionalConfig.headerLines && institutionalConfig.headerLines.length > 0
      ? institutionalConfig.headerLines
      : DEFAULT_HEADER_LINES
  );

  // Logos state
  const [logoLeftUrl, setLogoLeftUrl] = useState<string | undefined>(
    institutionalConfig.logoLeftUrl || '/logo-policia-formosa.png'
  );
  const [logoRightUrl, setLogoRightUrl] = useState<string | undefined>(
    institutionalConfig.logoRightUrl || institutionalConfig.logoDataUrl || '/logo-dgpc.png'
  );
  const [logoLeftFileName, setLogoLeftFileName] = useState<string>('Escudo_Policia_Formosa.png');
  const [logoRightFileName, setLogoRightFileName] = useState<string>('Emblema_DGPC.png');

  // Mottos state
  const [mottoLeft, setMottoLeft] = useState(
    institutionalConfig.mottoLeft ?? '"La seguridad pública es una construcción colectiva"'
  );
  const [mottoRight, setMottoRight] = useState(institutionalConfig.mottoRight ?? 'D.G.P.C.');

  // Address and Phones
  const [addressLine1, setAddressLine1] = useState(
    institutionalConfig.addressLine1 || 'Calle San Martín e H. Irigoyen - Bº Centro - Laguna Blanca - C.P. 3613'
  );
  const [telefonosCorreos, setTelefonosCorreos] = useState(
    institutionalConfig.telefonosCorreos ||
      institutionalConfig.addressLine2 ||
      'Tel.: 3704-040169 / E-mail: pol.delgcrimlagunablanca@formosa.gov.ar'
  );

  // Correlatives and Footers
  const [siglasDependencia, setSiglasDependencia] = useState(
    institutionalConfig.siglasDependencia || 'DPC-LB'
  );
  const [textoPiePaginaPdf, setTextoPiePaginaPdf] = useState(
    institutionalConfig.textoPiePaginaPdf ||
      'Documento Reservado de Uso Oficial Interno - Delegación Policía Científica Laguna Blanca.'
  );

  // Identity and Signatures
  const [systemName, setSystemName] = useState(institutionalConfig.systemName || 'SGP SisPol');
  const [systemFullName, setSystemFullName] = useState(
    institutionalConfig.systemFullName || 'SGP / SisPol - Sistema de Gestión Policial'
  );
  const [footerTitle, setFooterTitle] = useState(
    institutionalConfig.footerTitle || 'Jefe Delegación D.D.P.C.L.B.'
  );
  const [footerName, setFooterName] = useState(
    institutionalConfig.footerName || 'Comisario Inspector Lic. Roberto M. Gómez'
  );

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Add new line
  const handleAddLine = () => {
    const newLine: MembreteLine = {
      id: `line-${Date.now()}`,
      text: 'NUEVA LÍNEA DE TEXTO INSTITUCIONAL',
      bold: false,
      underline: false,
      size: 'MD',
      color: 'AZUL_POLICIAL'
    };
    setLines([...lines, newLine]);
  };

  // Update line field
  const handleUpdateLine = (id: string, updates: Partial<MembreteLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };

  // Move line up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newLines = [...lines];
    const temp = newLines[index - 1];
    newLines[index - 1] = newLines[index];
    newLines[index] = temp;
    setLines(newLines);
  };

  // Move line down
  const handleMoveDown = (index: number) => {
    if (index === lines.length - 1) return;
    const newLines = [...lines];
    const temp = newLines[index + 1];
    newLines[index + 1] = newLines[index];
    newLines[index] = temp;
    setLines(newLines);
  };

  // Delete line
  const handleDeleteLine = (id: string) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  // Upload Left Logo
  const handleUploadLeftLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLeftFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoLeftUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Reset Left Logo
  const handleRemoveLeftLogo = () => {
    setLogoLeftUrl('/logo-policia-formosa.png');
    setLogoLeftFileName('Escudo_Policia_Formosa.png');
  };

  // Upload Right Logo
  const handleUploadRightLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoRightFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoRightUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Reset Right Logo
  const handleRemoveRightLogo = () => {
    setLogoRightUrl('/logo-dgpc.png');
    setLogoRightFileName('Emblema_DGPC.png');
  };

  // Reset to reglamentary default
  const handleResetToReglamentary = () => {
    setLines(DEFAULT_HEADER_LINES);
    setLogoLeftUrl('/logo-policia-formosa.png');
    setLogoRightUrl('/logo-dgpc.png');
    setMottoLeft('"La seguridad pública es una construcción colectiva"');
    setMottoRight('D.G.P.C.');
    setAddressLine1('Calle San Martín e H. Irigoyen - Bº Centro - Laguna Blanca - C.P. 3613');
    setTelefonosCorreos('Tel.: 3704-040169 / E-mail: pol.delgcrimlagunablanca@formosa.gov.ar');
    setSiglasDependencia('DPC-LB');
    setTextoPiePaginaPdf('Documento Reservado de Uso Oficial Interno - Delegación Policía Científica Laguna Blanca.');
  };

  // Save changes
  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedConfig: InstitutionalConfig = {
      ...institutionalConfig,
      systemName: systemName.trim() || 'SGP SisPol',
      systemFullName: systemFullName.trim() || 'SGP / SisPol - Sistema de Gestión Policial',
      policeForce: lines[0]?.text || institutionalConfig.policeForce,
      division: lines[1]?.text || institutionalConfig.division,
      subdivision: lines[2]?.text || institutionalConfig.subdivision,
      addressLine1,
      addressLine2: telefonosCorreos,
      telefonosCorreos,
      siglasDependencia,
      textoPiePaginaPdf,
      logoLeftUrl,
      logoRightUrl,
      logoDataUrl: logoRightUrl, // backward compatibility
      mottoLeft,
      mottoRight,
      headerLines: lines,
      footerTitle,
      footerName
    };

    await sgpManager.saveInstitutionalConfig(updatedConfig);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
    onRefresh();
  };

  // Live preview configuration object
  const livePreviewConfig: InstitutionalConfig = {
    ...institutionalConfig,
    logoLeftUrl,
    logoRightUrl,
    mottoLeft,
    mottoRight,
    headerLines: lines,
    addressLine1,
    addressLine2: telefonosCorreos
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-600/10 text-blue-700 dark:text-blue-400 rounded-2xl ring-1 ring-blue-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Membrete e Identidad Institucional Oficial
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Personalice las líneas centrales, logotipos bilaterales, tipografía oficial y pie de página reglamentario
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetToReglamentary}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 self-start sm:self-center"
          title="Restablecer membrete estándar reglamentario"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Valores por Defecto</span>
        </button>
      </div>

      {/* LIVE PREVIEW CARD (Wide, clean, realistic official document header) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Vista Previa en Vivo del Membrete Centrado Oficial
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Formato Proporcional A4 / Oficio
          </span>
        </div>

        <div className="p-4 sm:p-6 bg-slate-200/50 dark:bg-slate-950 flex justify-center">
          <div className="bg-white w-full max-w-4xl p-4 sm:p-6 rounded-xl shadow-md border border-slate-300 text-slate-900 transition-all">
            <InstitutionalLetterhead
              config={livePreviewConfig}
              reportTitle="LIBRO DE REGISTRO DE EXPEDIENTES JUDICIALES Y EVIDENCIAS"
              subTitle="Delegación Laguna Blanca • Policía Científica • Formosa"
            />
          </div>
        </div>
      </div>

      {/* MAIN CONFIGURATION FORM (Exact style matching image_28848a55.png) */}
      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* CARD 1: LÍNEAS DE TEXTO CENTRALES DEL MEMBRETE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Líneas de Texto Centrales del Membrete
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Puede agregar nuevas líneas, reordenarlas, cambiar formato y colores.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddLine}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#1E3A8A] hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl transition-all shadow-xs shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Agregar Línea</span>
            </button>
          </div>

          {/* List of lines */}
          <div className="space-y-2.5">
            {lines.map((line, idx) => (
              <div
                key={line.id}
                className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 transition-all"
              >
                {/* Text input */}
                <input
                  type="text"
                  value={line.text}
                  onChange={(e) => handleUpdateLine(line.id, { text: e.target.value })}
                  placeholder="Texto de la línea..."
                  className="flex-1 min-w-[200px] px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Format buttons: B and U */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleUpdateLine(line.id, { bold: !line.bold })}
                    className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-colors ${
                      line.bold
                        ? 'bg-[#1E3A8A] text-white font-black'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                    }`}
                    title="Negrita"
                  >
                    B
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateLine(line.id, { underline: !line.underline })}
                    className={`w-8 h-8 rounded-lg font-semibold text-xs flex items-center justify-center underline transition-colors ${
                      line.underline
                        ? 'bg-[#1E3A8A] text-white font-black'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                    }`}
                    title="Subrayado"
                  >
                    U
                  </button>
                </div>

                {/* Size select */}
                <select
                  value={line.size}
                  onChange={(e) =>
                    handleUpdateLine(line.id, {
                      size: e.target.value as MembreteLine['size']
                    })
                  }
                  className="px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shrink-0 focus:outline-none"
                >
                  <option value="XL">Título (XL)</option>
                  <option value="LG">Subtítulo (LG)</option>
                  <option value="MD">Normal (MD)</option>
                  <option value="SM">Chico (SM)</option>
                  <option value="XS">Mini (XS)</option>
                </select>

                {/* Color select */}
                <select
                  value={line.color}
                  onChange={(e) =>
                    handleUpdateLine(line.id, {
                      color: e.target.value as MembreteLine['color']
                    })
                  }
                  className="px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shrink-0 focus:outline-none"
                >
                  <option value="AZUL_POLICIAL">Azul Policial</option>
                  <option value="GRIS_OSCURO">Gris Oscuro</option>
                  <option value="GRIS_SUAVE">Gris Suave</option>
                  <option value="NEGRO">Negro</option>
                </select>

                {/* Reorder and Delete buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Subir línea"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === lines.length - 1}
                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Bajar línea"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteLine(line.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Eliminar línea"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CARD 2: ESCUDO / LOGO IZQUIERDO Y EMBLEMA / LOGO DERECHO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Logo Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>Escudo / Logo Izquierdo</span>
              </span>
            </div>

            <div className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="w-14 h-14 rounded-lg bg-white dark:bg-slate-900 p-1 border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                <img
                  src={logoLeftUrl || '/logo-policia-formosa.png'}
                  alt="Escudo Izquierdo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/logo-policia-formosa.png';
                  }}
                />
              </div>

              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-xs hover:bg-slate-50 transition-colors">
                    <Upload className="w-3 h-3 text-blue-600" />
                    <span>Seleccionar archivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLeftLogo}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleRemoveLeftLogo}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
                  >
                    Quitar
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 truncate block font-mono">
                  {logoLeftFileName}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Lema o Texto Debajo del Logo Izquierdo:
              </label>
              <input
                type="text"
                value={mottoLeft}
                onChange={(e) => setMottoLeft(e.target.value)}
                placeholder='"La seguridad pública es una construcción colectiva"'
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white italic focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Right Logo Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Emblema / Logo Derecho</span>
              </span>
            </div>

            <div className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="w-14 h-14 rounded-lg bg-white dark:bg-slate-900 p-1 border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                <img
                  src={logoRightUrl || '/logo-dgpc.png'}
                  alt="Emblema Derecho"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/logo-dgpc.png';
                  }}
                />
              </div>

              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-xs hover:bg-slate-50 transition-colors">
                    <Upload className="w-3 h-3 text-blue-600" />
                    <span>Seleccionar archivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadRightLogo}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleRemoveRightLogo}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
                  >
                    Quitar
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 truncate block font-mono">
                  {logoRightFileName}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Siglas o Texto Debajo del Logo Derecho:
              </label>
              <input
                type="text"
                value={mottoRight}
                onChange={(e) => setMottoRight(e.target.value)}
                placeholder="D.G.P.C."
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* CARD 3: DIRECCIÓN Y CONTACTOS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dirección / Ubicación de la Dependencia
              </label>
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Calle San Martín e H. Irigoyen - Bº Centro - Laguna Blanca - C.P. 3613"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Teléfonos y Correos Institucionales
              </label>
              <input
                type="text"
                value={telefonosCorreos}
                onChange={(e) => setTelefonosCorreos(e.target.value)}
                placeholder="Tel.: 3704-040169 / E-mail: pol.delgcrimlagunablanca@formosa.gov.ar"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* CARD 4: SIGLAS CORRELATIVOS Y PIE DE PÁGINA */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Siglas de la Dependencia (Correlativos) *
              </label>
              <input
                type="text"
                value={siglasDependencia}
                onChange={(e) => setSiglasDependencia(e.target.value)}
                placeholder="DPC-LB"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                Aparece en: 3812 /2026-{siglasDependencia || 'DPC-LB'}.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Texto de Pie de Página en Documentos PDF
              </label>
              <input
                type="text"
                value={textoPiePaginaPdf}
                onChange={(e) => setTextoPiePaginaPdf(e.target.value)}
                placeholder="Documento Reservado de Uso Oficial Interno - Delegación Policía Científica Laguna Blanca."
                className="w-full px-3 py-2 text-xs italic rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* CARD 5: IDENTIDAD DEL SISTEMA Y AUTORIDAD FIRMANTE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Identidad de Plataforma y Oficial Firmante
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Nombre Corto
              </label>
              <input
                type="text"
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                placeholder="SGP SisPol"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Título del Sistema
              </label>
              <input
                type="text"
                value={systemFullName}
                onChange={(e) => setSystemFullName(e.target.value)}
                placeholder="Sistema de Gestión Policial"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Cargo Firma (Sin Sello)
              </label>
              <input
                type="text"
                value={footerTitle}
                onChange={(e) => setFooterTitle(e.target.value)}
                placeholder="Jefe Delegación D.D.P.C.L.B."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Oficial Firmante
              </label>
              <input
                type="text"
                value={footerName}
                onChange={(e) => setFooterName(e.target.value)}
                placeholder="Comisario Inspector..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* BOTTOM SAVE BUTTON (Matching image_28848a55.png exactly) */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>Membrete oficial e identidad guardados exitosamente</span>
            </span>
          )}

          <button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold text-white bg-[#1E3A8A] hover:bg-blue-900 rounded-xl shadow-md transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Membrete Institucional Oficial</span>
          </button>
        </div>
      </form>
    </div>
  );
};
