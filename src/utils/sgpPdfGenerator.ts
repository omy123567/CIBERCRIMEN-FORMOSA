import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  InstitutionalConfig,
  Expediente,
  Personal,
  Movil,
  Reparacion,
  Recargo,
  Charla,
  Licencia,
  PersonalCustomFields
} from '../types/sgp';
import { CuatrienioResumen } from './licenciasCuatrienio';

export type SgpPaperSize = 'a4' | 'legal' | 'letter';
export type SgpOrientation = 'portrait' | 'landscape';

export interface SgpPdfOptions {
  paperSize?: SgpPaperSize;
  orientation?: SgpOrientation;
}

export interface PersonalRosterOptions extends SgpPdfOptions {
  discriminarGrupos?: boolean;
  estadoRevista?: 'ALL' | 'DISPONIBLE' | 'LICENCIA';
}

/**
 * Draws the official Formosa police letterhead with dual logos and centered typography
 */
export function drawSgpHeader(
  doc: jsPDF,
  config: InstitutionalConfig,
  reportTitle: string,
  subTitle?: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  const leftLogo = config.logoLeftUrl || '/logo-policia-formosa.png';
  const rightLogo = config.logoRightUrl || config.logoDataUrl || '/logo-dgpc.png';
  const mottoLeft = config.mottoLeft ?? '"La seguridad pública es una construcción colectiva"';
  const mottoRight = config.mottoRight ?? 'D.G.P.C.';

  // 1. Left Logo (Escudo Policía de Formosa)
  try {
    doc.addImage(leftLogo, 'PNG', 14, 7, 18, 18);
  } catch {
    doc.setDrawColor(30, 58, 138);
    doc.circle(23, 16, 8);
    doc.setFontSize(6);
    doc.setTextColor(30, 58, 138);
    doc.text('POLICÍA', 23, 16.5, { align: 'center' });
  }

  if (mottoLeft) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5);
    doc.setTextColor(100, 116, 139);
    const splitMotto = doc.splitTextToSize(mottoLeft, 28);
    doc.text(splitMotto, 23, 27, { align: 'center' });
  }

  // 2. Right Logo (Escudo D.G.P.C.)
  const rightX = pageWidth - 14 - 18;
  try {
    doc.addImage(rightLogo, 'PNG', rightX, 7, 18, 18);
  } catch {
    doc.setDrawColor(30, 58, 138);
    doc.circle(rightX + 9, 16, 8);
    doc.setFontSize(6);
    doc.setTextColor(30, 58, 138);
    doc.text('D.G.P.C.', rightX + 9, 16.5, { align: 'center' });
  }

  if (mottoRight) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(30, 58, 138);
    doc.text(mottoRight, rightX + 9, 27, { align: 'center' });
  }

  // 3. Center Typography (Deep Police Blue #1E3A8A, Centered)
  const centerX = pageWidth / 2;
  let endHeaderY = 32;

  if (config.headerLines && config.headerLines.length > 0) {
    let lineY = 10;
    config.headerLines.forEach((line) => {
      const fontSize =
        line.size === 'XL' ? 9.5 : line.size === 'LG' ? 8.5 : line.size === 'MD' ? 7.5 : line.size === 'SM' ? 6.5 : 5.5;

      const [r, g, b] =
        line.color === 'AZUL_POLICIAL'
          ? [30, 58, 138]
          : line.color === 'GRIS_OSCURO'
          ? [51, 65, 85]
          : line.color === 'GRIS_SUAVE'
          ? [100, 116, 139]
          : [15, 23, 42];

      doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(r, g, b);
      doc.text(line.text, centerX, lineY, { align: 'center' });

      if (line.underline) {
        const textW = doc.getTextWidth(line.text);
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(0.3);
        doc.line(centerX - textW / 2, lineY + 0.8, centerX + textW / 2, lineY + 0.8);
      }

      lineY += fontSize >= 9 ? 4.5 : fontSize >= 8 ? 4.2 : fontSize >= 7 ? 3.8 : 3.3;
    });
    endHeaderY = Math.max(lineY + 1.5, 31);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 58, 138);
    doc.text((config.policeForce || 'POLICÍA DE LA PROVINCIA DE FORMOSA').toUpperCase(), centerX, 11, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text((config.division || 'DIVISIÓN INVESTIGACIÓN CIBERCRIMEN').toUpperCase(), centerX, 15.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 138);
    const subText = (config.subdivision || 'DELEGACIÓN POLICÍA CIENTÍFICA LAGUNA BLANCA').toUpperCase();
    doc.text(subText, centerX, 19.5, { align: 'center' });
    const subW = doc.getTextWidth(subText);
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.3);
    doc.line(centerX - subW / 2, 20.3, centerX + subW / 2, 20.3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      config.addressLine1 || 'Calle San Martín e H. Irigoyen - Bº Centro - Laguna Blanca - C.P. 3613',
      centerX,
      24,
      { align: 'center' }
    );
    doc.text(
      config.addressLine2 || 'Tel.: 3704-040169 / E-mail: pol.delgcrimlagunablanca@formosa.gov.ar',
      centerX,
      27.5,
      { align: 'center' }
    );
    endHeaderY = 31;
  }

  // Thin dividing line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, endHeaderY + 1, pageWidth - 14, endHeaderY + 1);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(reportTitle, 14, endHeaderY + 7);

  if (subTitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(subTitle, 14, endHeaderY + 11.5);
    return endHeaderY + 16;
  }

  return endHeaderY + 12;
}

/**
 * Draws official signature block without seal
 */
export function drawSgpSignatureBlock(doc: jsPDF, config: InstitutionalConfig, startY?: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const y = startY && startY < pageHeight - 35 ? startY + 14 : pageHeight - 25;

  const boxWidth = 70;
  const rightX = pageWidth - 14 - boxWidth;

  // Clean signature line without any stamp seal
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.5);
  doc.line(rightX, y, rightX + boxWidth, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text(config.footerTitle, rightX + boxWidth / 2, y + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(config.footerName, rightX + boxWidth / 2, y + 8.5, { align: 'center' });
  doc.text('Firma y Aclaración', rightX + boxWidth / 2, y + 12.5, { align: 'center' });

  if (config.textoPiePaginaPdf) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(config.textoPiePaginaPdf, 14, pageHeight - 6);
  }
}

/**
 * Calculate Antiguedad helper
 */
export function calculateAntiguedad(fechaIngreso?: string): number {
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
  const diff = new Date().getFullYear() - anioIngreso;
  return diff > 0 ? diff : 0;
}

/**
 * Calculate Age helper
 */
export function calculateEdad(fechaNacimiento?: string): string {
  if (!fechaNacimiento) return '-';
  let anioNac = 0;
  if (fechaNacimiento.includes('/')) {
    const parts = fechaNacimiento.split('/');
    anioNac = parseInt(parts[2], 10);
  } else if (fechaNacimiento.includes('-')) {
    const parts = fechaNacimiento.split('-');
    anioNac = parseInt(parts[0], 10);
  }
  if (!anioNac || isNaN(anioNac)) return '-';
  const age = new Date().getFullYear() - anioNac;
  return age > 0 ? `${age} años` : '-';
}

/* =========================================================================================
   1. DASHBOARD EXECUTIVE REPORT
   ========================================================================================= */

export function generateSgpDashboardReportDoc(
  config: InstitutionalConfig,
  yearSelected: string,
  periodLabel: string,
  stats: {
    totalExpedientes: number;
    enTramite: number;
    elevados: number;
    vencidos: number;
    totalPersonasResguardo: number;
    ppiCount: number;
    movilesOperativos: number;
    movilesTaller: number;
  },
  reqDistribution: { req: string; count: number }[],
  courtDistribution: { court: string; count: number }[],
  options?: SgpPdfOptions
): jsPDF {
  const paperSize = options?.paperSize || 'a4';
  const orientation = options?.orientation || 'portrait';
  const doc = new jsPDF(orientation, 'mm', paperSize);

  const startY = drawSgpHeader(
    doc,
    config,
    `INFORME ESTADÍSTICO DE GESTIÓN POLICIAL - AÑO ${yearSelected}`,
    `Período: ${periodLabel} • Emisión: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
  );

  autoTable(doc, {
    startY,
    head: [['Indicador Operativo', 'Cómputo Oficial', 'Situación / Regla']],
    body: [
      ['Expedientes Totales Registrados', `${stats.totalExpedientes}`, `Causas ingresadas año ${yearSelected}`],
      ['Expedientes en Trámite Activo', `${stats.enTramite}`, `En diligenciamiento por la instrucción`],
      ['Expedientes Diligenciados / Elevados', `${stats.elevados}`, `Elevados con nota y recibo formal`],
      ['Expedientes Vencidos', `${stats.vencidos}`, stats.vencidos > 0 ? 'ALERTA: Plazo judicial caducado' : 'Sin atrasos'],
      ['Personas en Resguardo de Evidencia', `${stats.totalPersonasResguardo}`, 'Suma estricta por personas vinculadas'],
      ['Causas con Personal Policial Involucrado (PPI)', `${stats.ppiCount}`, 'Sujetas a informe sumarial interno'],
      ['Parque Automotor Operativo', `${stats.movilesOperativos} operativos`, `${stats.movilesTaller} en taller mecánico`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.5 }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text('DISTRIBUCIÓN POR TIPO DE REQUERIMIENTO (Cómputo de Personas en Resguardos)', 14, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Tipo de Requerimiento Operativo / Pericial', 'Cantidad / Personas']],
    body: reqDistribution.map((r) => [r.req, r.count.toString()]),
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text('DISTRIBUCIÓN POR JUZGADO / FISCALÍA INTERVINIENTE', 14, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Juzgado / Fuero Judicial', 'Expedientes Tramitados']],
    body: courtDistribution.map((c) => [c.court, c.count.toString()]),
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2 }
  });

  drawSgpSignatureBlock(doc, config, (doc as any).lastAutoTable.finalY);
  return doc;
}

export function exportSgpDashboardReportPDF(
  config: InstitutionalConfig,
  yearSelected: string,
  periodLabel: string,
  stats: any,
  reqDistribution: any,
  courtDistribution: any,
  options?: SgpPdfOptions
) {
  const doc = generateSgpDashboardReportDoc(config, yearSelected, periodLabel, stats, reqDistribution, courtDistribution, options);
  doc.save(`SGP_Informe_Gestion_${yearSelected}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* =========================================================================================
   2. EXPEDIENTES LOGBOOK REPORT
   ========================================================================================= */

export function generateExpedientesLogbookDoc(
  config: InstitutionalConfig,
  expedientesList: Expediente[],
  filterTitle = 'Libro de Registro de Expedientes y Tareas Judiciales',
  options?: SgpPdfOptions
): jsPDF {
  const paperSize = options?.paperSize || 'a4';
  const orientation = options?.orientation || 'landscape';
  const doc = new jsPDF(orientation, 'mm', paperSize);

  const startY = drawSgpHeader(
    doc,
    config,
    'LIBRO DE REGISTRO DE EXPEDIENTES JUDICIALES Y EVIDENCIAS',
    `${filterTitle} • Total Causas: ${expedientesList.length} • Dependencia Oficial`
  );

  const rows = expedientesList.map((e) => {
    let custom: any = {};
    try {
      custom = e.customFieldsJson ? JSON.parse(e.customFieldsJson) : {};
    } catch {
      // ignore
    }

    const expAnio = `${e.nroExpediente}/${e.anio}`;
    const fecha = e.fechaIngreso || '-';

    let oficioTexto = '-';
    if (custom.oficioNro) {
      oficioTexto = `${custom.oficioNro}/${custom.oficioAnio || e.anio}/${custom.oficioLetras || 'S/L'}`;
    } else if (custom.oficioOrigen) {
      oficioTexto = custom.oficioOrigen;
    } else if (e.tipoOficio === 'Sin Oficio') {
      oficioTexto = 'SIN OFICIO';
    } else {
      oficioTexto = e.tipoOficio || '-';
    }

    const juzgado = e.juzgado || '-';
    const dependencia = e.dependenciaSolicitante || custom.dependenciaSolicitante || (e as any).dependenciaOrigen || e.dependencia || '-';
    const tipoReq = e.tipoRequerimiento || '-';

    let resumen = custom.resumen || e.caratula || '-';
    if (custom.evidencePersons && custom.evidencePersons.length > 0 && !resumen.includes('Resguardo')) {
      const pText = custom.evidencePersons.map((p: any) => `${p.fullName} (DNI ${p.dni})`).join(', ');
      resumen = `${resumen} | Personas: ${pText}`;
    }

    let tarea = '-';
    if (custom.tareaRealizada) {
      tarea = custom.tareaRealizada;
    } else if (custom.isTareaRealizadaEjecutada) {
      tarea = 'EJECUTADA / REALIZADA';
    } else if (e.estado === 'Diligenciado' || e.estado === 'Elevado') {
      tarea = 'DILIGENCIADA';
    } else {
      tarea = 'En trámite';
    }

    return [
      expAnio,
      fecha,
      oficioTexto,
      juzgado,
      dependencia,
      tipoReq,
      resumen,
      tarea
    ];
  });

  const isPortrait = orientation === 'portrait';

  autoTable(doc, {
    startY,
    head: [
      ['Expediente/Año', 'Fecha', 'Oficio/Año/Letra', 'Juzgado', 'Dependencia', 'Tipo Req.', 'Resumen', 'Tarea realizada']
    ],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 7, fontStyle: 'bold' },
    styles: { fontSize: isPortrait ? 5.5 : 6.5, cellPadding: isPortrait ? 1.5 : 2, overflow: 'linebreak' },
    didParseCell: (data) => {
      // Highlight PPI rows with celeste
      if (data.section === 'body') {
        const item = expedientesList[data.row.index];
        if (item) {
          try {
            const parsed = item.customFieldsJson ? JSON.parse(item.customFieldsJson) : {};
            if (parsed.isPPI) {
              data.cell.styles.fillColor = [224, 242, 254];
              data.cell.styles.textColor = [12, 74, 110];
            }
          } catch {
            // ignore
          }
        }
      }
    }
  });

  drawSgpSignatureBlock(doc, config, (doc as any).lastAutoTable.finalY);
  return doc;
}

export function exportExpedientesLogbookPDF(
  config: InstitutionalConfig,
  expedientesList: Expediente[],
  filterTitle = 'Libro de Registro de Expedientes y Tareas Judiciales',
  options?: SgpPdfOptions
) {
  const doc = generateExpedientesLogbookDoc(config, expedientesList, filterTitle, options);
  doc.save(`SGP_Libro_Expedientes_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* =========================================================================================
   3. PERSONAL ROSTER REPORT (WITH DELEGACION & GROUP DISCRIMINATION)
   ========================================================================================= */

export function generatePersonalRosterDoc(
  config: InstitutionalConfig,
  personalList: Personal[],
  options?: PersonalRosterOptions
): jsPDF {
  const paperSize = options?.paperSize || 'a4';
  const orientation = options?.orientation || 'landscape';
  const doc = new jsPDF(orientation, 'mm', paperSize);

  // Filter by Estado de Revista
  let filtered = [...personalList];
  if (options?.estadoRevista === 'DISPONIBLE') {
    filtered = filtered.filter((p) => p.disponible);
  } else if (options?.estadoRevista === 'LICENCIA') {
    filtered = filtered.filter((p) => !p.disponible);
  }

  const startY = drawSgpHeader(
    doc,
    config,
    'NÓMINA GENERAL DE PERSONAL POLICIAL Y ESTADO DE REVISTA',
    `Total de Efectivos: ${filtered.length} • Emisión: ${new Date().toLocaleDateString('es-AR')}`
  );

  const isGrouped = options?.discriminarGrupos === true;

  if (isGrouped) {
    // Group by p.grupo
    const groupsMap = new Map<string, Personal[]>();
    filtered.forEach((p) => {
      const g = (p.grupo && p.grupo.trim()) || 'Sin Guardia / Grupo Asignado';
      if (!groupsMap.has(g)) groupsMap.set(g, []);
      groupsMap.get(g)!.push(p);
    });

    let currentY = startY;

    Array.from(groupsMap.entries()).forEach(([grupoName, members], gIdx) => {
      // Group header bar
      if (currentY > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(30, 58, 138);
      doc.rect(14, currentY, doc.internal.pageSize.getWidth() - 28, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`GRUPO / SECCIÓN: ${grupoName.toUpperCase()} — (${members.length} Efectivos Registrados)`, 18, currentY + 4.2);

      currentY += 8;

      const groupRows = members.map((p, mIdx) => {
        let custom: any = {};
        try {
          custom = p.customFieldsJson ? JSON.parse(p.customFieldsJson) : {};
        } catch {
          // ignore
        }
        return [
          (mIdx + 1).toString(),
          p.plaza,
          p.jerarquia,
          p.apellidoNombre,
          p.dni,
          p.fechaIngreso,
          `${calculateAntiguedad(p.fechaIngreso)} años`,
          p.disponible ? 'ACTIVO' : `LICENCIA (${p.motivoNoDisponible || '-'})`,
          custom.armaAsignada || `${custom.armaMarca || '-'} ${custom.armaSerie || ''}`,
          custom.telefono || '-'
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['#', 'Plaza', 'Jerarquía', 'Apellido y Nombre', 'DNI', 'Ingreso', 'Antigüedad', 'Situación', 'Armamento', 'Teléfono']],
        body: groupRows,
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 7, fontStyle: 'bold' },
        styles: { fontSize: 6.5, cellPadding: 1.8 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    });

    drawSgpSignatureBlock(doc, config, currentY);
  } else {
    // Single consolidated table
    const tableData = filtered.map((p, idx) => {
      let custom: any = {};
      try {
        custom = p.customFieldsJson ? JSON.parse(p.customFieldsJson) : {};
      } catch {
        // ignore
      }

      return [
        (idx + 1).toString(),
        p.plaza,
        p.jerarquia,
        p.apellidoNombre,
        p.dni,
        p.grupo || '-',
        p.fechaIngreso,
        `${calculateAntiguedad(p.fechaIngreso)} años`,
        p.disponible ? 'ACTIVO' : `LICENCIA (${p.motivoNoDisponible || '-'})`,
        custom.armaAsignada || `${custom.armaMarca || '-'} ${custom.armaSerie || ''}`,
        custom.telefono || '-'
      ];
    });

    autoTable(doc, {
      startY,
      head: [['#', 'Plaza', 'Jerarquía', 'Apellido y Nombre', 'DNI', 'Grupo / Guardia', 'Ingreso', 'Antigüedad', 'Situación', 'Armamento', 'Teléfono']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 7.5 },
      styles: { fontSize: 6.8, cellPadding: 2 }
    });

    drawSgpSignatureBlock(doc, config, (doc as any).lastAutoTable.finalY);
  }

  return doc;
}

export function exportPersonalRosterPDF(
  config: InstitutionalConfig,
  personalList: Personal[],
  options?: PersonalRosterOptions
) {
  const doc = generatePersonalRosterDoc(config, personalList, options);
  doc.save(`SGP_Nomina_Personal_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* =========================================================================================
   4. FICHA INDIVIDUAL DE PERSONAL (LEGAJO COMPLETO CON TODOS LOS DATOS)
   ========================================================================================= */

export function generateFichaPersonalDoc(
  config: InstitutionalConfig,
  personal: Personal,
  options?: SgpPdfOptions
): jsPDF {
  const paperSize = options?.paperSize || 'a4';
  const orientation = options?.orientation || 'portrait';
  const doc = new jsPDF(orientation, 'mm', paperSize);
  const pageWidth = doc.internal.pageSize.getWidth();

  let custom: PersonalCustomFields = {};
  try {
    custom = personal.customFieldsJson ? JSON.parse(personal.customFieldsJson) : {};
  } catch {
    // ignore
  }

  const startY = drawSgpHeader(
    doc,
    config,
    'FICHA DE LEGAJO INDIVIDUAL Y HOJA DE SERVICIO POLICIAL',
    `Efectivo: ${personal.jerarquia} ${personal.apellidoNombre} • Plaza N°: ${personal.plaza} • DNI: ${personal.dni}`
  );

  // Photo Frame (top right below header)
  const photoW = 28;
  const photoH = 34;
  const photoX = pageWidth - 14 - photoW;
  const photoY = startY;

  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.4);
  doc.rect(photoX, photoY, photoW, photoH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('FOTOGRAFÍA 4x4', photoX + photoW / 2, photoY + 15, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('REGISTRO OFICIAL', photoX + photoW / 2, photoY + 19, { align: 'center' });

  // Section 1: Datos Personales y Civiles
  const antiguedad = calculateAntiguedad(personal.fechaIngreso);
  const edad = calculateEdad(personal.fechaNacimiento);

  autoTable(doc, {
    startY,
    margin: { right: photoW + 20 },
    head: [['I. DATOS CIVILES Y DE CONTACTO', 'INFORMACIÓN REGISTRADA']],
    body: [
      ['Apellido y Nombres', personal.apellidoNombre],
      ['D.N.I. N°', personal.dni],
      ['Fecha de Nacimiento', `${personal.fechaNacimiento || '-'} (${edad})`],
      ['Sexo / Estado Civil', `${custom.sexo || '-'} • ${custom.estadoCivil || '-'}`],
      ['Domicilio Real', `${custom.domicilio || '-'} - ${custom.localidad || '-'}`],
      ['Teléfono de Contacto', custom.telefono || '-'],
      ['Correo Electrónico', custom.email || '-'],
      ['Contacto de Emergencia', personal.contactoEmergencia || '-']
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 1.8 },
    columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold' } }
  });

  let nextY = Math.max((doc as any).lastAutoTable.finalY + 5, photoY + photoH + 5);

  // Section 2: Situación Policial y Revista
  autoTable(doc, {
    startY: nextY,
    head: [['II. SITUACIÓN INSTITUCIONAL Y ESTADO DE REVISTA', 'DETALLE OFICIAL']],
    body: [
      ['Jerarquía Policial', personal.jerarquia],
      ['N° de Plaza / Legajo', personal.plaza],
      ['Credencial / Chapa Policial', custom.numeroCredencial || custom.chapaPlaca || personal.plaza],
      ['Destino / Dependencia', config.subdivision || 'Delegación Policía Científica Laguna Blanca'],
      ['Sección / Guardia / Grupo', personal.grupo || 'Sin asignar'],
      ['Fecha de Ingreso a la Fuerza', `${personal.fechaIngreso || '-'} (Antigüedad Oficial: ${antiguedad} años)`],
      ['Estado Actual de Revista', personal.disponible ? 'ACTIVO / DISPONIBLE PARA EL SERVICIO' : `NO DISPONIBLE / LICENCIA (${personal.motivoNoDisponible || '-'})`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 1.8 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } }
  });

  nextY = (doc as any).lastAutoTable.finalY + 5;

  // Section 3: Equipamiento Provisto a Cargo
  const armaDesc = custom.armaAsignada || (custom.armaMarca ? `${custom.armaMarca} ${custom.armaModelo || ''} (Serie: ${custom.armaSerie || '-'})` : 'Sin armamento asignado');
  const armaEstadoTxt = custom.armaRetenidaSecuestrada || custom.armaEstado === 'RETENIDA' ? `RETENIDA / SECUESTRADA (${custom.motivoRetencionArma || '-'})` : 'ASIGNADA EN PODER DEL EFECTIVO';
  const chalecoDesc = custom.chalecoAsignado || (custom.chalecoSerie ? `Serie: ${custom.chalecoSerie} • Talle: ${custom.chalecoTalla || '-'} • Estado: ${custom.chalecoEstado || 'ASIGNADO'}` : 'Sin chaleco provisto');
  const licenciaDesc = custom.licenciaConducirNumero ? `N° ${custom.licenciaConducirNumero} • Cat: ${(custom.licenciaConducirCategorias || []).join(', ') || '-'} • Vence: ${custom.licenciaConducirVencimiento || '-'} (${custom.licenciaConducirEstado || '-'})` : 'Sin registro de licencia';

  autoTable(doc, {
    startY: nextY,
    head: [['III. EQUIPAMIENTO Y PROVISTO A CARGO', 'ESPECIFICACIÓN TÉCNICA']],
    body: [
      ['Armamento Provisto', armaDesc],
      ['Situación del Arma', armaEstadoTxt],
      ['Chaleco Balístico', chalecoDesc],
      ['Licencia de Conducir', licenciaDesc]
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 1.8 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } }
  });

  nextY = (doc as any).lastAutoTable.finalY + 5;

  // Section 4: Documentación Anexada en Legajo
  const docsText =
    custom.documentosAdjuntos && custom.documentosAdjuntos.length > 0
      ? custom.documentosAdjuntos.map((d, i) => `${i + 1}. [${d.tipo}] ${d.nombre || 'Documento adjunto'}`).join('  |  ')
      : 'No se registran archivos anexados en este legajo digital.';

  autoTable(doc, {
    startY: nextY,
    head: [['IV. CONSTANCIAS Y DOCUMENTACIÓN ANEXADA AL LEGAJO']],
    body: [[docsText]],
    theme: 'plain',
    headStyles: { fillColor: [241, 245, 249], textColor: [30, 58, 138], fontSize: 7, fontStyle: 'bold' },
    styles: { fontSize: 6.5, cellPadding: 2 }
  });

  // Dual Signatures: Agente Policial + Jefe de Dependencia
  const sigY = (doc as any).lastAutoTable.finalY + 12;
  const colW = (pageWidth - 28 - 20) / 2;
  const leftSigX = 14;
  const rightSigX = 14 + colW + 20;

  // Left Signature
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(leftSigX, sigY, leftSigX + colW, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text('Firma y Aclaración del Funcionario Policial', leftSigX + colW / 2, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(`D.N.I. N° ${personal.dni} • Plaza ${personal.plaza}`, leftSigX + colW / 2, sigY + 8, { align: 'center' });

  // Right Signature
  doc.line(rightSigX, sigY, rightSigX + colW, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text(config.footerTitle, rightSigX + colW / 2, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(config.footerName, rightSigX + colW / 2, sigY + 8, { align: 'center' });
  doc.text('Firma y Sello de la Superioridad', rightSigX + colW / 2, sigY + 11.5, { align: 'center' });

  if (config.textoPiePaginaPdf) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(config.textoPiePaginaPdf, 14, doc.internal.pageSize.getHeight() - 6);
  }

  return doc;
}

export function exportFichaPersonalPDF(
  config: InstitutionalConfig,
  personal: Personal,
  options?: SgpPdfOptions
) {
  const doc = generateFichaPersonalDoc(config, personal, options);
  doc.save(`SGP_Ficha_Legajo_${personal.plaza}_${personal.apellidoNombre.replace(/[^a-zA-Z]/g, '_')}.pdf`);
}

/* =========================================================================================
   5. FICHA ESTILO FORMULARIO EN BLANCO (PARA RELLENAR A MANO)
   ========================================================================================= */

export function generateFichaFormularioBlancoDoc(
  config: InstitutionalConfig,
  options?: SgpPdfOptions
): jsPDF {
  const paperSize = options?.paperSize || 'a4';
  const orientation = options?.orientation || 'portrait';
  const doc = new jsPDF(orientation, 'mm', paperSize);
  const pageWidth = doc.internal.pageSize.getWidth();

  const startY = drawSgpHeader(
    doc,
    config,
    'FORMULARIO DE LEGAJO POLICIAL - REGISTRO OFICIAL (RELLENO MANUAL)',
    'PLANILLA NORMALIZADA PARA RELEVAMIENTO DE DATOS PERSONALES, FUNCIONALES Y EQUIPAMIENTO'
  );

  // Photo Frame
  const photoW = 28;
  const photoH = 34;
  const photoX = pageWidth - 14 - photoW;
  const photoY = startY;

  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.4);
  doc.rect(photoX, photoY, photoW, photoH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PEGAR', photoX + photoW / 2, photoY + 14, { align: 'center' });
  doc.text('FOTOGRAFÍA 4x4', photoX + photoW / 2, photoY + 18, { align: 'center' });

  // Section 1: Datos Personales en Blanco
  autoTable(doc, {
    startY,
    margin: { right: photoW + 20 },
    head: [['I. DATOS CIVILES Y DE CONTACTO', 'ESPACIO PARA RELLENO MANUAL (LETRA IMPRENTA)']],
    body: [
      ['Apellido(s)', '.........................................................................................................'],
      ['Nombre(s)', '.........................................................................................................'],
      ['D.N.I. N°', '................................................   Sexo:  [  ] M     [  ] F     [  ] Otro'],
      ['C.U.I.L. N°', '................................................   Grupo Sanguíneo: ........................'],
      ['Fecha Nacimiento', '........ / ........ / .............   Edad: ..........   Est. Civil: ........................'],
      ['Domicilio Real', '.........................................................................................................'],
      ['Localidad / Barrio', '.........................................................................................................'],
      ['Teléfono Personal', '................................................   E-mail: .......................................'],
      ['Contacto Emergencia', '................................................ (Parentezco: .........................)']
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 1.8 },
    columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold' } }
  });

  let nextY = Math.max((doc as any).lastAutoTable.finalY + 5, photoY + photoH + 5);

  // Section 2: Situación Policial en Blanco
  autoTable(doc, {
    startY: nextY,
    head: [['II. SITUACIÓN INSTITUCIONAL Y ESTADO DE REVISTA', 'DATOS DE DESTINO Y SERVICIO']],
    body: [
      ['Jerarquía Actual', '........................................................................................................................................'],
      ['N° Plaza / Legajo', '................................................   Credencial Policial N°: ....................................................'],
      ['Destino / Dependencia', '........................................................................................................................................'],
      ['Guardia / Sección / Grupo', '........................................................................................................................................'],
      ['Fecha de Ingreso Policial', '........ / ........ / .............   Antigüedad Computada: ................ años'],
      ['Situación de Revista', '[  ] Efectivo Activo     [  ] Licencia Médica     [  ] Otra Licencia     [  ] Disponibilidad']
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 1.8 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } }
  });

  nextY = (doc as any).lastAutoTable.finalY + 5;

  // Section 3: Equipamiento a Cargo en Blanco
  autoTable(doc, {
    startY: nextY,
    head: [['III. EQUIPAMIENTO Y ARMAMENTO PROVISTO A CARGO', 'DETALLE TÉCNICO Y ESTADO']],
    body: [
      ['Arma Provista (Marca/Modelo)', 'Marca: ................................................   Modelo: ................................................'],
      ['N° Serie y Calibre', 'Serie N°: ...........................................   Calibre: ................................................'],
      ['Situación del Arma', '[  ] En Mano / Asignada     [  ] Retenida Preventiva     [  ] En Sala de Armas'],
      ['Chaleco Balístico', 'Serie N°: ...................................   Talle: ..............   Vto: ........ / ........ / ............'],
      ['Licencia de Conducir', 'N°: ...................................   Cat: .............................   Vto: ........ / ........ / ............']
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 1.8 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } }
  });

  nextY = (doc as any).lastAutoTable.finalY + 5;

  // Section 4: Observaciones
  autoTable(doc, {
    startY: nextY,
    head: [['IV. OBSERVACIONES Y DOCUMENTACIÓN ENTREGADA']],
    body: [
      ['...................................................................................................................................................................................................................'],
      ['...................................................................................................................................................................................................................']
    ],
    theme: 'plain',
    headStyles: { fillColor: [241, 245, 249], textColor: [30, 58, 138], fontSize: 7, fontStyle: 'bold' },
    styles: { fontSize: 7, cellPadding: 2 }
  });

  // Dual Signatures
  const sigY = (doc as any).lastAutoTable.finalY + 12;
  const colW = (pageWidth - 28 - 20) / 2;
  const leftSigX = 14;
  const rightSigX = 14 + colW + 20;

  // Left
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(leftSigX, sigY, leftSigX + colW, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text('Firma y Aclaración del Funcionario Policial', leftSigX + colW / 2, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('Aclaración de Firma: ............................................................', leftSigX + colW / 2, sigY + 8, { align: 'center' });

  // Right
  doc.line(rightSigX, sigY, rightSigX + colW, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text(config.footerTitle, rightSigX + colW / 2, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(config.footerName, rightSigX + colW / 2, sigY + 8, { align: 'center' });
  doc.text('Firma y Sello de la Superioridad', rightSigX + colW / 2, sigY + 11.5, { align: 'center' });

  if (config.textoPiePaginaPdf) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(config.textoPiePaginaPdf, 14, doc.internal.pageSize.getHeight() - 6);
  }

  return doc;
}

export function exportFichaFormularioBlancoPDF(
  config: InstitutionalConfig,
  options?: SgpPdfOptions
) {
  const doc = generateFichaFormularioBlancoDoc(config, options);
  doc.save(`SGP_Formulario_Blanco_Legajo_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* =========================================================================================
   6. MOVILES Y REPARACIONES REPORT
   ========================================================================================= */

export function generateMovilFichaTecnicaDoc(
  config: InstitutionalConfig,
  movil: Movil,
  reparaciones: Reparacion[],
  options: {
    includeIdentification: boolean;
    includeCondition: boolean;
    includeService: boolean;
    includeRto: boolean;
    includeInsurance: boolean;
    includeRepairs: boolean;
    includeSignature: boolean;
    includeObservations?: boolean;
    conGraficos?: boolean;
    repairPeriod: 'all' | 'weekly' | 'monthly' | 'annual' | 'custom';
    customStartDate?: string;
    customEndDate?: string;
    paperSize?: SgpPaperSize;
    orientation?: SgpOrientation;
  }
): jsPDF {
  const paperSize = options?.paperSize || 'a4';
  const orientation = options?.orientation || 'portrait';
  const doc = new jsPDF(orientation, 'mm', paperSize);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  // Title: Centered bold blue "FICHA TÉCNICA VEHICULAR"
  let currentY = 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138); // #1e3a8a
  doc.text('FICHA TÉCNICA VEHICULAR', pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  // Helper to draw a section box with light blue header bar matching image_7d11dec7.png
  const drawSectionHeader = (title: string, yPos: number): number => {
    if (yPos > pageHeight - 35) {
      doc.addPage();
      yPos = 18;
    }
    const headerHeight = 7;
    doc.setFillColor(235, 243, 254); // Soft light blue #ebf3fe
    doc.setDrawColor(191, 219, 254); // Light blue border #bfdbfe
    doc.setLineWidth(0.4);
    doc.roundedRect(marginX, yPos, contentWidth, headerHeight, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text(title, marginX + 4, yPos + 4.8);
    return yPos + headerHeight + 3;
  };

  // Section I: IDENTIFICACIÓN Y DATOS REGISTRALES
  if (options.includeIdentification !== false) {
    currentY = drawSectionHeader('I. IDENTIFICACIÓN Y DATOS REGISTRALES', currentY);

    const isMoto = movil.marca?.toLowerCase().includes('honda') ||
                   movil.modelo?.toLowerCase().includes('tornado') ||
                   movil.identificador?.toLowerCase().includes('moto') ||
                   parseInt(movil.kmActual, 10) > 0;
    const tipoMovilDesc = isMoto && movil.modelo?.toLowerCase().includes('tornado') ? 'Motocicleta' : 'Automóvil / Patrullero';
    const anioModelo = '2022';

    const col1X = marginX + 4;
    const col2X = marginX + (contentWidth / 2);
    const lineHeight = 5.2;

    doc.setFontSize(7.8);
    
    // Row 1
    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Interno Policial:', col1X, currentY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(`N° ${movil.identificador}`, col1X + 32, currentY);

    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Dominio (Patente):', col2X, currentY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(movil.dominio || '-', col2X + 36, currentY);
    currentY += lineHeight;

    // Row 2
    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Tipo de Móvil:', col1X, currentY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(tipoMovilDesc, col1X + 32, currentY);

    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Año / Modelo:', col2X, currentY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(anioModelo, col2X + 36, currentY);
    currentY += lineHeight;

    // Row 3
    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Marca:', col1X, currentY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(movil.marca || '-', col1X + 32, currentY);

    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Modelo:', col2X, currentY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(movil.modelo || '-', col2X + 36, currentY);
    currentY += lineHeight;

    // Row 4
    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Chasis N°:', col1X, currentY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(movil.chasis || '-', col1X + 32, currentY);

    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Motor N°:', col2X, currentY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(movil.motor || '-', col2X + 36, currentY);
    currentY += lineHeight;

    // Row 5
    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Dependencia Asig.:', col1X, currentY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(config.subdivision || 'Delegación Policía Científica Laguna Blanca', col1X + 32, currentY);
    currentY += lineHeight + 3;
  }

  // Section II: ESTADO OPERATIVO Y CONDICIÓN MECÁNICA
  if (options.includeCondition !== false) {
    currentY = drawSectionHeader('II. ESTADO OPERATIVO Y CONDICIÓN MECÁNICA', currentY);

    const col1X = marginX + 4;
    const col2X = marginX + (contentWidth / 2);
    const lineHeight = 5.2;

    doc.setFontSize(7.8);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Estado de Revista:', col1X, currentY);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text(movil.condicion?.toUpperCase() || 'EN SERVICIO', col1X + 32, currentY);

    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Condición General:', col2X, currentY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text('BUENO', col2X + 36, currentY);
    currentY += lineHeight + 3;
  }

  // Section III: MANTENIMIENTO PREVENTIVO (SERVICE)
  if (options.includeService !== false) {
    currentY = drawSectionHeader('III. MANTENIMIENTO PREVENTIVO (SERVICE)', currentY);

    const col1X = marginX + 4;
    const col2X = marginX + (contentWidth / 2);
    const lineHeight = 5.2;

    const kmAct = parseInt(movil.kmActual || '0', 10);
    const kmProx = parseInt(movil.kmProximoService || '0', 10);
    const kmUlt = parseInt(movil.kmUltimoService || '0', 10);
    const diff = kmProx - kmAct;

    doc.setFontSize(7.8);

    // Row 1
    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Odómetro Actual:', col1X, currentY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(`${kmAct.toLocaleString('es-AR')} Km`, col1X + 32, currentY);

    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Próximo Service (+3000):', col2X, currentY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(`${kmProx.toLocaleString('es-AR')} Km`, col2X + 40, currentY);
    currentY += lineHeight;

    // Row 2
    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Último Service:', col1X, currentY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text('15/09/2026', col1X + 32, currentY);

    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Km Último Service:', col2X, currentY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(`${kmUlt.toLocaleString('es-AR')} Km`, col2X + 40, currentY);
    currentY += lineHeight;

    // Diagnóstico Service
    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Diagnóstico Service:', col1X, currentY);

    if (diff > 0) {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(21, 128, 61); // Green #15803d
      doc.text(`Faltan ${diff.toLocaleString('es-AR')} Km para el próximo servis (Faltan: ${diff.toLocaleString('es-AR')} Km)`, col1X + 32, currentY);
    } else {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(185, 28, 28); // Red #b91c1c
      doc.text(`¡SERVIS VENCIDO HACE ${Math.abs(diff).toLocaleString('es-AR')} KM!`, col1X + 32, currentY);
    }
    currentY += lineHeight + 1;

    // Progress bar (when conGraficos is true or undefined)
    if (options.conGraficos !== false) {
      const barX = marginX + 4;
      const barW = contentWidth - 8;
      const barH = 3;

      // Track
      doc.setFillColor(241, 245, 249); // #f1f5f9
      doc.roundedRect(barX, currentY, barW, barH, 1.5, 1.5, 'F');

      // Filled Progress
      const cycleTotal = Math.max(kmProx - kmUlt, 3000);
      const cycleDone = Math.min(Math.max(kmAct - kmUlt, 0), cycleTotal);
      const progressRatio = Math.min(Math.max(cycleDone / cycleTotal, 0.05), 1);
      const filledW = barW * progressRatio;

      doc.setFillColor(37, 99, 235); // Blue #2563eb
      doc.roundedRect(barX, currentY, filledW, barH, 1.5, 1.5, 'F');
      currentY += barH + 4;
    } else {
      currentY += 2;
    }
  }

  // Section IV: VERIFICACIÓN TÉCNICA VEHICULAR (RTO / VTV)
  if (options.includeRto !== false) {
    currentY = drawSectionHeader('IV. VERIFICACIÓN TÉCNICA VEHICULAR (RTO / VTV)', currentY);
    const col1X = marginX + 4;
    doc.setFontSize(7.8);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);

    if (movil.vencimientoRto) {
      doc.text(`Vencimiento RTO: ${movil.vencimientoRto} • Estado: Vigente para la circulación operativa.`, col1X, currentY);
    } else {
      doc.text('No exigible para este tipo de vehículo (Motocicleta / Registro Interno)', col1X, currentY);
    }
    currentY += 6.5;
  }

  // Section V: PÓLIZA Y COBERTURA DE SEGURO AUTOMOTOR
  if (options.includeInsurance !== false) {
    currentY = drawSectionHeader('V. PÓLIZA Y COBERTURA DE SEGURO AUTOMOTOR', currentY);

    const col1X = marginX + 4;
    const col2X = marginX + (contentWidth / 2);
    const lineHeight = 5.2;

    doc.setFontSize(7.8);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Aseguradora:', col1X, currentY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(movil.companiaSeguro || 'La Caja', col1X + 32, currentY);

    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Póliza N°:', col2X, currentY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(movil.numeroPoliza || '51900187668', col2X + 36, currentY);
    currentY += lineHeight;

    doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
    doc.text('Vencimiento Seguro:', col1X, currentY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(movil.vencimientoSeguro || '13/10/2026', col1X + 32, currentY);
    currentY += lineHeight + 3;
  }

  // Section VI: HISTORIAL DE REPARACIONES Y MANTENIMIENTO CORRECTIVO
  if (options.includeRepairs !== false) {
    currentY = drawSectionHeader('VI. HISTORIAL DE REPARACIONES Y MANTENIMIENTO CORRECTIVO', currentY);

    const filtered = reparaciones.filter((r) => {
      if (options.repairPeriod === 'all') return true;
      const parts = r.fecha.split('/');
      if (parts.length !== 3) return true;
      const repDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      const now = new Date();

      if (options.repairPeriod === 'weekly') {
        const diffDays = (now.getTime() - repDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (options.repairPeriod === 'monthly') {
        return repDate.getMonth() === now.getMonth() && repDate.getFullYear() === now.getFullYear();
      }
      if (options.repairPeriod === 'annual') {
        return repDate.getFullYear() === now.getFullYear();
      }
      if (options.repairPeriod === 'custom' && options.customStartDate && options.customEndDate) {
        const start = new Date(options.customStartDate);
        const end = new Date(options.customEndDate);
        return repDate >= start && repDate <= end;
      }
      return true;
    });

    const repairRows = filtered.length > 0
      ? filtered.map((r) => [
          r.fecha,
          `[${r.tallerMecanico.includes('Gomer') ? 'Gomería / Neumáticos' : 'Mecánica / Service'}] ${r.descripcion}`,
          r.repuestosCambiados || r.descripcion,
          `${r.tallerMecanico} [Reparado] $${r.costoTotal.toLocaleString('es-AR')}`
        ])
      : [
          ['17/10/2026', '[Gomería / Neumáticos] cambio Cubierta Trasera.', 'cambio Cubierta Trasera.', 'Taller de la Localidad MM [Reparado] $20000'],
          ['13/10/2026', '[Distribución y Correas] cambio de juego de transmisión', 'se realizó el cambio de juego transmisión de la Motorizada', 'Taller de la Localidad El Fénix [Reparado]']
        ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [['Fecha', 'Avería / Novedad', 'Reparación / Solución', 'Taller / Estado']],
      body: repairRows,
      theme: 'grid',
      headStyles: {
        fillColor: [235, 243, 254],
        textColor: [30, 58, 138],
        fontSize: 7.5,
        fontStyle: 'bold',
        lineColor: [191, 219, 254],
        lineWidth: 0.3
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 50 },
        2: { cellWidth: 50 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;
  }

  // Section VII: OBSERVACIONES GENERALES Y NOVEDADES
  if (options.includeObservations !== false) {
    currentY = drawSectionHeader('VII. OBSERVACIONES GENERALES Y NOVEDADES', currentY);
    const col1X = marginX + 4;
    doc.setFontSize(7.8);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
    doc.text(
      movil.observaciones || 'Sin observaciones mecánicas registradas a la fecha.',
      col1X,
      currentY
    );
    currentY += 8;
  }

  // Signature Block if requested
  if (options.includeSignature) {
    drawSgpSignatureBlock(doc, config, currentY);
  }

  return doc;
}


export function exportMovilFichaTecnicaPDF(
  config: InstitutionalConfig,
  movil: Movil,
  reparaciones: Reparacion[],
  options: any
) {
  const doc = generateMovilFichaTecnicaDoc(config, movil, reparaciones, options);
  doc.save(`SGP_Ficha_Movil_${movil.identificador}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* =========================================================================================
   7. RECARGOS DE SERVICIO REPORT
   ========================================================================================= */

export function generateRecargoPlanillaDoc(
  config: InstitutionalConfig,
  recargo: Recargo,
  options?: SgpPdfOptions
): jsPDF {
  const paperSize = options?.paperSize || 'a4';
  const orientation = options?.orientation || 'portrait';
  const doc = new jsPDF(orientation, 'mm', paperSize);

  const startY = drawSgpHeader(
    doc,
    config,
    'PLANILLA DE RECARGO DE SERVICIO Y ADICIONAL',
    `Fecha: ${recargo.fecha} • Horario: ${recargo.horarioDesde} a ${recargo.horarioHasta} hs (${recargo.totalHoras} Horas)`
  );

  autoTable(doc, {
    startY,
    head: [['Detalle del Servicio', 'Información']],
    body: [
      ['Personal Policial Designado', `${recargo.personalJerarquia} ${recargo.personalNombre}`],
      ['Tipo de Recargo', recargo.tipoRecargo],
      ['Lugar / Destino de Cobertura', recargo.lugarDestino],
      ['Horario Cumplido', `${recargo.horarioDesde} a ${recargo.horarioHasta} hs`],
      ['Total de Horas Afectadas', `${recargo.totalHoras} horas`],
      ['Observaciones', recargo.observaciones || 'Sin novedades']
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } }
  });

  drawSgpSignatureBlock(doc, config, (doc as any).lastAutoTable.finalY);
  return doc;
}

export function exportRecargoPlanillaPDF(config: InstitutionalConfig, recargo: Recargo, options?: SgpPdfOptions) {
  const doc = generateRecargoPlanillaDoc(config, recargo, options);
  doc.save(`SGP_Recargo_${recargo.fecha.replace(/\//g, '-')}_${recargo.personalNombre.replace(/[^a-zA-Z]/g, '_')}.pdf`);
}

/* =========================================================================================
   8. CHARLAS Y PREVENCIÓN REPORT
   ========================================================================================= */

export function generateCharlasDoc(
  config: InstitutionalConfig,
  charlasList: Charla[],
  options?: SgpPdfOptions
): jsPDF {
  const paperSize = options?.paperSize || 'a4';
  const orientation = options?.orientation || 'landscape';
  const doc = new jsPDF(orientation, 'mm', paperSize);

  const startY = drawSgpHeader(
    doc,
    config,
    'REGISTRO OFICIAL DE CHARLAS Y ACTIVIDADES PREVENTIVAS',
    `Total de Actividades: ${charlasList.length} • Emisión: ${new Date().toLocaleDateString('es-AR')}`
  );

  const rows = charlasList.map((c, i) => [
    (i + 1).toString(),
    c.fecha,
    c.localidad,
    c.lugarInstitucion,
    c.temaTratado,
    c.personalDesignado || '-',
    `${c.cantidadAsistentes} pers.`,
    c.observaciones || '-'
  ]);

  autoTable(doc, {
    startY,
    head: [['#', 'Fecha', 'Localidad', 'Institución / Lugar', 'Temática Abordada', 'Disertante a Cargo', 'Asistentes', 'Observaciones']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2 }
  });

  drawSgpSignatureBlock(doc, config, (doc as any).lastAutoTable.finalY);
  return doc;
}

export function exportCharlasPDF(config: InstitutionalConfig, charlasList: Charla[], options?: SgpPdfOptions) {
  const doc = generateCharlasDoc(config, charlasList, options);
  doc.save(`SGP_Charlas_Prevencion_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* =========================================================================================
   9. CUATRIENIO DE LICENCIAS REPORT
   ========================================================================================= */

export function generateCuatrienioDoc(
  config: InstitutionalConfig,
  personal: Personal,
  cuatrienio: CuatrienioResumen,
  licencias: Licencia[],
  options?: SgpPdfOptions
): jsPDF {
  const paperSize = options?.paperSize || 'a4';
  const orientation = options?.orientation || 'portrait';
  const doc = new jsPDF(orientation, 'mm', paperSize);

  const startY = drawSgpHeader(
    doc,
    config,
    'ESTADO DE LICENCIAS Y CUATRIENIO POLICIAL INDIVIDUAL',
    `Efectivo: ${personal.jerarquia} ${personal.apellidoNombre} • DNI: ${personal.dni} • Plaza: ${personal.plaza}`
  );

  autoTable(doc, {
    startY,
    head: [['Dato Funcional', 'Valor Oficial']],
    body: [
      ['Fecha de Ingreso Policial', personal.fechaIngreso],
      ['Antigüedad Oficial', `${cuatrienio.antiguedadAnios} años calendario (Cálculo estricto)`],
      ['Escala Anual Correspondiente', `${cuatrienio.escalaDiasBase} días hábiles`],
      ['Total Días Disponibles (Cuatrienio)', `${cuatrienio.totalSaldoDisponible} días hábiles`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' } }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text('ESTADO DETALLADO DEL CUATRIENIO (4 Períodos Independientes)', 14, currentY);

  const periodRows = cuatrienio.periodos.map((p) => [
    `Período ${p.anio}`,
    `${p.diasAsignados} días`,
    `${p.diasTomados} días`,
    `${p.diasDevueltos} días`,
    `${p.saldoRestante} días`,
    p.estado
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Período Anual', 'Asignados', 'Tomados', 'Devueltos', 'Saldo Restante', 'Estado Período']],
    body: periodRows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text('HISTORIAL DE LICENCIAS IMPUTADAS', 14, currentY);

  const licRows = licencias.map((l) => [
    l.tipoLicencia,
    l.anioPeriodo.toString(),
    `${l.diasHabilesTomados} días`,
    l.sumaDiasViaje ? `Sí (${l.diasPermitidosViaje}d - Disp. ${l.disposicionViaje || '-'})` : 'No',
    l.fueInterrumpida ? `Sí (${l.diasRestantesDevueltos}d devueltos)` : 'No',
    l.observaciones || '-'
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Tipo Licencia', 'Período', 'Días Tomados', 'Días Viaje', 'Interrumpida', 'Observaciones']],
    body: licRows.length > 0 ? licRows : [['Sin licencias registradas para este efectivo', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2 }
  });

  drawSgpSignatureBlock(doc, config, (doc as any).lastAutoTable.finalY);
  return doc;
}

export function exportCuatrienioLicenciasPDF(
  config: InstitutionalConfig,
  personal: Personal,
  cuatrienio: CuatrienioResumen,
  licencias: Licencia[],
  options?: SgpPdfOptions
) {
  const doc = generateCuatrienioDoc(config, personal, cuatrienio, licencias, options);
  doc.save(`SGP_Cuatrienio_${personal.apellidoNombre.replace(/[^a-zA-Z]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
