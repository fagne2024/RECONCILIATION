// Web Worker pour le traitement optimisé des fichiers
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'processExcelChunk':
      processExcelChunk(data);
      break;
    case 'processCsvChunk':
      processCsvChunk(data);
      break;
    case 'normalizeData':
      normalizeData(data);
      break;
    case 'mergeColumns':
      mergeColumns(data);
      break;
    default:
      self.postMessage({ type: 'error', message: 'Type de traitement inconnu' });
  }
};

function processExcelChunk(data: any) {
  try {
    const { chunk, fileName } = data;
    const processedRows: any[] = [];
    
    // Traitement optimisé par chunk
    for (let i = 0; i < chunk.length; i++) {
      const row = chunk[i];
      const processedRow: any = {};
      
      // Traitement rapide des colonnes
      for (const key in row) {
        if (row.hasOwnProperty(key)) {
          processedRow[key] = row[key];
        }
      }
      
      processedRows.push(processedRow);
    }
    
    self.postMessage({
      type: 'excelChunkProcessed',
      data: {
        processedRows,
        fileName,
        count: processedRows.length
      }
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: `Erreur lors du traitement Excel: ${error}`
    });
  }
}

function processCsvChunk(data: any) {
  try {
    const { chunk, fileName } = data;
    const processedRows: any[] = [];
    
    // Traitement optimisé par chunk
    for (let i = 0; i < chunk.length; i++) {
      const row = chunk[i];
      const processedRow: any = {};
      
      // Traitement rapide des colonnes
      for (const key in row) {
        if (row.hasOwnProperty(key)) {
          processedRow[key] = row[key];
        }
      }
      
      processedRows.push(processedRow);
    }
    
    self.postMessage({
      type: 'csvChunkProcessed',
      data: {
        processedRows,
        fileName,
        count: processedRows.length
      }
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: `Erreur lors du traitement CSV: ${error}`
    });
  }
}

function normalizeData(data: any) {
  try {
    const { rows, allColumns } = data;
    const normalizedRows: any[] = [];
    
    // Normalisation optimisée
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const normalizedRow: any = {};
      
      for (const col of allColumns) {
        normalizedRow[col] = row[col] !== undefined ? row[col] : '';
      }
      
      normalizedRows.push(normalizedRow);
    }
    
    self.postMessage({
      type: 'dataNormalized',
      data: {
        normalizedRows,
        count: normalizedRows.length
      }
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: `Erreur lors de la normalisation: ${error}`
    });
  }
}

function mergeColumns(data: any) {
  try {
    const { rows, allColumns } = data;
    const mergedColumns = new Set<string>();
    
    // Fusion optimisée des colonnes
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      for (const key in row) {
        if (row.hasOwnProperty(key)) {
          mergedColumns.add(key);
        }
      }
    }
    
    self.postMessage({
      type: 'columnsMerged',
      data: {
        mergedColumns: Array.from(mergedColumns),
        count: mergedColumns.size
      }
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: `Erreur lors de la fusion des colonnes: ${error}`
    });
  }
} 