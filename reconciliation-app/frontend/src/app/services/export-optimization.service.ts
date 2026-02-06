import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';

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
  private worker: Worker | null = null;

  constructor() {
    this.initializeExportWorker();
  }

  /**
   * Initialise le Web Worker pour les exports optimisés
   */
  private initializeExportWorker(): void {
    try {
      if (typeof Worker !== 'undefined') {
        // Créer un worker inline pour les exports
        const workerCode = `
          // Charger XLSX dans le contexte du Worker
          try {
            importScripts('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
          } catch (e) {
            // Si l'import échoue, on remonte une erreur exploitable côté UI
            self.postMessage({ type: 'error', message: 'XLSX introuvable dans le Worker' });
          }

          self.onmessage = function(e) {
            const { type, data } = e.data;
            
            switch (type) {
              case 'export-csv':
                exportCSV(data);
                break;
              case 'export-excel':
                exportExcel(data);
                break;
              default:
                self.postMessage({ type: 'error', message: 'Type non supporté' });
            }
          };

          function exportCSV({ rows, columns, fileName, chunkSize = 10000 }) {
            const totalRows = rows.length;
            let csvContent = '';
            
            // En-tête
            csvContent += columns.join(';') + '\\r\\n';
            
            // Traitement par chunks
            for (let i = 0; i < totalRows; i += chunkSize) {
              const chunk = rows.slice(i, i + chunkSize);
              const chunkContent = chunk.map(row => {
                return columns.map(col => {
                  let val = row[col] !== undefined && row[col] !== null ? row[col].toString() : '';
                  if (val.includes('"')) val = val.replace(/"/g, '""');
                  if (val.includes(';') || val.includes('"') || val.includes('\\n')) {
                    val = '"' + val + '"';
                  }
                  return val;
                }).join(';');
              }).join('\\r\\n');
              
              csvContent += chunkContent + '\\r\\n';
              
              // Progression
              const progress = Math.min(i + chunkSize, totalRows);
              self.postMessage({
                type: 'progress',
                data: {
                  current: progress,
                  total: totalRows,
                  percentage: (progress / totalRows) * 100,
                  message: \`Export CSV: \${progress.toLocaleString()}/\${totalRows.toLocaleString()} lignes\`
                }
              });
            }
            
            self.postMessage({
              type: 'complete',
              data: {
                content: csvContent,
                fileName: fileName,
                type: 'csv'
              }
            });
          }

          function exportExcel({ rows, columns, fileName, chunkSize = 5000 }) {
            if (typeof XLSX === 'undefined') {
              self.postMessage({ type: 'error', message: 'Bibliothèque XLSX non chargée dans le Worker' });
              return;
            }
            const totalRows = rows.length;
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet([columns]);
            
            // Traitement par chunks pour éviter les problèmes de mémoire
            for (let i = 0; i < totalRows; i += chunkSize) {
              const chunk = rows.slice(i, i + chunkSize);
              const chunkData = chunk.map(row => 
                columns.map(col => row[col] !== undefined && row[col] !== null ? row[col] : '')
              );
              
              // Ajouter les données au worksheet
              XLSX.utils.sheet_add_aoa(worksheet, chunkData, { origin: -1 });
              
              // Progression
              const progress = Math.min(i + chunkSize, totalRows);
              self.postMessage({
                type: 'progress',
                data: {
                  current: progress,
                  total: totalRows,
                  percentage: (progress / totalRows) * 100,
                  message: \`Export Excel: \${progress.toLocaleString()}/\${totalRows.toLocaleString()} lignes\`
                }
              });
            }
            
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');
            
            // Générer le buffer
            const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            
            self.postMessage({
              type: 'complete',
              data: {
                buffer: buffer,
                fileName: fileName,
                type: 'xlsx'
              }
            });
          }
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
        this.setupWorkerListeners();
      }
    } catch (error) {
      console.warn('⚠️ Web Worker non disponible pour les exports:', error);
    }
  }

  /**
   * Configure les listeners du worker
   */
  private setupWorkerListeners(): void {
    if (!this.worker) return;

    this.worker.onmessage = (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'progress':
          this._exportProgress.next({
            ...data,
            isComplete: false
          });
          break;

        case 'complete':
          this.handleExportComplete(data);
          break;

        case 'error':
          this._exportProgress.next({
            current: 0,
            total: 0,
            percentage: 0,
            message: data.message,
            isComplete: true
          });
          break;
      }
    };

    this.worker.onerror = (error) => {
      console.error('❌ Erreur Web Worker export:', error);
      this._exportProgress.next({
        current: 0,
        total: 0,
        percentage: 0,
        message: 'Erreur lors de l\'export',
        isComplete: true
      });
    };
  }

  /**
   * Gère la completion de l'export
   */
  private handleExportComplete(data: any): void {
    try {
      if (data.type === 'csv') {
        // Télécharger le CSV
        const blob = new Blob([data.content], { type: 'text/csv;charset=utf-8;' });
        this.downloadFile(blob, data.fileName);
      } else if (data.type === 'xlsx') {
        // Télécharger l'Excel
        const blob = new Blob([data.buffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        this.downloadFile(blob, data.fileName);
      }

      this._exportProgress.next({
        current: data.total || 0,
        total: data.total || 0,
        percentage: 100,
        message: `✅ Export terminé: ${data.fileName}`,
        isComplete: true
      });
    } catch (error) {
      console.error('❌ Erreur lors du téléchargement:', error);
      this._exportProgress.next({
        current: 0,
        total: 0,
        percentage: 0,
        message: 'Erreur lors du téléchargement',
        isComplete: true
      });
    }
  }

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
   * Export CSV optimisé avec Web Worker
   */
  public async exportCSVOptimized(
    rows: any[], 
    columns: string[], 
    fileName: string, 
    options: ExportOptions = {}
  ): Promise<void> {
    const { chunkSize = 10000, useWebWorker = true } = options;

    if (useWebWorker && this.worker) {
      // Export avec Web Worker
      this.worker.postMessage({
        type: 'export-csv',
        data: {
          rows,
          columns,
          fileName: fileName.endsWith('.csv') ? fileName : fileName + '.csv',
          chunkSize
        }
      });
    } else {
      // Export synchrone optimisé
      await this.exportCSVSynchronous(rows, columns, fileName, chunkSize);
    }
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
    
    // En-tête
    csvContent += columns.join(';') + '\r\n';
    
    // Traitement par chunks avec progression
    for (let i = 0; i < totalRows; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const chunkContent = chunk.map(row => {
        return columns.map(col => {
          let val = row[col] !== undefined && row[col] !== null ? row[col].toString() : '';
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
   * Export Excel optimisé avec Web Worker
   */
  public async exportExcelOptimized(
    rows: any[], 
    columns: string[], 
    fileName: string, 
    options: ExportOptions = {}
  ): Promise<void> {
    const { chunkSize = 5000, useWebWorker = true, format = 'xlsx' } = options;
    const excelFormat = format === 'xls' ? 'xls' : 'xlsx';

    // Normaliser les lignes : colonnes montant/volume en nombres pour Excel
    const normalizedRows = rows.map(row => {
      const r: any = {};
      columns.forEach(col => {
        r[col] = this.cellValueForExcel(col, row[col]);
      });
      return r;
    });

    if (useWebWorker && this.worker) {
      // Export avec Web Worker
      this.worker.postMessage({
        type: 'export-excel',
        data: {
          rows: normalizedRows,
          columns,
          fileName: fileName.endsWith(`.${excelFormat}`) ? fileName : fileName + `.${excelFormat}`,
          chunkSize,
          format: excelFormat
        }
      });
    } else {
      // Export synchrone optimisé
      await this.exportExcelSynchronous(normalizedRows, columns, fileName, chunkSize, excelFormat);
    }
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
        columns.map(col => this.cellValueForExcel(col, row[col]))
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
            let val = row[col] !== undefined && row[col] !== null ? row[col].toString() : '';
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
          exportRow[col] = this.cellValueForExcel(col, row[col]);
        });
        return exportRow;
      });
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
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
  public destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
