import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import { fixCellEncoding } from '../utils/encoding-fixer';

/** Couleurs par type de commentaire pour export écarts (TRXBO/OPPART) - ARGB 8 caractères */
export const ECART_COMMENT_COLORS: Record<string, string> = {
  TSOP: 'FFFFCDD2',   // Rouge clair
  TRXSF: 'FFFFF9C4',  // Jaune clair
  Ecart: 'FFFFAB91',  // Orange clair
  RGFRAIS: 'FFB3E5FC' // Bleu clair
};

export interface ExportProgress {
  current: number;
  total: number;
  percentage: number;
  message: string;
  isComplete: boolean;
}

export interface ExportOptions {
  chunkSize?: number;
  /** @deprecated Ignoré : l’export CSV utilise le thread principal (compatible CSP stricte). */
  useWebWorker?: boolean;
  enableCompression?: boolean;
  format?: 'csv' | 'xlsx' | 'xls';
}

export interface ExportWithCommentColorsOptions {
  commentColumn?: string;
  colorMap?: Record<string, string>;
}

@Injectable({
  providedIn: 'root'
})
export class ExportOptimizationService {
  private _exportProgress = new BehaviorSubject<ExportProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    message: '',
    isComplete: false
  });

  public readonly exportProgress$ = this._exportProgress.asObservable();

  /**
   * Télécharge un fichier
   */
  private downloadFile(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export CSV par chunks sur le thread principal.
   * (Les workers via blob: URL sont incompatibles avec une CSP stricte sans worker-src/blob.)
   */
  public async exportCSVOptimized(
    rows: any[], 
    columns: string[], 
    fileName: string, 
    options: ExportOptions = {}
  ): Promise<void> {
    const { chunkSize = 10000 } = options;
    await this.exportCSVSynchronous(rows, columns, fileName, chunkSize);
  }

  /**
   * Export CSV synchrone optimisé
   */
  private async exportCSVSynchronous(
    rows: any[], 
    columns: string[], 
    fileName: string, 
    chunkSize: number
  ): Promise<void> {
    const totalRows = rows.length;
    let csvContent = '';
    
    const encodedColumns = columns.map(col => fixCellEncoding(col));
    csvContent += encodedColumns.join(';') + '\r\n';
    
    // Traitement par chunks avec progression
    for (let i = 0; i < totalRows; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const chunkContent = chunk.map(row => {
        return encodedColumns.map((col, idx) => {
          const raw = row[columns[idx]];
          let val = '';
          if (raw !== undefined && raw !== null) {
            if (typeof raw === 'object') {
              try {
                val = fixCellEncoding(JSON.stringify(raw));
              } catch {
                val = fixCellEncoding(String(raw));
              }
            } else {
              val = fixCellEncoding(String(raw));
            }
          }
          if (val.includes('"')) val = val.replace(/"/g, '""');
          if (val.includes(';') || val.includes('"') || val.includes('\n')) {
            val = '"' + val + '"';
          }
          return val;
        }).join(';');
      }).join('\r\n');
      
      csvContent += chunkContent + '\r\n';
      
      // Mettre à jour la progression
      const progress = Math.min(i + chunkSize, totalRows);
      this._exportProgress.next({
        current: progress,
        total: totalRows,
        percentage: (progress / totalRows) * 100,
        message: `Export CSV: ${progress.toLocaleString()}/${totalRows.toLocaleString()} lignes`,
        isComplete: false
      });

      // Permettre au navigateur de respirer
      if (i % (chunkSize * 5) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    // Télécharger le fichier
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadFile(blob, fileName.endsWith('.csv') ? fileName : fileName + '.csv');
    
    this._exportProgress.next({
      current: totalRows,
      total: totalRows,
      percentage: 100,
      message: `✅ Export CSV terminé: ${fileName}`,
      isComplete: true
    });
  }

  /**
   * Export Excel par chunks sur le thread principal
   */
  public async exportExcelOptimized(
    rows: any[], 
    columns: string[], 
    fileName: string, 
    options: ExportOptions = {}
  ): Promise<void> {
    const { chunkSize = 5000, format = 'xlsx' } = options;
    const excelFormat = format === 'xls' ? 'xls' : 'xlsx';
    const encodedColumns = columns.map(col => fixCellEncoding(col));

    // Normaliser les lignes : colonnes montant/volume en nombres pour Excel
    const normalizedRows = rows.map(row => {
      const r: any = {};
      columns.forEach((col, idx) => {
        const encodedCol = encodedColumns[idx];
        const base = this.serializeCellForExport(row[col]);
        r[encodedCol] = this.cellValueForExcel(encodedCol, base);
      });
      return r;
    });

    // IMPORTANT: le worker inline n'a pas accès au bundle XLSX (importScripts CDN fragile / CSP).
    // Pour fiabiliser l'export Excel, on reste sur le thread principal.
    await this.exportExcelSynchronous(normalizedRows, encodedColumns, fileName, chunkSize, excelFormat);
  }

  /**
   * Export Excel avec couleurs par type de commentaire (écarts BO / Partenaire TRXBO-OPPART).
   * Utilise ExcelJS pour appliquer un fond de cellule selon la valeur de la colonne Commentaire.
   */
  public async exportExcelWithCommentColors(
    rows: any[],
    columns: string[],
    fileName: string,
    options: ExportWithCommentColorsOptions = {}
  ): Promise<void> {
    const commentColumn = options.commentColumn ?? 'Commentaire';
    const colorMap = options.colorMap ?? ECART_COMMENT_COLORS;
    const hasCommentInColumns = columns.includes(commentColumn);

    this._exportProgress.next({
      current: 0,
      total: rows.length,
      percentage: 0,
      message: 'Préparation de l\'export avec couleurs...',
      isComplete: false
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Écarts', { views: [{ state: 'frozen', ySplit: 1 }] });

    // En-têtes
    const headerRow = worksheet.addRow(columns);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    const chunkSize = 2000;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      for (const row of chunk) {
        const rowData = columns.map(col => this.cellValueForExcel(col, row[col]));
        const excelRow = worksheet.addRow(rowData);
        if (hasCommentInColumns) {
          const commentValue = (row[commentColumn] ?? '').toString().trim();
          const argb = colorMap[commentValue] || colorMap['Ecart'] || 'FFFFFFFF';
          excelRow.eachCell((cell, colNumber) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
          });
        }
      }
      const progress = Math.min(i + chunkSize, rows.length);
      this._exportProgress.next({
        current: progress,
        total: rows.length,
        percentage: (progress / rows.length) * 100,
        message: `Export: ${progress.toLocaleString()}/${rows.length.toLocaleString()} lignes`,
        isComplete: false
      });
      if (i % (chunkSize * 2) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Largeurs colonnes
    columns.forEach((col, idx) => {
      worksheet.getColumn(idx + 1).width = Math.min( Math.max(String(col).length + 2, 12), 50 );
    });

    const finalFileName = fileName.endsWith('.xlsx') ? fileName : fileName + '.xlsx';
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    this.downloadFile(blob, finalFileName);

    this._exportProgress.next({
      current: rows.length,
      total: rows.length,
      percentage: 100,
      message: `✅ Export terminé: ${finalFileName}`,
      isComplete: true
    });
  }

  /**
   * Indique si une colonne est une colonne montant/volume (à exporter en nombre)
   */
  private isAmountColumn(col: string): boolean {
    const lower = (col || '').toLowerCase();
    const amountKeys = [
      'montant', 'amount', 'volume', 'valeur', 'value', 'somme', 'sum', 'total',
      'credit', 'crédit', 'debit', 'débit', 'transactions', 'matches', 'boonly', 'partneronly',
      'mismatches', 'totalvolume', 'totaltransactions', 'totalmatches', 'totalboonly',
      'totalpartneronly', 'totalmismatches', 'nombre', 'volume total', 'total volume'
    ];
    return amountKeys.some(k => lower === k || lower.includes(k));
  }

  /**
   * Convertit une valeur pour export Excel : nombre pour colonnes montant, sinon inchangé
   */
  private cellValueForExcel(col: string, val: any): any {
    if (val === undefined || val === null || val === '') return '';
    if (!this.isAmountColumn(col)) return val;
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/\s/g, '').replace(',', '.'));
    return !isNaN(num) ? num : val;
  }

  /**
   * XLSX attend des valeurs "feuille de calcul" (string/number/boolean/date).
   * Les objets/tableaux (souvent présents dans boData/partnerData) peuvent faire planter json_to_sheet / writeFile.
   */
  private serializeCellForExport(val: any): string | number | boolean | Date {
    if (val === undefined || val === null) return '';
    if (typeof val === 'string') return fixCellEncoding(val);
    if (typeof val === 'number' || typeof val === 'boolean') return val;
    if (val instanceof Date) return val;
    if (typeof val === 'object') {
      try {
        return fixCellEncoding(JSON.stringify(val));
      } catch {
        return fixCellEncoding(String(val));
      }
    }
    return fixCellEncoding(String(val));
  }

  /**
   * Export Excel synchrone optimisé
   */
  private async exportExcelSynchronous(
    rows: any[], 
    columns: string[], 
    fileName: string, 
    chunkSize: number,
    format: 'xlsx' | 'xls' = 'xlsx'
  ): Promise<void> {
    const totalRows = rows.length;
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([columns]);
    
    // Traitement par chunks
    for (let i = 0; i < totalRows; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const chunkData = chunk.map(row =>
        columns.map(col => {
          const base = this.serializeCellForExport(row[col]);
          return this.cellValueForExcel(col, base);
        })
      );
      
      // Ajouter les données au worksheet
      XLSX.utils.sheet_add_aoa(worksheet, chunkData, { origin: -1 });
      
      // Mettre à jour la progression
      const progress = Math.min(i + chunkSize, totalRows);
      this._exportProgress.next({
        current: progress,
        total: totalRows,
        percentage: (progress / totalRows) * 100,
        message: `Export Excel: ${progress.toLocaleString()}/${totalRows.toLocaleString()} lignes`,
        isComplete: false
      });

      // Permettre au navigateur de respirer
      if (i % (chunkSize * 3) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    // Finaliser le workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');
    
    // Télécharger le fichier
    let finalFileName: string;
    if (format === 'xls') {
      finalFileName = fileName.endsWith('.xls') ? fileName : fileName + '.xls';
      XLSX.writeFile(workbook, finalFileName, { bookType: 'biff8' });
    } else {
      finalFileName = fileName.endsWith('.xlsx') ? fileName : fileName + '.xlsx';
      XLSX.writeFile(workbook, finalFileName);
    }
    
    this._exportProgress.next({
      current: totalRows,
      total: totalRows,
      percentage: 100,
      message: `✅ Export Excel terminé: ${finalFileName}`,
      isComplete: true
    });
  }

  /**
   * Export rapide pour petits volumes (< 1000 lignes)
   */
  public exportQuick(
    rows: any[], 
    columns: string[], 
    fileName: string, 
    format: 'csv' | 'xlsx' | 'xls' = 'csv'
  ): void {
    if (format === 'csv') {
      const csvContent = [
        columns.join(';'),
        ...rows.map(row => 
          columns.map(col => {
            const raw = row[col];
            const serialized = this.serializeCellForExport(raw);
            let val = serialized !== '' ? String(serialized) : '';
            if (val.includes('"')) val = val.replace(/"/g, '""');
            if (val.includes(';') || val.includes('"') || val.includes('\n')) {
              val = '"' + val + '"';
            }
            return val;
          }).join(';')
        )
      ].join('\r\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      this.downloadFile(blob, fileName.endsWith('.csv') ? fileName : fileName + '.csv');
    } else if (format === 'xlsx' || format === 'xls') {
      const exportData = rows.map(row => {
        const exportRow: any = {};
        columns.forEach(col => {
          const base = this.serializeCellForExport(row[col]);
          exportRow[col] = this.cellValueForExcel(col, base);
        });
        return exportRow;
      });
      
      const workbook = XLSX.utils.book_new();
      let worksheet: XLSX.WorkSheet;
      try {
        worksheet = XLSX.utils.json_to_sheet(exportData);
      } catch (e) {
        console.error('❌ Erreur XLSX (json_to_sheet):', e);
        throw e;
      }
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');
      
      let finalFileName: string;
      if (format === 'xls') {
        finalFileName = fileName.endsWith('.xls') ? fileName : fileName + '.xls';
        // Pour XLS, on utilise le format BIFF8 (Excel 97-2003)
        XLSX.writeFile(workbook, finalFileName, { bookType: 'biff8' });
      } else {
        finalFileName = fileName.endsWith('.xlsx') ? fileName : fileName + '.xlsx';
        XLSX.writeFile(workbook, finalFileName);
      }
    }
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {}
}
