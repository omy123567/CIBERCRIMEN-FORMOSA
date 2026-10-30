import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  LetterheadConfig,
  Personnel,
  CaseFile,
  Vehicle,
  MechanicalRepair,
  OvertimeDuty,
  TrainingLecture
} from '../types/police';
import { formatDate, formatCurrency, formatDNI } from './formatters';

// Default badge emblem
import defaultBadgeUrl from '../assets/images/police_badge_emblem_1792504361058.jpg';

// Helper to draw official institutional police letterhead on any document page
export function drawPoliceLetterhead(
  doc: jsPDF,
  letterhead: LetterheadConfig,
  documentTitle: string,
  docSubtitle?: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Try drawing badge
  try {
    const badgeSrc = letterhead.logoDataUrl || defaultBadgeUrl;
    doc.addImage(badgeSrc, 'JPEG', 14, 10, 22, 22);
  } catch (e) {
    // If image fails, fallback to clean text shield
    doc.setDrawColor(15, 23, 42);
    doc.rect(14, 10, 22, 22);
    doc.setFontSize(8);
    doc.text('ESCUDO', 18, 22);
  }

  // Header Texts
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(11, 25, 44); // Deep police navy
  doc.text(letterhead.unitName.toUpperCase(), 40, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(letterhead.institutionalSubtitle.toUpperCase(), 40, 21);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${letterhead.jurisdiction} • ${letterhead.stationAddress} • ${letterhead.stationPhone}`, 40, 26);

  // Hairline border divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 34, pageWidth - 14, 34);

  // Document Title Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(documentTitle, 14, 43);

  if (docSubtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(docSubtitle, 14, 48);
    return 54;
  }

  return 49;
}

// Helper to draw officer signature & stamp block
export function drawOfficerSignatureBlock(doc: jsPDF, letterhead: LetterheadConfig, startY?: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const y = startY && startY < pageHeight - 45 ? startY + 20 : pageHeight - 35;

  const boxWidth = 70;
  const rightX = pageWidth - 14 - boxWidth;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(rightX, y, rightX + boxWidth, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(letterhead.footerOfficerTitle, rightX + boxWidth / 2, y + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(letterhead.footerOfficerName, rightX + boxWidth / 2, y + 9, { align: 'center' });
  doc.text('Firma y Sello Aclaratorio', rightX + boxWidth / 2, y + 13, { align: 'center' });
}

// 1. Export Executive Management Report
export function exportManagementReportPDF(
  letterhead: LetterheadConfig,
  periodLabel: string,
  kpis: {
    totalPersonnel: number;
    activePersonnel: number;
    onLeavePersonnel: number;
    totalCases: number;
    resguardoPeopleCount: number;
    faltaOficioCount: number;
    ppiCount: number;
    fleetTotal: number;
    fleetOperational: number;
    fleetInRepair: number;
    rtoExpiringSoon: number;
    insuranceExpiringSoon: number;
  },
  taskDistribution: { task: string; count: number }[],
  courtDistribution: { court: string; count: number }[]
) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const startY = drawPoliceLetterhead(
    doc,
    letterhead,
    'INFORME EJECUTIVO DE GESTIÓN POLICIAL Y OPERATIVA',
    `Período analizado: ${periodLabel} • Emisión: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
  );

  // Summary Metrics Table
  autoTable(doc, {
    startY,
    head: [['Indicador Operativo / Administrativo', 'Cantidad / Valor', 'Estado / Observación']],
    body: [
      ['Fuerza Efectiva Total', `${kpis.totalPersonnel} efectivos`, `${kpis.activePersonnel} activos / ${kpis.onLeavePersonnel} con licencia`],
      ['Expedientes Judiciales Tramitados', `${kpis.totalCases} causas`, `Casos registrados en el período`],
      ['Personas en Resguardo de Evidencia', `${kpis.resguardoPeopleCount} personas`, `Suma por personas individuales según regla estadística`],
      ['Casos Preliminares "Falta de Oficio"', `${kpis.faltaOficioCount} requerimientos`, `Intervenciones preliminares sin oficio formal`],
      ['Causas con Personal Policial Involucrado (PPI)', `${kpis.ppiCount} causas`, `Sujetas a seguimiento sumarial / preventivo`],
      ['Parque Automotor', `${kpis.fleetTotal} móviles`, `${kpis.fleetOperational} operativos / ${kpis.fleetInRepair} en taller`],
      ['Vencimientos Documentación Vehicular', `${kpis.rtoExpiringSoon + kpis.insuranceExpiringSoon} alertas`, `${kpis.rtoExpiringSoon} RTO / ${kpis.insuranceExpiringSoon} Pólizas de Seguro`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 3 }
  });

  // Tareas Operativas Table
  let currentY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('DISTRIBUCIÓN POR TAREA OPERATIVA (Cómputo Personas en Resguardos)', 14, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Tarea Operativa', 'Total Impactos / Personas']],
    body: taskDistribution.map((t) => [t.task, t.count.toString()]),
    theme: 'striped',
    headStyles: { fillColor: [30, 62, 98], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.5 }
  });

  // Judicial Agencies Table
  currentY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('DISTRIBUCIÓN POR JUZGADO / FISCALÍA INTERVINIENTE', 14, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Órgano Judicial Solicitante', 'Expedientes / Causas']],
    body: courtDistribution.map((c) => [c.court, c.count.toString()]),
    theme: 'striped',
    headStyles: { fillColor: [30, 62, 98], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.5 }
  });

  drawOfficerSignatureBlock(doc, letterhead, (doc as any).lastAutoTable.finalY);
  doc.save(`Informe_Gestion_Policial_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// 2. Export Personnel Roster PDF
export function exportPersonnelRosterPDF(letterhead: LetterheadConfig, personnelList: Personnel[]) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const startY = drawPoliceLetterhead(
    doc,
    letterhead,
    'NÓMINA GENERAL DE PERSONAL POLICIAL Y ESTADO DE REVISTA',
    `Total de Efectivos: ${personnelList.length} • Fecha de Generación: ${new Date().toLocaleDateString('es-AR')}`
  );

  const tableData = personnelList.map((p, idx) => {
    let leaveInfo = 'En Servicio';
    if (p.status === 'Licencia' && p.leaves && p.leaves.length > 0) {
      const activeLeave = p.leaves[0];
      leaveInfo = `Lic. ${activeLeave.type} (Hasta ${formatDate(activeLeave.endDate)})`;
    }

    return [
      (idx + 1).toString(),
      p.rank,
      `${p.lastName}, ${p.firstName}`,
      formatDNI(p.dni),
      p.groupSection,
      p.status,
      leaveInfo,
      p.phone,
      p.emergencyContact
    ];
  });

  autoTable(doc, {
    startY,
    head: [['#', 'Jerarquía', 'Apellido y Nombre', 'DNI', 'Sección / Grupo', 'Estado', 'Situación / Licencia', 'Teléfono', 'Contacto Emergencia']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 26 },
      2: { cellWidth: 38 },
      3: { cellWidth: 20 },
      4: { cellWidth: 30 },
      5: { cellWidth: 18 },
      6: { cellWidth: 42 },
      7: { cellWidth: 26 }
    }
  });

  drawOfficerSignatureBlock(doc, letterhead, (doc as any).lastAutoTable.finalY);
  doc.save(`Nomina_Personal_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// 3. Export Individual Personnel File PDF
export function exportPersonnelFilePDF(letterhead: LetterheadConfig, person: Personnel) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const startY = drawPoliceLetterhead(
    doc,
    letterhead,
    'FICHA INDIVIDUAL DE LEGAJO PERSONAL',
    `Efectivo: ${person.rank} ${person.lastName}, ${person.firstName} • Legajo: ${person.licenseNumber || '-'}`
  );

  autoTable(doc, {
    startY,
    head: [['Dato', 'Información Registrada']],
    body: [
      ['Jerarquía Policial', person.rank],
      ['Apellido y Nombre', `${person.lastName}, ${person.firstName}`],
      ['D.N.I.', formatDNI(person.dni)],
      ['Número de Legajo / Chapa', person.licenseNumber || 'Sin Asignar'],
      ['Sección / Grupo Operativo', person.groupSection],
      ['Estado de Revista Actual', person.status],
      ['Domicilio', person.address || 'No registrado'],
      ['Localidad', person.locality || 'No registrada'],
      ['Teléfono de Contacto', person.phone],
      ['Contacto de Emergencia', person.emergencyContact],
      ['Observaciones Administrativas', person.observations || 'Sin observaciones registradas']
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 8;

  // Leaves history table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('HISTORIAL DE LICENCIAS MÉDICAS Y REGLAMENTARIAS', 14, currentY);

  const leavesData = (person.leaves || []).map((l) => [
    l.type,
    formatDate(l.startDate),
    formatDate(l.endDate),
    l.diagnosis || '-',
    l.certificateNumber || '-'
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Tipo de Licencia', 'Desde', 'Hasta', 'Diagnóstico / Causa', 'N° Certificado']],
    body: leavesData.length > 0 ? leavesData : [['Sin licencias registradas', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [30, 62, 98], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.5 }
  });

  drawOfficerSignatureBlock(doc, letterhead, (doc as any).lastAutoTable.finalY);
  doc.save(`Ficha_Personal_${person.lastName}_${person.dni}.pdf`);
}

// 4. Export Judicial Cases Logbook PDF
export function exportCasesLogbookPDF(
  letterhead: LetterheadConfig,
  casesList: CaseFile[],
  filterSubtitle = 'Libro Oficial de Registro de Actuaciones Judiciales'
) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const startY = drawPoliceLetterhead(
    doc,
    letterhead,
    'LIBRO DE REGISTRO DE EXPEDIENTES JUDICIALES Y TAREAS OPERATIVAS',
    `${filterSubtitle} • Registros totales: ${casesList.length}`
  );

  const tableData = casesList.map((c) => {
    let personsDetail = '-';
    if (c.evidencePersons && c.evidencePersons.length > 0) {
      personsDetail = c.evidencePersons.map((p) => `${p.fullName} (DNI ${p.dni})`).join(', ');
    }

    const ppiText = c.ppi?.isInvolved
      ? `SÍ: ${c.ppi.rank || ''} ${c.ppi.fullName || ''}`
      : 'NO';

    return [
      c.caseNumber,
      c.officialLetterNumber,
      formatDate(c.registrationDate),
      c.courtJurisdiction,
      c.letterType,
      c.requirementType,
      c.originCaratula,
      personsDetail,
      c.elevation?.isDelivered ? `Entregado (${formatDate(c.elevation.deliveryDate)})` : 'Pendiente',
      ppiText
    ];
  });

  autoTable(doc, {
    startY,
    head: [
      [
        'N° Exp.',
        'N° Oficio',
        'Fecha',
        'Juzgado / Fiscalía',
        'Tipo Oficio',
        'Requerimiento',
        'Carátula / Origen',
        'Personas en Resguardo',
        'Elevación',
        'PPI'
      ]
    ],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7 },
    styles: { fontSize: 6.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 20 },
      2: { cellWidth: 16 },
      3: { cellWidth: 32 },
      4: { cellWidth: 26 },
      5: { cellWidth: 28 },
      6: { cellWidth: 45 },
      7: { cellWidth: 40 },
      8: { cellWidth: 20 },
      9: { cellWidth: 18 }
    }
  });

  drawOfficerSignatureBlock(doc, letterhead, (doc as any).lastAutoTable.finalY);
  doc.save(`Libro_Expedientes_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// 5. Vehicle Technical Sheet with Configurable Sections & Repair Date Filters
export interface VehiclePdfOptions {
  includeIdentification: boolean;
  includeCondition: boolean;
  includeService: boolean;
  includeRto: boolean;
  includeInsurance: boolean;
  includeRepairs: boolean;
  includeSignature: boolean;
  repairPeriod: 'all' | 'weekly' | 'monthly' | 'annual' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
}

export function exportVehicleTechnicalSheetPDF(
  letterhead: LetterheadConfig,
  vehicle: Vehicle,
  repairs: MechanicalRepair[],
  options: VehiclePdfOptions
) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const startY = drawPoliceLetterhead(
    doc,
    letterhead,
    `FICHA TÉCNICA VEHICULAR - MÓVIL ${vehicle.internalNumber}`,
    `Dominio: ${vehicle.plate} • ${vehicle.brand} ${vehicle.model} • Dependencia: ${vehicle.assignedDepartment}`
  );

  const vehicleRows: string[][] = [];

  if (options.includeIdentification) {
    vehicleRows.push(
      ['N° Interno / Móvil', vehicle.internalNumber],
      ['Tipo de Vehículo', vehicle.type],
      ['Marca y Modelo', `${vehicle.brand} ${vehicle.model}`],
      ['Dominio / Patente', vehicle.plate],
      ['Dependencia Asignada', vehicle.assignedDepartment],
      ['Odómetro Actual', `${vehicle.currentMileage.toLocaleString('es-AR')} Km`]
    );
  }

  if (options.includeCondition) {
    vehicleRows.push(
      ['Estado Operativo', vehicle.operationalStatus],
      ['Condición General', vehicle.condition]
    );
  }

  if (options.includeService) {
    vehicleRows.push(
      ['Último Service Realizado', `${vehicle.lastServiceMileage?.toLocaleString('es-AR') || '-'} Km (${formatDate(vehicle.lastServiceDate)})`],
      ['Próximo Service Programado', `${vehicle.nextServiceMileage.toLocaleString('es-AR')} Km`]
    );
  }

  if (options.includeRto) {
    vehicleRows.push(['Vencimiento RTO Obligatoria', formatDate(vehicle.rtoExpiryDate)]);
  }

  if (options.includeInsurance) {
    vehicleRows.push(
      ['Compañía Aseguradora', vehicle.insuranceCompany],
      ['N° Póliza de Seguro', vehicle.insurancePolicyNumber],
      ['Vencimiento de Seguro', formatDate(vehicle.insuranceExpiryDate)]
    );
  }

  if (vehicleRows.length > 0) {
    autoTable(doc, {
      startY,
      head: [['Concepto Técnico', 'Detalle Registrado']],
      body: vehicleRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' } }
    });
  }

  // Filter repairs according to the specified option rule
  if (options.includeRepairs) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const filteredRepairs = repairs.filter((r) => {
      const repDate = new Date(r.date);
      if (options.repairPeriod === 'all') return true;

      if (options.repairPeriod === 'weekly') {
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        lastWeek.setHours(0, 0, 0, 0);
        return repDate >= lastWeek && repDate <= today;
      }

      if (options.repairPeriod === 'monthly') {
        return repDate.getMonth() === today.getMonth() && repDate.getFullYear() === today.getFullYear();
      }

      if (options.repairPeriod === 'annual') {
        return repDate.getFullYear() === today.getFullYear();
      }

      if (options.repairPeriod === 'custom' && options.customStartDate && options.customEndDate) {
        const start = new Date(options.customStartDate);
        const end = new Date(options.customEndDate);
        end.setHours(23, 59, 59, 999);
        return repDate >= start && repDate <= end;
      }

      return true;
    });

    const currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : startY + 5;

    let periodLabel = 'Historial Completo';
    if (options.repairPeriod === 'weekly') periodLabel = 'Última Semana';
    if (options.repairPeriod === 'monthly') periodLabel = 'Mes en Curso';
    if (options.repairPeriod === 'annual') periodLabel = 'Año Corriente';
    if (options.repairPeriod === 'custom') {
      periodLabel = `Rango Específico (${formatDate(options.customStartDate)} a ${formatDate(options.customEndDate)})`;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`HISTORIAL DE INTERVENCIONES Y REPARACIONES MECÁNICAS (${periodLabel})`, 14, currentY);

    const repairsData = filteredRepairs.map((r) => [
      formatDate(r.date),
      `${r.mileage.toLocaleString('es-AR')} Km`,
      r.interventionType,
      r.workshopProvider,
      r.description,
      r.partsReplaced || '-',
      formatCurrency(r.cost)
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Fecha', 'Km', 'Tipo', 'Taller / Proveedor', 'Descripción de Trabajos', 'Repuestos', 'Costo']],
      body:
        repairsData.length > 0
          ? repairsData
          : [['No se registran reparaciones en el período seleccionado', '-', '-', '-', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [30, 62, 98], textColor: 255, fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 18 },
        2: { cellWidth: 22 },
        3: { cellWidth: 30 },
        4: { cellWidth: 45 },
        5: { cellWidth: 30 },
        6: { cellWidth: 20 }
      }
    });
  }

  if (options.includeSignature) {
    drawOfficerSignatureBlock(doc, letterhead, (doc as any).lastAutoTable?.finalY);
  }

  doc.save(`Ficha_Vehicular_${vehicle.internalNumber}_${vehicle.plate.replace(/\s+/g, '_')}.pdf`);
}

// 6. Export Overtime Duty Schedule PDF
export function exportOvertimeSchedulePDF(
  letterhead: LetterheadConfig,
  duty: OvertimeDuty,
  assignedPersonnel: Personnel[]
) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const startY = drawPoliceLetterhead(
    doc,
    letterhead,
    'PLANILLA DE RECARGO DE SERVICIO OPERATIVO',
    `Fecha: ${formatDate(duty.date)} • Horario: ${duty.startTime} a ${duty.endTime} hs (${duty.totalHours} Horas) • Estado: ${duty.status}`
  );

  autoTable(doc, {
    startY,
    head: [['Detalle del Servicio', 'Datos']],
    body: [
      ['Tipo de Recargo', duty.dutyType],
      ['Lugar / Punto de Cobertura', duty.location],
      ['Horario Planificado', `${duty.startTime} a ${duty.endTime} hs (${duty.totalHours} hs totales)`],
      ['Autorizado por', duty.approvedBy || 'Jefatura de Servicio'],
      ['Valor Hora Estimado', duty.hourlyRate ? formatCurrency(duty.hourlyRate) : '-'],
      ['Observaciones', duty.notes || 'Sin novedades']
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } }
  });

  const currentY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('PERSONAL POLICIAL ASIGNADO Y CONTROL DE ASISTENCIA', 14, currentY);

  const personnelRows = assignedPersonnel.map((p, idx) => {
    const assisted = duty.attendedPersonnelIds.includes(p.id) ? 'PRESENTE' : 'AUSENTE';
    return [
      (idx + 1).toString(),
      p.rank,
      `${p.lastName}, ${p.firstName}`,
      formatDNI(p.dni),
      p.groupSection,
      assisted,
      '________________________' // Signature line for the officer
    ];
  });

  autoTable(doc, {
    startY: currentY + 3,
    head: [['#', 'Jerarquía', 'Apellido y Nombre', 'DNI', 'Sección', 'Asistencia', 'Firma del Efectivo']],
    body: personnelRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 62, 98], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.5 }
  });

  drawOfficerSignatureBlock(doc, letterhead, (doc as any).lastAutoTable.finalY);
  doc.save(`Recargo_Operativo_${duty.date}_${duty.dutyType.replace(/\s+/g, '_')}.pdf`);
}

// 7. Export Training Session PDF
export function exportTrainingSessionPDF(
  letterhead: LetterheadConfig,
  training: TrainingLecture,
  attendees: Personnel[]
) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const startY = drawPoliceLetterhead(
    doc,
    letterhead,
    'ACTA DE CAPACITACIÓN Y CHARLA INSTITUCIONAL',
    `Tema: ${training.title} • Fecha: ${formatDate(training.date)}`
  );

  autoTable(doc, {
    startY,
    head: [['Concepto', 'Información']],
    body: [
      ['Título de la Capacitación', training.title],
      ['Contenido / Temario', training.topic],
      ['Instructor / Disertante', `${training.instructor} (${training.instructorRank || 'Especialista'})`],
      ['Lugar / Instalación', training.location],
      ['Carga Horaria', `${training.hoursDuration} horas cátedra`],
      ['Observaciones', training.observations || 'Sin observaciones']
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } }
  });

  const currentY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('NÓMINA DE ASISTENTES AL ADIESTRAMIENTO', 14, currentY);

  const attendeeRows = attendees.map((p, idx) => [
    (idx + 1).toString(),
    p.rank,
    `${p.lastName}, ${p.firstName}`,
    formatDNI(p.dni),
    p.groupSection,
    '________________________'
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['#', 'Jerarquía', 'Apellido y Nombre', 'DNI', 'Sección', 'Firma Asistente']],
    body: attendeeRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 62, 98], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.5 }
  });

  drawOfficerSignatureBlock(doc, letterhead, (doc as any).lastAutoTable.finalY);
  doc.save(`Acta_Capacitacion_${training.date}.pdf`);
}
