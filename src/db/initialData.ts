import { AppDatabase, SystemCatalogs, LetterheadConfig } from '../types/police';

export const initialCatalogs: SystemCatalogs = {
  ranks: [
    'Comisario Mayor',
    'Comisario Inspector',
    'Comisario',
    'Subcomisario',
    'Oficial Principal',
    'Oficial Inspector',
    'Oficial Subinspector',
    'Oficial Ayudante',
    'Suboficial Mayor',
    'Suboficial Principal',
    'Sargento Ayudante',
    'Sargento Primero',
    'Sargento',
    'Cabo Primero',
    'Cabo',
    'Agente'
  ],
  letterTypes: [
    'Oficio Judicial de Investigación',
    'Requerimiento Fiscal Urgente',
    'Orden de Allanamiento y Secuestro',
    'Notificación de Causa',
    'Solicitud de Copias Fílmicas',
    'Intervención Técnica Pericial',
    'Informes Ambientales y Socioambientales',
    'Oficio Preliminar / Sin Oficio'
  ],
  requirementTypes: [
    'Resguardo de Evidencia',
    'Resguardo c/ Escalamiento',
    'Escalamiento de Datos',
    'Descarga de Filmaciones / Cámaras',
    'Peritaje Telefónico / Extracción Forense',
    'Localización de Paradero',
    'Aseguramiento de Dispositivos',
    'Cotejo Dactiloscópico'
  ],
  taskTypes: [
    'Resguardo de Evidencia Digital',
    'Resguardo c/ Escalamiento',
    'Extracción Forense UFED',
    'Preservación de Cámaras de Seguridad (CCTV)',
    'Análisis de Celdas Telefónicas',
    'Relevamiento Vecinal y Testimonios',
    'Custodia de Elementos Secuestrados',
    'Escalamiento a Proveedores de Servicios (ISP)'
  ],
  courts: [
    'UFI N° 1 - Delitos Contra la Propiedad',
    'UFI N° 4 - Delitos Conexos y Complejos',
    'UFI N° 7 - Homicidios y Violencia Institucional',
    'UFI Temática de Estafas y Ciberdelitos',
    'Juzgado de Garantías N° 2',
    'Juzgado de Garantías N° 5',
    'Juzgado en lo Correccional N° 3',
    'Tribunal Oral en lo Criminal N° 1'
  ],
  requestingAgencies: [
    'Comisaría Seccional 1ra - Centro',
    'Comisaría Seccional 2da - Norte',
    'Subcomisaría Villa Parque',
    'División Investigaciones Complejas',
    'Gabinete Técnico Pericial Forense',
    'Comando de Patrullas Urbanas',
    'Dirección Departamental de Investigaciones (DDI)',
    'Destacamento Vial y Seguridad Ciudadana'
  ],
  groupSections: [
    'Guardia Operativa A',
    'Guardia Operativa B',
    'Guardia Operativa C',
    'Guardia Operativa D',
    'Secretaría de Actuaciones',
    'Gabinete de Investigaciones y Ciberdelito',
    'Móviles y Logística',
    'Servicio Externo'
  ],
  vehicleTypes: [
    'Patrullero',
    'Camioneta',
    'Utilitario',
    'Motovehículo',
    'Camión',
    'Otro'
  ],
  repairTypes: [
    'Mecánica',
    'Chapa y Pintura',
    'Electricidad',
    'Neumáticos',
    'Frenos',
    'Service Periódico',
    'Otro'
  ],
  overtimeTypes: [
    'Operativo Nocturno de Saturación',
    'Prevención Bancaria y Comercial',
    'Servicio Estadio y Eventos Deportivos',
    'Custodia Fija de Objetivos Judiciales',
    'Refuerzo de Cuadrícula Festivos',
    'Traslado de Detenidos y Aprehendidos'
  ]
};

export const initialLetterhead: LetterheadConfig = {
  unitName: 'POLICÍA DE LA PROVINCIA - UNIDAD REGIONAL I',
  institutionalSubtitle: 'DIVISIÓN INVESTIGACIONES Y GESTIÓN OPERATIVA JUDICIAL',
  jurisdiction: 'Jefatura de Policía - Departamento Seguridad Ciudadana',
  stationAddress: 'Av. San Martín 1420, Ciudad Central',
  stationPhone: 'Tel. (011) 4589-9200 / Guardia: 101 - 911',
  footerOfficerTitle: 'Oficial de Servicio / Jefe de Turno',
  footerOfficerName: 'Subcomisario Marcos E. Villalba - Legajo 88.421'
};

export const initialDatabase: AppDatabase = {
  personnel: [
    {
      id: 'pers-1',
      rank: 'Subcomisario',
      lastName: 'Villalba',
      firstName: 'Marcos Esteban',
      dni: '28419522',
      address: 'Calle Mitre 842',
      locality: 'Ciudad Central',
      phone: '11-4521-8890',
      emergencyContact: 'Laura Villalba (Cónyuge) - 11-4521-8891',
      groupSection: 'Secretaría de Actuaciones',
      status: 'Activo',
      licenseNumber: 'LEG-88421',
      observations: 'Jefe de Secretaría. Especializado en cadena de custodia forense.',
      leaves: [],
      createdAt: '2026-01-10T08:00:00Z'
    },
    {
      id: 'pers-2',
      rank: 'Oficial Principal',
      lastName: 'Paredes',
      firstName: 'Valeria Soledad',
      dni: '32984110',
      address: 'Av. Belgrano 1204 Piso 3B',
      locality: 'Ciudad Central',
      phone: '11-6321-4478',
      emergencyContact: 'Horacio Paredes (Padre) - 11-6321-4479',
      groupSection: 'Gabinete de Investigaciones y Ciberdelito',
      status: 'Activo',
      licenseNumber: 'LEG-91204',
      observations: 'Perito informático en evidencia digital y extracción forense.',
      leaves: [],
      createdAt: '2026-01-12T09:30:00Z'
    },
    {
      id: 'pers-3',
      rank: 'Sargento Primero',
      lastName: 'Benítez',
      firstName: 'Carlos Alberto',
      dni: '30455890',
      address: 'B° Los Álamos Manzana 14 Casa 2',
      locality: 'San Vicente',
      phone: '11-5874-1290',
      emergencyContact: 'Marta Benítez (Hermana) - 11-5874-1291',
      groupSection: 'Guardia Operativa A',
      status: 'Licencia',
      licenseNumber: 'LEG-84112',
      observations: 'Encargado de dotación de móviles de guardia.',
      leaves: [
        {
          id: 'leave-1',
          type: 'Médica',
          startDate: '2026-10-15',
          endDate: '2026-10-28',
          diagnosis: 'Traumatismo de rodilla derecha en cumplimiento del servicio',
          certificateNumber: 'CERT-MED-4421',
          observations: 'Reposo ambulatorio indicado por Sanidad Policial'
        }
      ],
      createdAt: '2026-01-15T10:00:00Z'
    },
    {
      id: 'pers-4',
      rank: 'Oficial Inspector',
      lastName: 'Molina',
      firstName: 'Diego Hernán',
      dni: '34120984',
      address: 'Pasaje Las Heras 310',
      locality: 'Ciudad Central',
      phone: '11-7789-2231',
      emergencyContact: 'Silvia Molina (Madre) - 11-7789-2232',
      groupSection: 'Guardia Operativa B',
      status: 'Activo',
      licenseNumber: 'LEG-95332',
      observations: 'Operador de comunicaciones y enlace judicial.',
      leaves: [],
      createdAt: '2026-02-01T11:00:00Z'
    },
    {
      id: 'pers-5',
      rank: 'Cabo Primero',
      lastName: 'Gómez',
      firstName: 'Mariana Beatríz',
      dni: '37841520',
      address: 'Calle Moreno 560',
      locality: 'Ramos Norte',
      phone: '11-4412-9908',
      emergencyContact: 'Pedro Gómez (Hermano) - 11-4412-9909',
      groupSection: 'Guardia Operativa C',
      status: 'Activo',
      licenseNumber: 'LEG-99182',
      observations: 'Chofer habilitada de móviles pesados y patrulleros.',
      leaves: [],
      createdAt: '2026-02-10T14:00:00Z'
    },
    {
      id: 'pers-6',
      rank: 'Sargento',
      lastName: 'Rios',
      firstName: 'Gustavo Daniel',
      dni: '31554219',
      address: 'Av. Roca 2980',
      locality: 'Ciudad Central',
      phone: '11-6677-4123',
      emergencyContact: 'Norma Rios (Esposa) - 11-6677-4124',
      groupSection: 'Móviles y Logística',
      status: 'Activo',
      licenseNumber: 'LEG-87612',
      observations: 'Mecánico de guardia y armero de la unidad.',
      leaves: [],
      createdAt: '2026-02-20T08:30:00Z'
    }
  ],
  cases: [
    {
      id: 'case-1',
      caseNumber: 'EXP-2026-0418',
      officialLetterNumber: 'OF-418/26',
      originCaratula: 'IPP 04-00-18492-26/00 s/ Robo Agravado por Uso de Arma',
      registrationDate: '2026-10-18',
      courtJurisdiction: 'UFI N° 4 - Delitos Conexos y Complejos',
      requestingAgency: 'División Investigaciones Complejas',
      letterType: 'Requerimiento Fiscal Urgente',
      requirementType: 'Resguardo de Evidencia',
      taskDone: 'Resguardo de Evidencia Digital',
      summary: 'Preservación de cuentas y evidencia telemática de los imputados individualizados en las actuaciones judiciales de autos.',
      observations: 'Se remitieron cédulas de notificación y se generó el hash SHA-256 de los dispositivos analizados.',
      elevation: {
        isDelivered: true,
        deliveryDate: '2026-10-19',
        elevatedBy: 'Oficial Principal Paredes Valeria',
        receivedBy: 'Dra. Méndez (Secretaría UFI N° 4)',
        receiptNumber: 'REM-8921-26'
      },
      ppi: {
        isInvolved: false
      },
      evidencePersons: [
        { id: 'ev-1', fullName: 'Romero, Cristian Ezequiel', dni: '36412098' },
        { id: 'ev-2', fullName: 'Ferreira, Daiana Milagros', dni: '39102455' },
        { id: 'ev-3', fullName: 'Acuña, Lucas Gabriel', dni: '35894120' }
      ],
      isFaltaOficio: false,
      attachedImages: [],
      createdAt: '2026-10-18T10:00:00Z'
    },
    {
      id: 'case-2',
      caseNumber: 'EXP-2026-0419',
      officialLetterNumber: 'OF-502/26',
      originCaratula: 'IPP 07-00-09142-26/00 s/ Averiguación de Ilícito con Imputación Funcional',
      registrationDate: '2026-10-19',
      courtJurisdiction: 'UFI N° 7 - Homicidios y Violencia Institucional',
      requestingAgency: 'Comisaría Seccional 1ra - Centro',
      letterType: 'Oficio Judicial de Investigación',
      requirementType: 'Descarga de Filmaciones / Cámaras',
      taskDone: 'Preservación de Cámaras de Seguridad (CCTV)',
      summary: 'Descarga y resguardo de video de las cámaras de seguridad perimetrales de la guardia y libro de guardia del día 16/10/2026.',
      observations: 'Se constata intervención de personal policial en turno que debe ser individualizado en el legajo.',
      elevation: {
        isDelivered: false
      },
      ppi: {
        isInvolved: true,
        rank: 'Sargento',
        fullName: 'Zárate, Claudio Marcelo',
        dni: '32104992',
        badgeNumber: 'LEG-82910',
        roleInCase: 'Personal actuante sujeto a investigación sumarial'
      },
      evidencePersons: [],
      isFaltaOficio: false,
      attachedImages: [],
      createdAt: '2026-10-19T14:20:00Z'
    },
    {
      id: 'case-3',
      caseNumber: 'FO-2026-0089',
      officialLetterNumber: 'SIN OFICIO (PRELIMINAR)',
      originCaratula: 'Prevención Actuaciones Previas s/ Hecho en Vía Pública c/ Damnificados Múltiples',
      registrationDate: '2026-10-20',
      courtJurisdiction: 'UFI N° 1 - Delitos Contra la Propiedad',
      requestingAgency: 'Comando de Patrullas Urbanas',
      letterType: 'Oficio Preliminar / Sin Oficio',
      requirementType: 'Resguardo c/ Escalamiento',
      taskDone: 'Resguardo c/ Escalamiento',
      summary: 'Medida cautelar de aseguramiento preventivo de cuentas bancarias virtuales y líneas celulares de los sospechosos a la espera del oficio fiscal.',
      observations: 'Pendiente de radicación de oficio formal por parte del juzgado actuante.',
      elevation: {
        isDelivered: false
      },
      ppi: {
        isInvolved: false
      },
      evidencePersons: [
        { id: 'ev-fo-1', fullName: 'Montenegro, Javier Oscar', dni: '29811402' },
        { id: 'ev-fo-2', fullName: 'Salinas, Patricia Beatriz', dni: '33490122' }
      ],
      isFaltaOficio: true,
      oficioReceived: false,
      attachedImages: [],
      createdAt: '2026-10-20T08:15:00Z'
    },
    {
      id: 'case-4',
      caseNumber: 'FO-2026-0090',
      officialLetterNumber: 'SIN OFICIO (PRELIMINAR)',
      originCaratula: 'Intervención de Emergencia s/ Recupero de Telefonía Celular Sustraída',
      registrationDate: '2026-10-20',
      courtJurisdiction: 'UFI Temática de Estafas y Ciberdelitos',
      requestingAgency: 'Comisaría Seccional 2da - Norte',
      letterType: 'Oficio Preliminar / Sin Oficio',
      requirementType: 'Resguardo de Evidencia',
      taskDone: 'Resguardo de Evidencia Digital',
      summary: 'Intervención preliminar para geolocalización y congelamiento de IMEI y registros de acceso de la víctima y sospechoso.',
      observations: 'Se solicitó por radiomensaje a secretaría de guardia.',
      elevation: {
        isDelivered: false
      },
      ppi: {
        isInvolved: false
      },
      evidencePersons: [
        { id: 'ev-fo-3', fullName: 'Bustamante, Federico Iván', dni: '40192844' }
      ],
      isFaltaOficio: true,
      oficioReceived: false,
      attachedImages: [],
      createdAt: '2026-10-20T09:40:00Z'
    },
    {
      id: 'case-5',
      caseNumber: 'EXP-2026-0410',
      officialLetterNumber: 'OF-390/26',
      originCaratula: 'IPP 04-00-17901-26/00 s/ Estafas Reiteradas y Ciberdelitos',
      registrationDate: '2026-10-12',
      courtJurisdiction: 'UFI Temática de Estafas y Ciberdelitos',
      requestingAgency: 'Gabinete Técnico Pericial Forense',
      letterType: 'Oficio Judicial de Investigación',
      requirementType: 'Escalamiento de Datos',
      taskDone: 'Escalamiento a Proveedores de Servicios (ISP)',
      summary: 'Escalamiento judicial ante proveedores de internet y operadoras telefónicas solicitando datos de abonados e IP asociadas.',
      observations: 'Elevado en término con soporte magnético adjunto.',
      elevation: {
        isDelivered: true,
        deliveryDate: '2026-10-14',
        elevatedBy: 'Oficial Inspector Molina Diego',
        receivedBy: 'Secretaría de Fiscalía de Ciberdelitos',
        receiptNumber: 'REC-0912-26'
      },
      ppi: {
        isInvolved: false
      },
      evidencePersons: [],
      isFaltaOficio: false,
      attachedImages: [],
      createdAt: '2026-10-12T11:00:00Z'
    }
  ],
  vehicles: [
    {
      id: 'veh-1',
      type: 'Patrullero',
      brand: 'Toyota',
      model: 'Corolla 2.0 XEI',
      plate: 'AF 342 KL',
      internalNumber: 'M-101',
      assignedDepartment: 'Comando de Patrullas Urbanas',
      currentMileage: 48950,
      condition: 'Bueno',
      operationalStatus: 'En Servicio',
      lastServiceDate: '2026-08-10',
      lastServiceMileage: 45000,
      nextServiceMileage: 50000,
      rtoExpiryDate: '2027-04-15',
      insuranceCompany: 'Provincia Seguros',
      insurancePolicyNumber: 'POL-AUTO-884219',
      insuranceExpiryDate: '2027-02-20',
      createdAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'veh-2',
      type: 'Camioneta',
      brand: 'Ford',
      model: 'Ranger 3.2 4x4 XL',
      plate: 'AD 819 OP',
      internalNumber: 'M-205',
      assignedDepartment: 'División Investigaciones Complejas',
      currentMileage: 89400,
      condition: 'Regular',
      operationalStatus: 'En Taller Mecánico',
      lastServiceDate: '2026-05-18',
      lastServiceMileage: 80000,
      nextServiceMileage: 90000,
      rtoExpiryDate: '2026-11-02', // Por vencer
      insuranceCompany: 'Nación Seguros',
      insurancePolicyNumber: 'POL-NAC-419082',
      insuranceExpiryDate: '2026-10-31', // Por vencer
      createdAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'veh-3',
      type: 'Camioneta',
      brand: 'Toyota',
      model: 'Hilux 2.8 TDI DX',
      plate: 'AG 110 ZZ',
      internalNumber: 'M-208',
      assignedDepartment: 'Comisaría Seccional 1ra - Centro',
      currentMileage: 32100,
      condition: 'Bueno',
      operationalStatus: 'En Servicio',
      lastServiceDate: '2026-09-02',
      lastServiceMileage: 30000,
      nextServiceMileage: 40000,
      rtoExpiryDate: '2027-09-10',
      insuranceCompany: 'Provincia Seguros',
      insurancePolicyNumber: 'POL-AUTO-993184',
      insuranceExpiryDate: '2027-05-15',
      createdAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'veh-4',
      type: 'Motovehículo',
      brand: 'Yamaha',
      model: 'Ténéré 250',
      plate: 'A 091 TYU',
      internalNumber: 'M-M04',
      assignedDepartment: 'Destacamento Vial y Seguridad Ciudadana',
      currentMileage: 18500,
      condition: 'Bueno',
      operationalStatus: 'En Servicio',
      lastServiceDate: '2026-07-20',
      lastServiceMileage: 15000,
      nextServiceMileage: 20000,
      rtoExpiryDate: '2026-09-15', // Vencida
      insuranceCompany: 'La Segunda Seguros',
      insurancePolicyNumber: 'POL-MOTO-102938',
      insuranceExpiryDate: '2027-01-15',
      createdAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'veh-5',
      type: 'Utilitario',
      brand: 'Renault',
      model: 'Kangoo Furgón 1.6',
      plate: 'AA 741 RT',
      internalNumber: 'M-312',
      assignedDepartment: 'Móviles y Logística',
      currentMileage: 142000,
      condition: 'Malo',
      operationalStatus: 'Fuera de Servicio',
      lastServiceDate: '2025-11-10',
      lastServiceMileage: 135000,
      nextServiceMileage: 145000,
      rtoExpiryDate: '2026-08-30', // Vencida
      insuranceCompany: 'Provincia Seguros',
      insurancePolicyNumber: 'POL-UTIL-339182',
      insuranceExpiryDate: '2026-12-10',
      createdAt: '2026-01-01T00:00:00Z'
    }
  ],
  repairs: [
    {
      id: 'rep-1',
      vehicleId: 'veh-2',
      date: '2026-10-16',
      mileage: 89400,
      interventionType: 'Frenos',
      workshopProvider: 'Taller Mecánico Central Policial',
      description: 'Cambio de pastillas y rectificación de discos delanteros. Purga de circuito hidráulico de frenos ABS.',
      cost: 185000,
      partsReplaced: 'Pastillas de freno cerámicas, líquido DOT 4, discos rectificados',
      createdAt: '2026-10-16T15:00:00Z'
    },
    {
      id: 'rep-2',
      vehicleId: 'veh-2',
      date: '2026-09-22',
      mileage: 87100,
      interventionType: 'Electricidad',
      workshopProvider: 'Electromecánica Integral Warnes',
      description: 'Reparación de barra de luces de balizamiento policial (barral LED estroboscópico) y sirena multitono.',
      cost: 94000,
      partsReplaced: 'Fusibles térmicos de alta corriente, cableado siliconado ignífugo',
      createdAt: '2026-09-22T11:30:00Z'
    },
    {
      id: 'rep-3',
      vehicleId: 'veh-1',
      date: '2026-08-10',
      mileage: 45000,
      interventionType: 'Service Periódico',
      workshopProvider: 'Concesionario Oficial Toyota Centro',
      description: 'Service oficial de 45.000 Km. Cambio de aceite sintético 5W30, filtro de aceite, filtro de aire y polen.',
      cost: 145000,
      partsReplaced: 'Aceite sintético 5W-30 (5L), Filtros originales Toyota',
      createdAt: '2026-08-10T09:00:00Z'
    },
    {
      id: 'rep-4',
      vehicleId: 'veh-5',
      date: '2026-07-04',
      mileage: 141200,
      interventionType: 'Mecánica',
      workshopProvider: 'Taller de Motores Norte',
      description: 'Problemas de inyección y bomba de combustible. Presupuesto pendiente de aprobación de jefatura.',
      cost: 320000,
      partsReplaced: 'Bomba sumergible de combustible',
      createdAt: '2026-07-04T16:00:00Z'
    }
  ],
  overtime: [
    {
      id: 'ot-1',
      date: '2026-10-24',
      startTime: '20:00',
      endTime: '02:00',
      totalHours: 6,
      dutyType: 'Operativo Nocturno de Saturación',
      location: 'Acceso Autopista y Rotonda Entrada Ciudad',
      assignedPersonnelIds: ['pers-1', 'pers-4', 'pers-5'],
      attendedPersonnelIds: ['pers-1', 'pers-4', 'pers-5'],
      hourlyRate: 8500,
      notes: 'Control estático y dinámico de motovehículos e interceptación selectiva.',
      approvedBy: 'Comisario Inspector D. Juárez',
      status: 'Programado',
      createdAt: '2026-10-19T10:00:00Z'
    },
    {
      id: 'ot-2',
      date: '2026-10-18',
      startTime: '08:00',
      endTime: '14:00',
      totalHours: 6,
      dutyType: 'Prevención Bancaria y Comercial',
      location: 'Microcentro Bancario y Casas de Cambio',
      assignedPersonnelIds: ['pers-2', 'pers-5'],
      attendedPersonnelIds: ['pers-2', 'pers-5'],
      hourlyRate: 8500,
      notes: 'Servicio extraordinario sin novedades. Se cubrieron 8 entidades financieras.',
      approvedBy: 'Subcomisario Villalba Marcos',
      status: 'Completado',
      createdAt: '2026-10-17T12:00:00Z'
    }
  ],
  trainings: [
    {
      id: 'tr-1',
      date: '2026-10-10',
      title: 'Preservación de la Escena del Crimen y Cadena de Custodia Digital',
      topic: 'Protocolos de secuestro de telefonía celular, clonado forense y resguardo con acta judicial.',
      instructor: 'Oficial Principal Valeria Paredes',
      instructorRank: 'Oficial Principal (Perito Informático)',
      location: 'Auditorio Central de la Unidad Regional I',
      attendeePersonnelIds: ['pers-1', 'pers-4', 'pers-5', 'pers-6'],
      hoursDuration: 3,
      observations: 'Capacitación teórico-práctica con entrega de certificados y simulacro de embalaje con bolsas Faraday.',
      createdAt: '2026-10-10T16:00:00Z'
    },
    {
      id: 'tr-2',
      date: '2026-09-18',
      title: 'Manejo Defensivo y Mantenimiento de Unidades Móviles Policiales',
      topic: 'Técnicas de conducción táctica, revisiones previas a la guardia y control de fluidos.',
      instructor: 'Sargento Rios Gustavo',
      instructorRank: 'Sargento (Encargado de Parque)',
      location: 'Playón Operativo de Móviles',
      attendeePersonnelIds: ['pers-3', 'pers-5', 'pers-6'],
      hoursDuration: 4,
      observations: 'Práctica de frenado en pista húmeda y verificación de documentación obligatoria.',
      createdAt: '2026-09-18T18:00:00Z'
    }
  ],
  catalogs: initialCatalogs,
  letterhead: initialLetterhead,
  supabaseConfig: {
    supabaseUrl: '',
    supabaseAnonKey: '',
    autoSync: false,
    isConnected: false
  }
};
