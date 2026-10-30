import JSZip from 'jszip';
import saveAs from 'file-saver';
import { SgpBackupData, Expediente, Personal } from '../types/sgp';
import { sgpManager, db } from '../db/dexieDb';

/**
 * Generates and downloads the official "SGP_CopiaCompleta.zip" interoperable with the mobile app.
 */
export async function exportSgpCopiaCompletaZip(): Promise<void> {
  const data = await sgpManager.getBackupData();
  const zip = new JSZip();
  const attachmentsFolder = zip.folder('attachments');

  // Deep clone data to modify image URIs for app interoperability
  const jsonExport: SgpBackupData = JSON.parse(JSON.stringify(data));

  for (const exp of jsonExport.expedientes) {
    if (!exp.customFieldsJson) continue;
    try {
      const custom = JSON.parse(exp.customFieldsJson);
      const expId = exp.id || Math.floor(Math.random() * 100000);

      // 1. Imagen del Oficio
      if (custom.imagenOficioUri) {
        let base64Data = '';
        let ext = 'jpg';

        if (custom.imagenOficioUri.startsWith('data:image')) {
          const match = custom.imagenOficioUri.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
          if (match) {
            ext = match[1] === 'jpeg' ? 'jpg' : match[1];
            base64Data = match[2];
          }
        } else if (custom.imagenOficioUri.startsWith('app_attachment://')) {
          const stored = await sgpManager.getAttachment(custom.imagenOficioUri);
          if (stored && stored.startsWith('data:image')) {
            const match = stored.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
            if (match) {
              ext = match[1] === 'jpeg' ? 'jpg' : match[1];
              base64Data = match[2];
            }
          }
        }

        if (base64Data && attachmentsFolder) {
          const filename = `exp_${expId}_oficio.${ext}`;
          attachmentsFolder.file(filename, base64Data, { base64: true });
          custom.imagenOficioUri = `app_attachment://${filename}`;
        }
      }

      // 2. Imagen del Recibo de Elevación
      if (custom.imagenReciboUri) {
        let base64Data = '';
        let ext = 'jpg';

        if (custom.imagenReciboUri.startsWith('data:image')) {
          const match = custom.imagenReciboUri.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
          if (match) {
            ext = match[1] === 'jpeg' ? 'jpg' : match[1];
            base64Data = match[2];
          }
        } else if (custom.imagenReciboUri.startsWith('app_attachment://')) {
          const stored = await sgpManager.getAttachment(custom.imagenReciboUri);
          if (stored && stored.startsWith('data:image')) {
            const match = stored.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
            if (match) {
              ext = match[1] === 'jpeg' ? 'jpg' : match[1];
              base64Data = match[2];
            }
          }
        }

        if (base64Data && attachmentsFolder) {
          const filename = `exp_${expId}_recibo.${ext}`;
          attachmentsFolder.file(filename, base64Data, { base64: true });
          custom.imagenReciboUri = `app_attachment://${filename}`;
        }
      }

      exp.customFieldsJson = JSON.stringify(custom);
    } catch (e) {
      console.warn('Error processing attachments for expediente:', exp.id, e);
    }
  }

  // Add backup_data.json to zip
  zip.file('backup_data.json', JSON.stringify(jsonExport, null, 2));

  // Generate ZIP blob and save
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, 'SGP_CopiaCompleta.zip');
}

/**
 * Imports and unpacks "SGP_CopiaCompleta.zip", restoring backup_data.json and attachments into IndexedDB.
 */
export async function importSgpCopiaCompletaZip(file: File): Promise<{
  success: boolean;
  message: string;
  counts?: Record<string, number>;
}> {
  try {
    const zip = await JSZip.loadAsync(file);

    // Look for backup_data.json
    const backupFile = zip.file('backup_data.json');
    if (!backupFile) {
      return {
        success: false,
        message: 'El archivo ZIP no contiene el archivo requerido "backup_data.json".'
      };
    }

    const jsonText = await backupFile.async('text');
    const parsedData: SgpBackupData = JSON.parse(jsonText);

    if (!Array.isArray(parsedData.personal) || !Array.isArray(parsedData.expedientes)) {
      return {
        success: false,
        message: 'El archivo "backup_data.json" no posee la estructura válida de SisPol.'
      };
    }

    // Process attachments folder if present
    const attachmentsFolder = zip.folder('attachments');
    let importedAttachmentsCount = 0;

    if (attachmentsFolder) {
      const fileNames = Object.keys(zip.files).filter(
        (path) => path.startsWith('attachments/') && !zip.files[path].dir
      );

      for (const filePath of fileNames) {
        const fileEntry = zip.file(filePath);
        if (fileEntry) {
          const baseName = filePath.replace('attachments/', '');
          const base64 = await fileEntry.async('base64');
          const ext = baseName.split('.').pop()?.toLowerCase() || 'jpg';
          const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
          const dataUrl = `data:${mimeType};base64,${base64}`;

          // Save under both URI formats so lookup succeeds
          await sgpManager.saveAttachment(`app_attachment://${baseName}`, dataUrl, baseName, mimeType);
          await sgpManager.saveAttachment(baseName, dataUrl, baseName, mimeType);
          importedAttachmentsCount++;
        }
      }
    }

    // Restore database
    await sgpManager.restoreBackupData(parsedData);

    return {
      success: true,
      message: `Respaldo restaurado con éxito. Se importaron ${importedAttachmentsCount} archivos adjuntos.`,
      counts: {
        personal: parsedData.personal.length,
        expedientes: parsedData.expedientes.length,
        moviles: parsedData.moviles?.length || 0,
        reparaciones: parsedData.reparaciones?.length || 0,
        recargos: parsedData.recargos?.length || 0,
        charlas: parsedData.charlas?.length || 0,
        licencias: parsedData.licencias?.length || 0,
        catalogs: parsedData.dynamicCatalogs?.length || 0
      }
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error al procesar el archivo ZIP: ${err.message || 'Archivo dañado o incompatible'}`
    };
  }
}

/**
 * Export Individual JSON for any entity
 */
export function exportIndividualJson(entityName: string, items: any[]): void {
  const jsonStr = JSON.stringify(items, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  saveAs(blob, `SGP_${entityName}_${new Date().toISOString().slice(0, 10)}.json`);
}

/**
 * Export TXT report of "Personal Agrupado por Sección/Guardia"
 */
export function exportPersonalAgrupadoTxt(personalList: Personal[]): void {
  const groups: Record<string, Personal[]> = {};

  personalList.forEach((p) => {
    const grp = p.grupo || 'Sin Sección Asignada';
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(p);
  });

  let txt = `================================================================================\n`;
  txt += `POLICÍA DE LA PROVINCIA DE FORMOSA - D.D.G.P.C. / D.D.P.C.L.B.\n`;
  txt += `NÓMINA OFICIAL DE PERSONAL AGRUPADO POR SECCIÓN / GUARDIA\n`;
  txt += `Fecha de Emisión: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}\n`;
  txt += `Total de Efectivos Registrados: ${personalList.length}\n`;
  txt += `================================================================================\n\n`;

  Object.keys(groups).sort().forEach((grpName) => {
    const members = groups[grpName];
    txt += `--------------------------------------------------------------------------------\n`;
    txt += `SECCIÓN / GRUPO: ${grpName.toUpperCase()} (${members.length} Efectivos)\n`;
    txt += `--------------------------------------------------------------------------------\n`;

    members.forEach((m, idx) => {
      let custom: any = {};
      try {
        custom = m.customFieldsJson ? JSON.parse(m.customFieldsJson) : {};
      } catch (e) {
        // ignore
      }

      txt += `${String(idx + 1).padStart(2, '0')}. ${m.jerarquia.padEnd(22, ' ')} | `;
      txt += `${m.apellidoNombre.padEnd(28, ' ')} | DNI: ${m.dni.padEnd(10, ' ')} | `;
      txt += `Plaza: ${m.plaza.padEnd(8, ' ')} | Estado: ${m.disponible ? 'ACTIVO' : `NO DISPONIBLE (${m.motivoNoDisponible})`}\n`;

      if (custom.armaAsignada || custom.telefono) {
        txt += `    [Armamento: ${custom.armaAsignada || 'No asignada'} | Tel: ${custom.telefono || '-'} | Chapa: ${custom.chapaPlaca || '-'}]\n`;
      }
    });

    txt += `\n`;
  });

  txt += `================================================================================\n`;
  txt += `Fin del Reporte Oficial. Refrendado por Secretaría de Turno.\n`;
  txt += `================================================================================\n`;

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `Reporte_Personal_Por_Guardia_${new Date().toISOString().slice(0, 10)}.txt`);
}
