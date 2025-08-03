import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { EventEmitter } from 'events';

export interface ProcessingSpecification {
  id: string;
  name: string;
  filePattern: string; // Pattern pour identifier le type de fichier
  processingType: 'csv' | 'json' | 'xml' | 'excel';
  delimiter?: string; // Pour les fichiers CSV
  encoding?: string;
  mapping?: Record<string, string>; // Mapping des colonnes
  transformations?: Array<{
    type: 'format' | 'validate' | 'transform';
    field: string;
    action: string;
    params?: any;
  }>;
  outputFormat?: 'json' | 'csv' | 'database';
  outputPath?: string;
  autoProcess: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileProcessingResult {
  success: boolean;
  fileName: string;
  specificationId: string;
  processedAt: Date;
  recordsProcessed?: number;
  errors?: string[];
  outputPath?: string;
}

export class FileWatcherService extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private watchPath: string;
  private specifications: Map<string, ProcessingSpecification> = new Map();
  private processingQueue: string[] = [];
  private isProcessing = false;

  constructor(watchPath: string = './watch-folder') {
    super();
    this.watchPath = watchPath;
    this.ensureWatchDirectory();
  }

  private ensureWatchDirectory(): void {
    if (!fs.existsSync(this.watchPath)) {
      fs.mkdirSync(this.watchPath, { recursive: true });
      console.log(`Dossier de surveillance créé: ${this.watchPath}`);
    }
  }

  public startWatching(): void {
    if (this.watcher) {
      console.log('La surveillance est déjà active');
      return;
    }

    this.watcher = chokidar.watch(this.watchPath, {
      ignored: /(^|[\/\\])\../, // Ignore les fichiers cachés
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', (filePath) => {
        console.log(`Nouveau fichier détecté: ${filePath}`);
        this.handleNewFile(filePath);
      })
      .on('change', (filePath) => {
        console.log(`Fichier modifié: ${filePath}`);
        this.handleNewFile(filePath);
      })
      .on('error', (error) => {
        console.error('Erreur de surveillance:', error);
      });

    console.log(`Surveillance démarrée sur: ${this.watchPath}`);
  }

  public stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('Surveillance arrêtée');
    }
  }

  private async handleNewFile(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);
    
    // Vérifier si le fichier est en cours de traitement
    if (this.processingQueue.includes(filePath)) {
      console.log(`Fichier déjà en cours de traitement: ${fileName}`);
      return;
    }

    // Trouver la spécification correspondante
    const specification = this.findMatchingSpecification(fileName);
    if (!specification) {
      console.log(`Aucune spécification trouvée pour: ${fileName}`);
      return;
    }

    if (!specification.autoProcess) {
      console.log(`Traitement automatique désactivé pour: ${fileName}`);
      return;
    }

    // Ajouter à la queue de traitement
    this.processingQueue.push(filePath);
    this.processQueue();
  }

  private findMatchingSpecification(fileName: string): ProcessingSpecification | null {
    for (const spec of this.specifications.values()) {
      if (this.matchesPattern(fileName, spec.filePattern)) {
        return spec;
      }
    }
    return null;
  }

  private matchesPattern(fileName: string, pattern: string): boolean {
    // Support pour les patterns simples et regex
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      const regex = new RegExp(pattern.slice(1, -1));
      return regex.test(fileName);
    }
    
    // Support pour les wildcards
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(fileName);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const filePath = this.processingQueue.shift()!;
      await this.processFile(filePath);
    }

    this.isProcessing = false;
  }

  private async processFile(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);
    const specification = this.findMatchingSpecification(fileName);
    
    if (!specification) {
      console.log(`Spécification non trouvée pour: ${fileName}`);
      return;
    }

    try {
      console.log(`Traitement de: ${fileName} avec la spécification: ${specification.name}`);
      
      const result: FileProcessingResult = {
        success: false,
        fileName,
        specificationId: specification.id,
        processedAt: new Date(),
        errors: []
      };

      // Lire le fichier selon le type
      const fileContent = await this.readFile(filePath, specification);
      
      // Appliquer les transformations
      const processedData = await this.applyTransformations(fileContent, specification);
      
      // Générer la sortie
      const outputPath = await this.generateOutput(processedData, specification, fileName);
      
      result.success = true;
      result.recordsProcessed = Array.isArray(processedData) ? processedData.length : 1;
      result.outputPath = outputPath;

      // Émettre l'événement de traitement réussi
      this.emit('fileProcessed', result);
      
      console.log(`Traitement réussi: ${fileName} -> ${outputPath}`);

    } catch (error) {
      console.error(`Erreur lors du traitement de ${fileName}:`, error);
      
      const result: FileProcessingResult = {
        success: false,
        fileName,
        specificationId: specification.id,
        processedAt: new Date(),
        errors: [error instanceof Error ? error.message : String(error)]
      };

      this.emit('fileProcessed', result);
    }
  }

  private async readFile(filePath: string, specification: ProcessingSpecification): Promise<any> {
    const encoding = specification.encoding || 'utf8';
    const content = fs.readFileSync(filePath, encoding);

    switch (specification.processingType) {
      case 'csv':
        return this.parseCSV(content, specification);
      case 'json':
        return JSON.parse(content);
      case 'xml':
        // Implémentation simple pour XML
        return content;
      case 'excel':
        // Nécessiterait une bibliothèque comme xlsx
        throw new Error('Support Excel non encore implémenté');
      default:
        return content;
    }
  }

  private parseCSV(content: string, specification: ProcessingSpecification): any[] {
    const delimiter = specification.delimiter || ';';
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return [];

    const headers = lines[0].split(delimiter).map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter);
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      
      data.push(row);
    }

    return data;
  }

  private async applyTransformations(data: any, specification: ProcessingSpecification): Promise<any> {
    if (!specification.transformations) {
      return data;
    }

    let processedData = data;

    for (const transformation of specification.transformations) {
      processedData = await this.applyTransformation(processedData, transformation);
    }

    return processedData;
  }

  private async applyTransformation(data: any, transformation: any): Promise<any> {
    switch (transformation.type) {
      case 'format':
        return this.formatData(data, transformation);
      case 'validate':
        return this.validateData(data, transformation);
      case 'transform':
        return this.transformData(data, transformation);
      default:
        return data;
    }
  }

  private formatData(data: any, transformation: any): any {
    // Implémentation basique du formatage
    if (Array.isArray(data)) {
      return data.map(item => {
        if (transformation.field && item[transformation.field]) {
          // Appliquer le formatage selon l'action
          switch (transformation.action) {
            case 'uppercase':
              item[transformation.field] = item[transformation.field].toUpperCase();
              break;
            case 'lowercase':
              item[transformation.field] = item[transformation.field].toLowerCase();
              break;
            case 'trim':
              item[transformation.field] = item[transformation.field].trim();
              break;
          }
        }
        return item;
      });
    }
    return data;
  }

  private validateData(data: any, transformation: any): any {
    // Implémentation basique de validation
    if (Array.isArray(data)) {
      return data.filter(item => {
        if (transformation.field && item[transformation.field]) {
          switch (transformation.action) {
            case 'notEmpty':
              return item[transformation.field].trim() !== '';
            case 'isNumber':
              return !isNaN(Number(item[transformation.field]));
            case 'isEmail':
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              return emailRegex.test(item[transformation.field]);
          }
        }
        return true;
      });
    }
    return data;
  }

  private transformData(data: any, transformation: any): any {
    // Implémentation basique de transformation
    if (Array.isArray(data)) {
      return data.map(item => {
        if (transformation.field && item[transformation.field]) {
          switch (transformation.action) {
            case 'replace':
              const { search, replace } = transformation.params || {};
              if (search && replace) {
                item[transformation.field] = item[transformation.field].replace(new RegExp(search, 'g'), replace);
              }
              break;
            case 'extract':
              const { regex, group } = transformation.params || {};
              if (regex) {
                const match = item[transformation.field].match(new RegExp(regex));
                if (match && match[group || 1]) {
                  item[transformation.field] = match[group || 1];
                }
              }
              break;
          }
        }
        return item;
      });
    }
    return data;
  }

  private async generateOutput(data: any, specification: ProcessingSpecification, originalFileName: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = path.parse(originalFileName).name;
    
    let outputPath = specification.outputPath || path.join(this.watchPath, 'processed');
    
    // Créer le dossier de sortie s'il n'existe pas
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    switch (specification.outputFormat) {
      case 'json':
        const jsonPath = path.join(outputPath, `${baseName}_processed_${timestamp}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
        return jsonPath;
      
      case 'csv':
        const csvPath = path.join(outputPath, `${baseName}_processed_${timestamp}.csv`);
        const csvContent = this.convertToCSV(data, specification.delimiter || ';');
        fs.writeFileSync(csvPath, csvContent);
        return csvPath;
      
      case 'database':
        // Ici on pourrait insérer dans la base de données
        console.log('Insertion en base de données non encore implémentée');
        return '';
      
      default:
        const defaultPath = path.join(outputPath, `${baseName}_processed_${timestamp}.txt`);
        fs.writeFileSync(defaultPath, JSON.stringify(data, null, 2));
        return defaultPath;
    }
  }

  private convertToCSV(data: any[], delimiter: string = ';'): string {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvLines = [headers.join(delimiter)];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Échapper les valeurs contenant le délimiteur
        return value.toString().includes(delimiter) ? `"${value}"` : value;
      });
      csvLines.push(values.join(delimiter));
    }

    return csvLines.join('\n');
  }

  // Méthodes publiques pour gérer les spécifications
  public addSpecification(specification: ProcessingSpecification): void {
    this.specifications.set(specification.id, specification);
    console.log(`Spécification ajoutée: ${specification.name}`);
  }

  public updateSpecification(id: string, specification: Partial<ProcessingSpecification>): boolean {
    const existing = this.specifications.get(id);
    if (!existing) {
      return false;
    }

    const updated = { ...existing, ...specification, updatedAt: new Date() };
    this.specifications.set(id, updated);
    console.log(`Spécification mise à jour: ${updated.name}`);
    return true;
  }

  public removeSpecification(id: string): boolean {
    const removed = this.specifications.delete(id);
    if (removed) {
      console.log(`Spécification supprimée: ${id}`);
    }
    return removed;
  }

  public getSpecifications(): ProcessingSpecification[] {
    return Array.from(this.specifications.values());
  }

  public getSpecification(id: string): ProcessingSpecification | undefined {
    return this.specifications.get(id);
  }

  public getWatchPath(): string {
    return this.watchPath;
  }

  public getProcessingStatus(): { isProcessing: boolean; queueLength: number } {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.processingQueue.length
    };
  }
} 