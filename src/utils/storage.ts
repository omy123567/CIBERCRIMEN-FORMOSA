import JSZip from 'jszip';
import { AppDatabase } from '../types/police';

export function downloadJsonFile(filename: string, data: any) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportDatabaseToZip(database: AppDatabase): Promise<void> {
  const zip = new JSZip();

  // Create deep copy for metadata
  const dbCopy: AppDatabase = JSON.parse(JSON.stringify(database));
  const attachmentsFolder = zip.folder('adjuntos');

  let imageCounter = 0;
  // Extract images from cases into separate files inside zip and reference them
  dbCopy.cases.forEach((c) => {
    if (c.attachedImages && c.attachedImages.length > 0) {
      c.attachedImages.forEach((img, idx) => {
        if (img.dataUrl && img.dataUrl.startsWith('data:image')) {
          const match = img.dataUrl.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
          if (match && attachmentsFolder) {
            const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
            const base64Data = match[2];
            const imgFileName = `caso_${c.caseNumber.replace(/[^a-zA-Z0-9]/g, '_')}_adj_${idx + 1}.${ext}`;
            attachmentsFolder.file(imgFileName, base64Data, { base64: true });
            img.name = imgFileName;
            imageCounter++;
          }
        }
      });
    }

    if (c.elevation?.receiptImage && c.elevation.receiptImage.startsWith('data:image')) {
      const match = c.elevation.receiptImage.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (match && attachmentsFolder) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const base64Data = match[2];
        const imgFileName = `recibo_elevacion_${c.caseNumber.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
        attachmentsFolder.file(imgFileName, base64Data, { base64: true });
        imageCounter++;
      }
    }
  });

  // Extract receipt images from repairs
  dbCopy.repairs.forEach((r, idx) => {
    if (r.receiptImage && r.receiptImage.startsWith('data:image')) {
      const match = r.receiptImage.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (match && attachmentsFolder) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const base64Data = match[2];
        const imgFileName = `comprobante_rep_${r.vehicleId}_${idx + 1}.${ext}`;
        attachmentsFolder.file(imgFileName, base64Data, { base64: true });
        imageCounter++;
      }
    }
  });

  // Add primary database JSON
  zip.file('sispol_database.json', JSON.stringify(database, null, 2));

  // Add Manifest / Readme
  const manifest = {
    system: 'S.I.S.D.I.C. - Sistema Integral de Seguridad y Delitos Informáticos Complejos',
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    stats: {
      personnelCount: database.personnel.length,
      casesCount: database.cases.length,
      vehiclesCount: database.vehicles.length,
      repairsCount: database.repairs.length,
      overtimeCount: database.overtime.length,
      trainingsCount: database.trainings.length,
      imagesExtracted: imageCounter
    }
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Respaldo_SisPol_Completo_${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface VerificationResult {
  isValid: boolean;
  message: string;
  stats?: {
    personnel: number;
    cases: number;
    vehicles: number;
    repairs: number;
    overtime: number;
    trainings: number;
  };
  parsedDb?: AppDatabase;
}

export async function verifyAndParseBackupFile(file: File): Promise<VerificationResult> {
  const filename = file.name.toLowerCase();

  try {
    if (filename.endsWith('.json')) {
      const text = await file.text();
      const json = JSON.parse(text);

      if (!json || typeof json !== 'object') {
        return { isValid: false, message: 'El archivo JSON no contiene un formato de objeto válido.' };
      }

      // Check if it is a full database
      if (Array.isArray(json.personnel) && Array.isArray(json.cases) && Array.isArray(json.vehicles)) {
        return {
          isValid: true,
          message: 'Estructura de Base de Datos Completa verificada con éxito.',
          stats: {
            personnel: json.personnel.length,
            cases: json.cases.length,
            vehicles: json.vehicles.length,
            repairs: json.repairs?.length || 0,
            overtime: json.overtime?.length || 0,
            trainings: json.trainings?.length || 0
          },
          parsedDb: json as AppDatabase
        };
      }

      return {
        isValid: false,
        message: 'El archivo JSON carece de las entidades requeridas (Personal, Expedientes o Móviles).'
      };
    } else if (filename.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file);
      const dbFile = zip.file('sispol_database.json');

      if (!dbFile) {
        return {
          isValid: false,
          message: 'El archivo ZIP no contiene el archivo principal "sispol_database.json".'
        };
      }

      const jsonText = await dbFile.async('text');
      const json = JSON.parse(jsonText);

      if (Array.isArray(json.personnel) && Array.isArray(json.cases)) {
        return {
          isValid: true,
          message: 'Paquete de Respaldo ZIP íntegro y verificado.',
          stats: {
            personnel: json.personnel.length,
            cases: json.cases.length,
            vehicles: json.vehicles?.length || 0,
            repairs: json.repairs?.length || 0,
            overtime: json.overtime?.length || 0,
            trainings: json.trainings?.length || 0
          },
          parsedDb: json as AppDatabase
        };
      }

      return {
        isValid: false,
        message: 'Los datos internos del archivo ZIP están incompletos.'
      };
    } else {
      return {
        isValid: false,
        message: 'Formato no soportado. Por favor seleccione un archivo .json o .zip'
      };
    }
  } catch (err: any) {
    return {
      isValid: false,
      message: `Error al verificar el archivo: ${err.message || 'Archivo corrupto o ilegible'}`
    };
  }
}
