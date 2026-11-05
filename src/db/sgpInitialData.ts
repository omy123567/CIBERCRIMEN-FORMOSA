import { SgpBackupData, DynamicCatalog, InstitutionalConfig } from '../types/sgp';

export const initialCatalogsList: DynamicCatalog[] = [
  // Juzgados
  { category: 'Juzgado', value: 'Juzgado de Instrucción y Correccional N° 1 - Clorinda' },
  { category: 'Juzgado', value: 'Juzgado de Instrucción y Correccional N° 2 - Clorinda' },
  { category: 'Juzgado', value: 'Juzgado de Instrucción y Correccional N° 1 - Formosa Capital' },
  { category: 'Juzgado', value: 'Juzgado de Instrucción y Correccional N° 2 - Formosa Capital' },
  { category: 'Juzgado', value: 'Juzgado de Paz de Menor Cuantía - Laguna Blanca' },
  { category: 'Juzgado', value: 'Juzgado de Menores y Familia - Clorinda' },
  { category: 'Juzgado', value: 'Juzgado Federal N° 1 de Formosa' },
  { category: 'Juzgado', value: 'Juzgado Federal N° 2 de Formosa' },
  { category: 'Juzgado', value: 'Fiscalía de Primera Instancia - Laguna Blanca / Clorinda' },

  // Dependencias
  { category: 'Dependencias', value: 'D.D.P.C.L.B. (Delegación Laguna Blanca)' },
  { category: 'Dependencias', value: 'D.D.G.P.C. (Dirección General de Policía Científica)' },
  { category: 'Dependencias', value: 'Comisaría Laguna Blanca' },
  { category: 'Dependencias', value: 'Unidad Regional N° 4 - Laguna Blanca' },
  { category: 'Dependencias', value: 'Comisaría Riacho He Hé' },
  { category: 'Dependencias', value: 'Comisaría El Espinillo' },
  { category: 'Dependencias', value: 'Subcomisaría Siete Palmas' },
  { category: 'Dependencias', value: 'Comisaría Buena Vista' },
  { category: 'Dependencias', value: 'Destacamento Tres Lagunas' },
  { category: 'Dependencias', value: 'Comisaría Clorinda' },
  { category: 'Dependencias', value: 'Jefatura de Policía de Formosa' },

  // Requerimiento
  { category: 'Requerimiento', value: 'Descarga Fílmica / Registro Fílmico' },
  { category: 'Requerimiento', value: 'Resguardo de Evidencia Digital' },
  { category: 'Requerimiento', value: 'Resguardo c/ Escalamiento' },
  { category: 'Requerimiento', value: 'Escalamiento / Peritaje' },
  { category: 'Requerimiento', value: 'Extracción Forense de Dispositivos' },
  { category: 'Requerimiento', value: 'Peritaje Balístico / Armas' },
  { category: 'Requerimiento', value: 'Inspección Ocular y Croquis' },
  { category: 'Requerimiento', value: 'Cuestiones de Familia / Exclusión de Hogar' },
  { category: 'Requerimiento', value: 'Captura y Detención' },
  { category: 'Requerimiento', value: 'Embargo Operativo' },
  { category: 'Requerimiento', value: 'Notificación de Cargo' },
  { category: 'Requerimiento', value: 'Averiguación de Paradero' },
  { category: 'Requerimiento', value: 'Citación / Testimonial' },
  { category: 'Requerimiento', value: 'Allanamiento y Secuestro' },

  // Oficio
  { category: 'Oficio', value: 'Oficio Judicial' },
  { category: 'Oficio', value: 'Cédula de Notificación' },
  { category: 'Oficio', value: 'Mandamiento de Allanamiento' },
  { category: 'Oficio', value: 'Requerimiento Fiscal Urgente' },
  { category: 'Oficio', value: 'Orden de Detención' },
  { category: 'Oficio', value: 'Oficio Preliminar / Sin Oficio' },
  { category: 'Oficio', value: 'Radiomensaje Policial' },

  // Jerarquias
  { category: 'Jerarquias', value: 'Comisario General' },
  { category: 'Jerarquias', value: 'Comisario Mayor' },
  { category: 'Jerarquias', value: 'Comisario Inspector' },
  { category: 'Jerarquias', value: 'Comisario' },
  { category: 'Jerarquias', value: 'Subcomisario' },
  { category: 'Jerarquias', value: 'Oficial Principal' },
  { category: 'Jerarquias', value: 'Oficial Auxiliar' },
  { category: 'Jerarquias', value: 'Oficial Ayudante' },
  { category: 'Jerarquias', value: 'Oficial Subayudante' },
  { category: 'Jerarquias', value: 'Suboficial Mayor' },
  { category: 'Jerarquias', value: 'Suboficial Principal' },
  { category: 'Jerarquias', value: 'Sargento Ayudante' },
  { category: 'Jerarquias', value: 'Sargento Primero' },
  { category: 'Jerarquias', value: 'Sargento' },
  { category: 'Jerarquias', value: 'Cabo Primero' },
  { category: 'Jerarquias', value: 'Cabo' },
  { category: 'Jerarquias', value: 'Agente' },

  // Grupos
  { category: 'Grupos', value: 'Guardia A' },
  { category: 'Grupos', value: 'Guardia B' },
  { category: 'Grupos', value: 'Guardia C' },
  { category: 'Grupos', value: 'Guardia D' },
  { category: 'Grupos', value: 'Servicio Externo' },
  { category: 'Grupos', value: 'Administración y Secretaría' },
  { category: 'Grupos', value: 'Gabinete Científico / Pericial' },
  { category: 'Grupos', value: 'Parque Automotor y Logística' },

  // Tipos de Recargo
  { category: 'Tipos de Recargo', value: 'Seguridad en Cancha / Evento' },
  { category: 'Tipos de Recargo', value: 'Custodia Judicial' },
  { category: 'Tipos de Recargo', value: 'Operativo de Prevención' },
  { category: 'Tipos de Recargo', value: 'Puesto Fijo' },
  { category: 'Tipos de Recargo', value: 'Operativo de Saturación Nocturna' },
  { category: 'Tipos de Recargo', value: 'Control Vial y Fronterizo' },

  // Tarea Realizada
  { category: 'Tarea Realizada', value: 'Resguardo Fílmico / DVR Preservado' },
  { category: 'Tarea Realizada', value: 'Resguardo de Evidencia Digital con Hash' },
  { category: 'Tarea Realizada', value: 'Extracción Forense UFED' },
  { category: 'Tarea Realizada', value: 'Escalamiento a Proveedor de Servicios' },
  { category: 'Tarea Realizada', value: 'Acta de Inspección Ocular Fotográfica' },
  { category: 'Tarea Realizada', value: 'Secuestro y Embalaje con Cadena de Custodia' },
  { category: 'Tarea Realizada', value: 'Relevamiento y Descarga Completa' },

  // Localidades
  { category: 'Localidades', value: 'Laguna Blanca' },
  { category: 'Localidades', value: 'Riacho He Hé' },
  { category: 'Localidades', value: 'El Espinillo' },
  { category: 'Localidades', value: 'Siete Palmas' },
  { category: 'Localidades', value: 'Buena Vista' },
  { category: 'Localidades', value: 'Tres Lagunas' },
  { category: 'Localidades', value: 'Misión Tacaaglé' },
  { category: 'Localidades', value: 'Clorinda' },
  { category: 'Localidades', value: 'Formosa Capital' },

  // Arma Marcas
  { category: 'Arma Marcas', value: 'Bersa' },
  { category: 'Arma Marcas', value: 'Taurus' },
  { category: 'Arma Marcas', value: 'Browning' },
  { category: 'Arma Marcas', value: 'Glock' },
  { category: 'Arma Marcas', value: 'FM (Fabricaciones Militares)' },

  // Arma Modelo
  { category: 'Arma Modelo', value: 'Thunder 9 Pro' },
  { category: 'Arma Modelo', value: 'Thunder 9 Ultra Compact' },
  { category: 'Arma Modelo', value: 'PT 92 AF' },
  { category: 'Arma Modelo', value: 'Hi-Power 9mm' },
  { category: 'Arma Modelo', value: 'Glock 17 Gen 5' },

  // Chaleco Tallas
  { category: 'Chaleco Tallas', value: 'Talla S' },
  { category: 'Chaleco Tallas', value: 'Talla M' },
  { category: 'Chaleco Tallas', value: 'Talla L' },
  { category: 'Chaleco Tallas', value: 'Talla XL' },
  { category: 'Chaleco Tallas', value: 'Talla XXL' },

  // Tipo Movil
  { category: 'Tipo Movil', value: 'Patrullero Sedán' },
  { category: 'Tipo Movil', value: 'Camioneta 4x4' },
  { category: 'Tipo Movil', value: 'Camioneta 4x2' },
  { category: 'Tipo Movil', value: 'Utilitario / Furgón' },
  { category: 'Tipo Movil', value: 'Motovehículo' },

  // Marca Movil
  { category: 'Marca Movil', value: 'Toyota' },
  { category: 'Marca Movil', value: 'Ford' },
  { category: 'Marca Movil', value: 'Chevrolet' },
  { category: 'Marca Movil', value: 'Fiat' },
  { category: 'Marca Movil', value: 'Yamaha' },
  { category: 'Marca Movil', value: 'Honda' },

  // Modelo Movil
  { category: 'Modelo Movil', value: 'Hilux 2.8 4x4' },
  { category: 'Modelo Movil', value: 'Ranger 3.2' },
  { category: 'Modelo Movil', value: 'Cronos 1.3' },
  { category: 'Modelo Movil', value: 'Corolla 2.0' },
  { category: 'Modelo Movil', value: 'Ténéré 250' },
  { category: 'Modelo Movil', value: 'XR 250 Tornado' },

  // Aseguradoras
  { category: 'Aseguradoras', value: 'Provincia Seguros' },
  { category: 'Aseguradoras', value: 'Nación Seguros' },
  { category: 'Aseguradoras', value: 'La Segunda' },
  { category: 'Aseguradoras', value: 'San Cristóbal' },
  { category: 'Aseguradoras', value: 'Federación Patronal' }
];

export const initialInstitutionalConfig: InstitutionalConfig = {
  systemName: 'S.I.S.D.I.C.',
  systemFullName: 'S.I.S.D.I.C. - Sistema Integral de Seguridad y Delitos Informáticos Complejos',
  province: 'PROVINCIA DE FORMOSA',
  policeForce: 'POLICÍA DE LA PROVINCIA DE FORMOSA',
  division: 'DIVISIÓN INVESTIGACIÓN CIBERCRIMEN',
  subdivision: 'DELEGACIÓN POLICÍA CIENTÍFICA LAGUNA BLANCA',
  unitLocation: 'Calle San Martín e H. Irigoyen - Bº Centro - Laguna Blanca - C.P. 3613',
  headerTitle: 'POLICÍA DE LA PROVINCIA DE FORMOSA - D.D.G.P.C. LAGUNA BLANCA',
  footerTitle: 'Jefe Delegación D.D.P.C.L.B.',
  footerName: 'Comisario Inspector Lic. Roberto M. Gómez',
  delegacionId: 1,
  logoDataUrl: '/logo-sisdic.png',
  logoLeftUrl: '/logo-policia-formosa.png',
  logoRightUrl: '/logo-sisdic.png',
  mottoLeft: '"La seguridad pública es una construcción colectiva"',
  mottoRight: 'D.G.P.C.',
  addressLine1: 'Calle San Martín e H. Irigoyen - Bº Centro - Laguna Blanca - C.P. 3613',
  addressLine2: 'Tel.: 3704-040169 / E-mail: pol.delgcrimlagunablanca@formosa.gov.ar',
  telefonosCorreos: 'Tel.: 3704-040169 / E-mail: pol.delgcrimlagunablanca@formosa.gov.ar',
  siglasDependencia: 'DPC-LB',
  textoPiePaginaPdf: 'Documento Reservado de Uso Oficial Interno - Delegación Policía Científica Laguna Blanca.',
  headerLines: [
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
  ]
};

export const initialSgpBackup: SgpBackupData = {
  personal: [
    {
      id: 1,
      jerarquia: 'Comisario Inspector',
      plaza: 'PL-001',
      apellidoNombre: 'Gómez, Roberto Manuel',
      dni: '25410982',
      fechaNacimiento: '14/05/1976',
      fechaIngreso: '01/02/1998', // Antigüedad: 2026 - 1998 = 28 años (>25 años -> 49 días)
      grupo: 'Administración y Secretaría',
      contactoEmergencia: 'Esposa: María Gómez - Cel. 3718-442190',
      disponible: true,
      motivoNoDisponible: '',
      customFieldsJson: JSON.stringify({
        telefono: '3718-442190',
        domicilio: 'Calle San Martín 540, Laguna Blanca',
        localidad: 'Laguna Blanca',
        chapaPlaca: 'LEG-14201',
        armaAsignada: 'Bersa Thunder 9 Pro (Serie B8912)',
        chalecoAsignado: 'Talla L (Venc. 2028)'
      }),
      delegacionId: 1
    },
    {
      id: 2,
      jerarquia: 'Oficial Principal',
      plaza: 'PL-008',
      apellidoNombre: 'Fernández, Esteban David',
      dni: '32450891',
      fechaNacimiento: '22/09/1986',
      fechaIngreso: '15/03/2012', // Antigüedad: 2026 - 2012 = 14 años (11 a 15 -> 28 días)
      grupo: 'Gabinete Científico / Pericial',
      contactoEmergencia: 'Hermano: Jorge Fernández - Cel. 3704-551122',
      disponible: true,
      motivoNoDisponible: '',
      customFieldsJson: JSON.stringify({
        telefono: '3704-551122',
        domicilio: 'B° San Juan Mza 4 Casa 12',
        localidad: 'Laguna Blanca',
        chapaPlaca: 'LEG-19842',
        armaAsignada: 'Glock 17 Gen 5 (Serie G44102)',
        chalecoAsignado: 'Talla M (Venc. 2027)'
      }),
      delegacionId: 1
    },
    {
      id: 3,
      jerarquia: 'Sargento Primero',
      plaza: 'PL-015',
      apellidoNombre: 'Benítez, Gustavo Adolfo',
      dni: '30991823',
      fechaNacimiento: '10/01/1984',
      fechaIngreso: '01/08/2006', // Antigüedad: 2026 - 2006 = 20 años (16 a 20 -> 35 días)
      grupo: 'Guardia A',
      contactoEmergencia: 'Hija: Lucía Benítez - Cel. 3718-601928',
      disponible: false,
      motivoNoDisponible: 'Licencia Anual Ordinaria',
      customFieldsJson: JSON.stringify({
        telefono: '3718-601928',
        domicilio: 'Ruta Pcial N° 2 Km 3',
        localidad: 'Riacho He Hé',
        chapaPlaca: 'LEG-17409',
        armaAsignada: 'Bersa Thunder 9 Pro (Serie B4519)',
        chalecoAsignado: 'Talla XL (Venc. 2027)'
      }),
      delegacionId: 1
    },
    {
      id: 4,
      jerarquia: 'Cabo Primero',
      plaza: 'PL-022',
      apellidoNombre: 'Sosa, Andrea Beatríz',
      dni: '36412099',
      fechaNacimiento: '04/11/1991',
      fechaIngreso: '01/04/2018', // Antigüedad: 2026 - 2018 = 8 años (6 a 10 -> 21 días)
      grupo: 'Guardia B',
      contactoEmergencia: 'Madre: Carmen Sosa - Cel. 3718-778899',
      disponible: true,
      motivoNoDisponible: '',
      customFieldsJson: JSON.stringify({
        telefono: '3718-778899',
        domicilio: 'Calle Sarmiento 210',
        localidad: 'Laguna Blanca',
        chapaPlaca: 'LEG-22104',
        armaAsignada: 'Taurus PT 92 AF (Serie T99120)',
        chalecoAsignado: 'Talla S (Venc. 2029)'
      }),
      delegacionId: 1
    }
  ],
  expedientes: [
    {
      id: 1,
      anio: '2026',
      nroExpediente: '121',
      caratula: 'Expte. N° 121/26 s/ Supuesto Robo y Atentado a la Autoridad en Local Comercial',
      juzgado: 'Juzgado de Instrucción y Correccional N° 1 - Clorinda',
      dependencia: 'Comisaría Laguna Blanca',
      tipoOficio: 'Oficio Judicial',
      tipoRequerimiento: 'Descarga Fílmica / Registro Fílmico',
      tipoRequerimientoDetalle: 'Cámaras de vigilancia del comercio y domo municipal',
      fechaIngreso: '18/10/2026',
      fechaVencimiento: '28/10/2026',
      plazoDias: 10,
      personalAsignado: 'Oficial Principal Fernández, Esteban David',
      estado: 'En Trámite',
      prioridad: 'Urgente',
      fechaElevacion: '',
      nroNotaElevacion: '',
      observaciones: 'Se procedió al levantamiento de evidencias en soporte óptico.',
      customFieldsJson: JSON.stringify({
        dependenciaSolicitante: 'Comisaría Laguna Blanca',
        personalACargo: 'Oficial Principal Fernández, Esteban David',
        isFaltaOficio: false,
        oficioOrigen: 'OF-340/26',
        anioOficio: '2026',
        letrasOficio: 'SEC. CRIM.',
        seHizoTareaRealizada: true,
        resumenTareaRealizada: 'Descarga de 72 hs de videograbaciones del sistema CCTV.',
        isPPI: false,
        evidencePersons: [
          { id: 'ev-1', fullName: 'Morales, Cristian Ariel', dni: '38910442' },
          { id: 'ev-2', fullName: 'Villalba, Sergio Fabián', dni: '40192831' }
        ],
        condicionElevacion: 'No entregado',
        resguardoFilmico: true
      }),
      delegacionId: 1
    },
    {
      id: 2,
      anio: '2026',
      nroExpediente: '122',
      caratula: 'Expte. N° 122/26 s/ Investigación Preliminar c/ Personal Policial en Turno',
      juzgado: 'Juzgado de Instrucción y Correccional N° 2 - Clorinda',
      dependencia: 'Unidad Regional N° 4 - Laguna Blanca',
      tipoOficio: 'Requerimiento Fiscal Urgente',
      tipoRequerimiento: 'Resguardo de Evidencia Digital',
      tipoRequerimientoDetalle: 'Preservación de telefonía celular y registros de comunicaciones',
      fechaIngreso: '15/10/2026',
      fechaVencimiento: '20/10/2026',
      plazoDias: 5,
      personalAsignado: 'Comisario Inspector Gómez, Roberto Manuel',
      estado: 'Diligenciado',
      prioridad: 'Muy Urgente',
      fechaElevacion: '20/10/2026',
      horaElevacion: '11:30',
      nroNotaElevacion: 'NOTA-ELEV-89/26',
      personalRecibeAjeno: 'Dra. María Insfrán (Secretaría Penal)',
      observaciones: 'Causa tramitada con personal policial involucrado.',
      customFieldsJson: JSON.stringify({
        dependenciaSolicitante: 'Unidad Regional N° 4 - Laguna Blanca',
        personalACargo: 'Comisario Inspector Gómez, Roberto Manuel',
        isFaltaOficio: false,
        oficioOrigen: 'OF-412/26',
        anioOficio: '2026',
        letrasOficio: 'UFI',
        seHizoTareaRealizada: true,
        resumenTareaRealizada: 'Extracción física forense y clonado bit a bit con hash SHA-256.',
        isPPI: true,
        ppiJerarquia: 'Sargento',
        ppiPlaza: 'PL-084',
        ppiApellidoNombre: 'Romero, Javier Andrés',
        ppiDni: '33109482',
        ppiDetalles: 'Efectivo investigado en sumario administrativo interno',
        evidencePersons: [
          { id: 'ev-3', fullName: 'Romero, Javier Andrés', dni: '33109482' }
        ],
        condicionElevacion: 'Entregado'
      }),
      delegacionId: 1
    },
    {
      id: 3,
      anio: '2026',
      nroExpediente: 'FO-089',
      caratula: 'Actuación Urgente s/ Allanamiento de Morada y Resguardo Cautelar',
      juzgado: 'Juzgado de Instrucción y Correccional N° 1 - Clorinda',
      dependencia: 'D.D.P.C.L.B. (Delegación Laguna Blanca)',
      tipoOficio: 'Oficio Preliminar / Sin Oficio',
      tipoRequerimiento: 'Resguardo c/ Escalamiento',
      tipoRequerimientoDetalle: 'Aseguramiento preventivo',
      fechaIngreso: '22/10/2026',
      fechaVencimiento: '27/10/2026',
      plazoDias: 5,
      personalAsignado: 'Oficial Principal Fernández, Esteban David',
      estado: 'Iniciado',
      prioridad: 'Muy Urgente',
      fechaElevacion: '',
      nroNotaElevacion: '',
      observaciones: 'Caso preliminar registrado bajo falta de oficio pendiente de recepción judicial.',
      customFieldsJson: JSON.stringify({
        isFaltaOficio: true,
        dependenciaSolicitante: 'Comisaría El Espinillo',
        personalACargo: 'Oficial Principal Fernández, Esteban David',
        oficioOrigen: 'SIN OFICIO',
        anioOficio: '2026',
        letrasOficio: 'PRELIMINAR',
        seHizoTareaRealizada: false,
        evidencePersons: [
          { id: 'ev-4', fullName: 'Acuña, Marcos Daniel', dni: '35198204' },
          { id: 'ev-5', fullName: 'Peralta, Silvia Noemí', dni: '37819200' }
        ],
        condicionElevacion: 'No entregado'
      }),
      delegacionId: 1
    }
  ],
  moviles: [
    {
      id: 1,
      identificador: 'JP-24',
      marca: 'Toyota',
      modelo: 'Hilux 2.8 4x4',
      dominio: 'AF 782 PL',
      chasis: '8AJBA3CD8N2104918',
      motor: '1GD-8910245',
      condicion: 'En Servicio',
      kmActual: '42300',
      kmUltimoService: '40000',
      kmProximoService: '50000',
      vencimientoRto: '15/06/2027',
      vencimientoSeguro: '10/04/2027',
      companiaSeguro: 'Provincia Seguros',
      numeroPoliza: 'POL-AUTO-881920',
      observaciones: 'Móvil principal de la delegación en óptimo estado.',
      delegacionId: 1
    },
    {
      id: 2,
      identificador: 'M-101',
      marca: 'Ford',
      modelo: 'Ranger 3.2',
      dominio: 'AD 910 ZZ',
      chasis: '8AFFA4CD1K0918231',
      motor: 'DURATORQ-4109',
      condicion: 'Taller',
      kmActual: '89750',
      kmUltimoService: '80000',
      kmProximoService: '90000', // Restan 250 km -> Alerta en ámbar!
      vencimientoRto: '05/11/2026', // Próximo a vencer!
      vencimientoSeguro: '30/10/2026', // Próximo a vencer!
      companiaSeguro: 'Nación Seguros',
      numeroPoliza: 'POL-NAC-441098',
      observaciones: 'Ingresó a taller por reparación del sistema de frenos y amortiguación.',
      delegacionId: 1
    },
    {
      id: 3,
      identificador: 'JP-05',
      marca: 'Yamaha',
      modelo: 'Ténéré 250',
      dominio: 'A 098 LKB',
      chasis: '9C6DG0209H009182',
      motor: 'G389E-109283',
      condicion: 'En Servicio',
      kmActual: '16200',
      kmUltimoService: '15000',
      kmProximoService: '18000',
      vencimientoRto: '20/09/2026', // Vencido!
      vencimientoSeguro: '15/01/2027',
      companiaSeguro: 'La Segunda',
      numeroPoliza: 'POL-MOTO-192834',
      observaciones: 'Motovehículo de patrullaje urbano y enlace.',
      delegacionId: 1
    }
  ],
  reparaciones: [
    {
      id: 1,
      movilId: 2,
      fecha: '20/10/2026',
      tallerMecanico: 'Taller Mecánico Central Laguna Blanca',
      descripcion: 'Rectificación de campanas de freno traseras y cambio de pastillas delanteras.',
      repuestosCambiados: 'Pastillas de freno cerámicas, líquido de frenos DOT 4',
      costoTotal: 195000,
      kmMomento: '89750',
      observaciones: 'Trabajo con garantía de 6 meses.',
      delegacionId: 1
    },
    {
      id: 2,
      movilId: 1,
      fecha: '15/08/2026',
      tallerMecanico: 'Concesionario Oficial Toyota Clorinda',
      descripcion: 'Service Oficial de los 40.000 Km y alineación computarizada.',
      repuestosCambiados: 'Aceite sintético 5W-30 (8L), Filtros originales',
      costoTotal: 240000,
      kmMomento: '40000',
      observaciones: 'Mantenimiento preventivo oficial.',
      delegacionId: 1
    }
  ],
  recargos: [
    {
      id: 1,
      personalId: 4,
      personalNombre: 'Sosa, Andrea Beatríz',
      personalJerarquia: 'Cabo Primero',
      fecha: '24/10/2026',
      horarioDesde: '18:00',
      horarioHasta: '00:00',
      totalHoras: '6',
      tipoRecargo: 'Seguridad en Cancha / Evento',
      lugarDestino: 'Club Atlético Laguna Blanca - Torneo Regional',
      observaciones: 'Servicio sin incidentes con afectación a platea y acceso norte.',
      delegacionId: 1
    },
    {
      id: 2,
      personalId: 2,
      personalNombre: 'Fernández, Esteban David',
      personalJerarquia: 'Oficial Principal',
      fecha: '21/10/2026',
      horarioDesde: '20:00',
      horarioHasta: '02:00',
      totalHoras: '6',
      tipoRecargo: 'Operativo de Prevención',
      lugarDestino: 'Ruta Nacional N° 86 y Acceso a Laguna Blanca',
      observaciones: 'Control de motovehículos y personas.',
      delegacionId: 1
    }
  ],
  charlas: [
    {
      id: 1,
      fecha: '14/10/2026',
      lugarInstitucion: 'Colegio Secundario EPES N° 22',
      localidad: 'Laguna Blanca',
      temaTratado: 'Prevención de Ciberdelito, Grooming y Seguridad en Redes Sociales',
      personalDesignado: 'Oficial Principal Fernández, Esteban David',
      cantidadAsistentes: 85,
      observaciones: 'Excelente participación de alumnos y cuerpo docente con entrega de folletería preventiva.',
      delegacionId: 1
    },
    {
      id: 2,
      fecha: '08/09/2026',
      lugarInstitucion: 'Centro Comunitario Municipal',
      localidad: 'Riacho He Hé',
      temaTratado: 'Seguridad Vial y Normativa de Tránsito para Conductores Jóvenes',
      personalDesignado: 'Comisario Inspector Gómez, Roberto Manuel',
      cantidadAsistentes: 60,
      observaciones: 'Disertación con soporte audiovisual y simulador de distancias de frenado.',
      delegacionId: 1
    }
  ],
  licencias: [
    {
      id: 1,
      personalId: 3,
      jerarquia: 'Sargento Primero',
      plaza: 'PL-015',
      apellidoNombre: 'Benítez, Gustavo Adolfo',
      dni: '30991823',
      fechaIngreso: '01/08/2006',
      tipoLicencia: 'Anual',
      anioPeriodo: 2026,
      diasHabilesTomados: 14,
      sumaDiasViaje: true,
      disposicionViaje: 'DISP-JEF-4412/26',
      diasPermitidosViaje: 2,
      fueInterrumpida: false,
      fechaInterrupcion: '',
      motivoInterrupcion: '',
      diasRestantesDevueltos: 0,
      observaciones: 'Imputación de primer tramo de Licencia Anual.',
      periodosDetalleJson: '{"2026": 14}',
      fechaSalida: '',
      fechaReanudacion: '',
      delegacionId: 1
    }
  ],
  dynamicCatalogs: initialCatalogsList,
  dynamicFields: [],
  personas: [
    {
      id: 1,
      apellidoNombre: 'Medina, Carlos Alberto',
      dni: '34891022',
      observaciones: 'Imputado en Causa S/ Robo Calificado en Poblado y en Banda',
      fechaRegistro: '12/03/2026',
      expedientesVinculados: ['121/2026']
    },
    {
      id: 2,
      apellidoNombre: 'Vera, Jorge Luis',
      dni: '29871654',
      observaciones: 'Investigado en peritaje de telefonía celular',
      fechaRegistro: '15/03/2026',
      expedientesVinculados: ['121/2026']
    },
    {
      id: 3,
      apellidoNombre: 'Alfonso, Mario Daniel',
      dni: '38120993',
      observaciones: 'Testigo / Propietario de dispositivo secuestrado',
      fechaRegistro: '02/04/2026',
      expedientesVinculados: ['FO-088']
    },
    {
      id: 4,
      apellidoNombre: 'Benítez, Lorena Noemí',
      dni: '35441908',
      observaciones: 'Denunciante en causa de violencia digital / estafa electrónica',
      fechaRegistro: '10/04/2026',
      expedientesVinculados: ['142/2026']
    }
  ]
};
