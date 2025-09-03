import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';
import { ReconciliationService } from '../../services/reconciliation.service';
import { PopupService } from '../../services/popup.service';
import { AutoProcessingService } from '../../services/auto-processing.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-reconciliation-launcher',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reconciliation-launcher-container">
      <div class="header">
        <h2>🔄 Réconciliation de Données</h2>
        <p class="description">Choisissez votre mode de réconciliation préféré</p>
      </div>

      <!-- Zone de téléversement des fichiers -->
      <div class="file-upload-section">
        <div class="file-zone bo-file">
          <h3>📁 Fichier BO</h3>
          <div class="file-drop-zone" 
               [class.has-file]="boFile"
               (click)="selectBoFile()"
               (dragover)="onDragOver($event)"
               (drop)="onDrop($event, 'bo')">
            <div *ngIf="!boFile" class="upload-placeholder">
              <i class="fas fa-cloud-upload-alt"></i>
              <p>Cliquez ou glissez-déposez votre fichier BO</p>
            </div>
            <div *ngIf="boFile" class="file-info">
              <i class="fas fa-file-csv"></i>
              <p>{{ boFile.name }}</p>
              <button class="remove-file-btn" (click)="removeFile('bo')">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          <input id="boFileInput" type="file" 
                 accept=".csv,.xlsx,.xls" 
                 (change)="onFileSelected($event, 'bo')" 
                 style="display: none;">
        </div>

        <div class="file-zone partner-file">
          <h3>📁 Fichier Partenaire</h3>
          <div class="file-drop-zone" 
               [class.has-file]="partnerFile"
               (click)="selectPartnerFile()"
               (dragover)="onDragOver($event)"
               (drop)="onDrop($event, 'partner')">
            <div *ngIf="!partnerFile" class="upload-placeholder">
              <i class="fas fa-cloud-upload-alt"></i>
              <p>Cliquez ou glissez-déposez votre fichier Partenaire</p>
            </div>
            <div *ngIf="partnerFile" class="file-info">
              <i class="fas fa-file-csv"></i>
              <p>{{ partnerFile.name }}</p>
              <button class="remove-file-btn" (click)="removeFile('partner')">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          <input id="partnerFileInput" type="file" 
                 accept=".csv,.xlsx,.xls" 
                 (change)="onFileSelected($event, 'partner')" 
                 style="display: none;">
        </div>
      </div>

      <!-- Options de réconciliation -->
      <div class="reconciliation-options">
        <h3>🎯 Choisissez votre mode de réconciliation</h3>
        
        <div class="options-grid">
          <!-- Option 1: Manuel -->
          <div class="option-card" 
               [class.selected]="selectedMode === 'manual'"
               (click)="$event.stopPropagation()">
            <div class="option-header">
              <i class="fas fa-hand-paper"></i>
              <h4>Mode Manuel</h4>
            </div>
            <div class="option-description">
              <p>Vous sélectionnez manuellement les colonnes clés et les colonnes à comparer.</p>
              <ul>
                <li>Contrôle total sur la configuration</li>
                <li>Idéal pour des réconciliations spécifiques</li>
                <li>Configuration étape par étape</li>
              </ul>
            </div>
            <button class="select-option-btn" 
                    [class.active]="selectedMode === 'manual'"
                    (click)="selectMode('manual')">
              Choisir ce mode
            </button>
          </div>

          <!-- Option 2: Assisté -->
          <div class="option-card" [class.selected]="selectedMode === 'assisted'">
            <div class="option-header">
              <i class="fas fa-magic"></i>
              <h4>Mode Assisté</h4>
            </div>
            <div class="option-description">
              <p>Le système analyse vos fichiers et suggère les meilleures clés de réconciliation.</p>
              <ul>
                <li>Analyse automatique des correspondances</li>
                <li>Suggestions intelligentes</li>
                <li>Validation avant exécution</li>
              </ul>
            </div>
            <button class="select-option-btn" 
                    [disabled]="!canProceed"
                    (click)="selectMode('assisted')">
              Choisir ce mode
            </button>
          </div>

          <!-- Option 3: Magique -->
          <div class="option-card" [class.selected]="selectedMode === 'magic'">
            <div class="option-header">
              <i class="fas fa-wand-magic-sparkles"></i>
              <h4>Mode Magique</h4>
            </div>
            <div class="option-description">
              <p>Réconciliation en un clic ! Le système trouve automatiquement les meilleures clés et lance la réconciliation.</p>
              <ul>
                <li>Configuration automatique</li>
                <li>Lancement immédiat</li>
                <li>Résultats rapides</li>
              </ul>
            </div>
            <button class="select-option-btn magic-btn" 
                    [disabled]="!canProceed"
                    (click)="selectMode('magic')">
              🚀 Lancer la Réconciliation Magique
            </button>
          </div>
        </div>
      </div>

      <!-- Bouton de progression -->
      <div class="proceed-section" *ngIf="selectedMode && selectedMode !== 'magic'">
        <button class="proceed-btn" 
                [disabled]="selectedMode !== 'manual' && !canProceed"
                (click)="proceedWithSelectedMode()">
          <i class="fas fa-arrow-right"></i>
          Continuer avec le mode {{ getModeDisplayName(selectedMode) }}
        </button>
      </div>

      <!-- Bouton de réinitialisation -->
      <div class="reset-section">
        <button class="reset-btn" 
                [disabled]="!hasDataToReset"
                (click)="resetData()"
                title="Réinitialiser tous les fichiers et données">
          <i class="fas fa-trash-alt"></i>
          Réinitialiser les données
        </button>
      </div>


    </div>
  `,
  styleUrls: ['./reconciliation-launcher.component.scss']
})
export class ReconciliationLauncherComponent implements OnInit, OnDestroy {
  boFile: File | null = null;
  partnerFile: File | null = null;
  selectedMode: 'manual' | 'assisted' | 'magic' | null = 'manual';
  isLoading: boolean = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private appStateService: AppStateService,
    private reconciliationService: ReconciliationService,
    private popupService: PopupService,
    private autoProcessingService: AutoProcessingService
  ) {}

  ngOnInit(): void {
    // Vérifier s'il y a des fichiers déjà chargés dans l'état
    const existingFiles = this.appStateService.getUploadedFiles();
    if (existingFiles.boFile) {
      this.boFile = existingFiles.boFile;
    }
    if (existingFiles.partnerFile) {
      this.partnerFile = existingFiles.partnerFile;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  get canProceed(): boolean {
    return !!(this.boFile && this.partnerFile);
  }

  // Méthodes de gestion des fichiers
  selectBoFile(): void {
    const input = document.querySelector('#boFileInput') as HTMLInputElement;
    if (input) input.click();
  }

  selectPartnerFile(): void {
    const input = document.querySelector('#partnerFileInput') as HTMLInputElement;
    if (input) input.click();
  }

  onFileSelected(event: any, type: 'bo' | 'partner'): void {
    const file = event.target.files[0];
    if (file) {
      if (type === 'bo') {
        this.boFile = file;
      } else {
        this.partnerFile = file;
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent, type: 'bo' | 'partner'): void {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (type === 'bo') {
        this.boFile = file;
      } else {
        this.partnerFile = file;
      }
    }
  }

  removeFile(type: 'bo' | 'partner'): void {
    if (type === 'bo') {
      this.boFile = null;
    } else {
      this.partnerFile = null;
    }
  }

  // Méthodes de sélection du mode
  selectMode(mode: 'manual' | 'assisted' | 'magic'): void {
    console.log('🎯 Mode sélectionné:', mode);
    this.selectedMode = mode;

    // Si le mode magique est sélectionné, lancer immédiatement
    if (mode === 'magic') {
      this.launchMagicReconciliation();
    }
  }

  getModeDisplayName(mode: string): string {
    const names = {
      'manual': 'Manuel',
      'assisted': 'Assisté',
      'magic': 'Magique'
    };
    return names[mode as keyof typeof names] || mode;
  }

  // Méthodes de progression
  proceedWithSelectedMode(): void {
    if (!this.selectedMode) {
      return;
    }

    // Pour le mode manuel, permettre de continuer même sans fichiers
    if (this.selectedMode === 'manual') {
      // Sauvegarder les fichiers dans l'état s'ils existent
      if (this.boFile && this.partnerFile) {
        this.appStateService.setUploadedFiles({
          boFile: this.boFile,
          partnerFile: this.partnerFile
        });
      }
      this.router.navigate(['/column-selection']);
      return;
    }

    // Pour les autres modes, vérifier que les fichiers sont chargés
    if (!this.canProceed) {
      return;
    }

    // Sauvegarder les fichiers dans l'état
    this.appStateService.setUploadedFiles({
      boFile: this.boFile!,
      partnerFile: this.partnerFile!
    });

    // Naviguer selon le mode sélectionné
    switch (this.selectedMode) {
      case 'assisted':
        this.router.navigate(['/column-selection'], { queryParams: { mode: 'assisted' } });
        break;
      default:
        break;
    }
  }

  // Méthode pour la réconciliation magique
  private async launchMagicReconciliation(): Promise<void> {
    if (!this.canProceed) {
      this.popupService.showWarning('Veuillez sélectionner les deux fichiers avant de lancer la réconciliation magique.');
      return;
    }

    this.isLoading = true;

    console.log('🚀 Lancement de la réconciliation magique (flux robuste)...');

    // Sauvegarder les fichiers dans l'état
    this.appStateService.setUploadedFiles({
      boFile: this.boFile!,
      partnerFile: this.partnerFile!
    });

    // Récupérer les modèles et leurs règles de traitement
    console.log('🔍 Récupération des modèles et règles de traitement...');
    let columnProcessingRules: any[] = [];
    
    try {
      const models = await this.autoProcessingService.getAllModels();
      
      // Trouver les modèles correspondants aux fichiers
      const boModel = models.find(m => 
        m.fileType === 'bo' && 
        this.boFile?.name.match(new RegExp(m.filePattern.replace('*', '.*')))
      );
      
      const partnerModel = models.find(m => 
        m.fileType === 'partner' && 
        this.partnerFile?.name.match(new RegExp(m.filePattern.replace('*', '.*')))
      );
      
      console.log('📋 Modèle BO trouvé:', boModel?.name);
      console.log('📋 Modèle Partenaire trouvé:', partnerModel?.name);
      
      // Récupérer les règles de traitement
      if (boModel?.modelId) {
        try {
          const boRules = await this.autoProcessingService.getColumnProcessingRules(boModel.modelId);
          console.log('🔧 Règles BO récupérées:', boRules.length);
          columnProcessingRules.push(...boRules);
        } catch (error) {
          console.warn('⚠️ Erreur lors de la récupération des règles BO:', error);
        }
      }
      
      if (partnerModel?.modelId) {
        try {
          const partnerRules = await this.autoProcessingService.getColumnProcessingRules(partnerModel.modelId);
          console.log('🔧 Règles Partenaire récupérées:', partnerRules.length);
          columnProcessingRules.push(...partnerRules);
        } catch (error) {
          console.warn('⚠️ Erreur lors de la récupération des règles Partenaire:', error);
        }
      }
      
      console.log(`✅ ${columnProcessingRules.length} règles de traitement prêtes à appliquer`);
      if (columnProcessingRules.length > 0) {
        console.log('📋 Règles de traitement à appliquer:');
        columnProcessingRules.forEach((rule, index) => {
          console.log(`  ${index + 1}. Colonne: ${rule.sourceColumn}`);
          console.log(`     - Supprimer caractères spéciaux: ${rule.removeSpecialChars}`);
          console.log(`     - Nettoyer espaces: ${rule.trimSpaces}`);
          console.log(`     - Majuscules: ${rule.toUpperCase}`);
          console.log(`     - Minuscules: ${rule.toLowerCase}`);
          console.log(`     - Supprimer accents: ${rule.removeAccents}`);
        });
      }
    } catch (error) {
      console.warn('⚠️ Erreur lors de la récupération des modèles:', error);
      // Fallback: règles par défaut
      columnProcessingRules = [
        {
          sourceColumn: 'Numéro Trans GU',
          removeSpecialChars: true,
          trimSpaces: true,
          toUpperCase: false,
          toLowerCase: false,
          removeAccents: false
        }
      ];
    }

    // Créer un FormData avec les fichiers
    const formData = new FormData();
    formData.append('boFile', this.boFile!);
    formData.append('partnerFile', this.partnerFile!);

    try {
      // Étape 1: Analyse des clés de réconciliation
      console.log('🔍 Étape 1: Analyse des clés de réconciliation...');
      const analysisResponse = await this.reconciliationService.analyzeReconciliationKeys(formData).toPromise();
      
      if (!analysisResponse || !analysisResponse.suggestions || analysisResponse.suggestions.length === 0) {
        throw new Error('Aucune suggestion de clé trouvée lors de l\'analyse');
      }
      
             // Vérifier d'abord si la colonne CLE existe dans les deux fichiers (meilleure option connue)
       const hasCLE = analysisResponse.suggestions.some(suggestion => 
         suggestion.boColumn === 'CLE' || suggestion.partnerColumn === 'CLE'
       );
       
       console.log(`🔍 Vérification de la clé CLE: ${hasCLE ? 'Trouvée' : 'Non trouvée dans les suggestions'}`);
       
       // Prendre la meilleure suggestion basée sur le score de confiance
       const bestSuggestion = analysisResponse.suggestions.reduce((best, current) => 
         (current.confidence || current.confidenceScore || 0) > (best.confidence || best.confidenceScore || 0) ? current : best
       );
      
             console.log('🎯 Meilleure suggestion trouvée:', bestSuggestion);
       console.log('📊 Toutes les suggestions d\'analyse:', analysisResponse.suggestions);
       console.log('📊 Réponse complète du backend:', analysisResponse);
       console.log('📊 Nombre total de suggestions:', analysisResponse.suggestions?.length);
       
              // Afficher toutes les suggestions avec leurs scores
       if (analysisResponse.suggestions) {
         analysisResponse.suggestions.forEach((suggestion, index) => {
           console.log(`📊 Suggestion ${index + 1}:`, {
             boColumn: suggestion.boColumn,
             partnerColumn: suggestion.partnerColumn,
             confidence: suggestion.confidence || suggestion.confidenceScore,
             isCLE: suggestion.boColumn === 'CLE' || suggestion.partnerColumn === 'CLE'
           });
         });
       }
       
       // Étape 2: Décision intelligente basée sur les meilleures pratiques
       const confidence = bestSuggestion.confidence || bestSuggestion.confidenceScore || 0;
       console.log(`🎯 Meilleure clé détectée: ${bestSuggestion.boColumn} ↔ ${bestSuggestion.partnerColumn} (confiance: ${(confidence * 100).toFixed(1)}%)`);
       
       // Vérifier s'il y a une transformation disponible pour améliorer la correspondance
       let finalBoKey = bestSuggestion.boColumn;
       let finalPartnerKey = bestSuggestion.partnerColumn;
       let transformationToApply = bestSuggestion.transformation;
       
       console.log(`🔍 Transformation disponible:`, transformationToApply ? transformationToApply.description : 'Aucune');
       
       // Si CLE n'est pas dans les suggestions mais qu'on sait qu'elle existe, l'utiliser
       if (!hasCLE && confidence < 0.85) {
         console.log('⚠️ Confiance modérée et CLE non détectée - vérification des en-têtes de fichiers...');
         
         // Vérifier si CLE existe dans les deux fichiers en lisant les en-têtes
         const boHeaders = await this.getFileHeaders(this.boFile!);
         const partnerHeaders = await this.getFileHeaders(this.partnerFile!);
         
         if (boHeaders.includes('CLE') && partnerHeaders.includes('CLE')) {
           console.log('✅ CLE trouvée dans les deux fichiers - utilisation prioritaire');
           finalBoKey = 'CLE';
           finalPartnerKey = 'CLE';
           transformationToApply = null; // Pas de transformation pour CLE
         } else {
           console.log('❌ CLE non trouvée dans les fichiers');
         }
       }
       
       // Test intelligent avec différents formats pour améliorer la correspondance
       // Toujours essayer d'améliorer, même avec une confiance élevée
       console.log('🔍 Test de formatage intelligent pour améliorer la correspondance...');
       const bestFormattedMatch = await this.testFormattingForBetterMatch(
         this.boFile!,
         this.partnerFile!,
         finalBoKey,
         finalPartnerKey,
         bestSuggestion
       );
       
       if (bestFormattedMatch) {
         console.log('✅ Meilleur match trouvé avec formatage:', bestFormattedMatch);
         finalBoKey = bestFormattedMatch.boKey;
         finalPartnerKey = bestFormattedMatch.partnerKey;
         transformationToApply = bestFormattedMatch.transformation;
       }
       
       // Logique stricte : besoin d'une confiance >70% pour la réconciliation
       if (confidence < 0.70) {
         console.log('🔍 Confiance insuffisante (<70%), tentative d\'amélioration agressive...');
         console.log('🚨 APPEL DE findImprovedMatch - Test spécifique IDTransaction ↔ Id');
         
         // Essayer d'autres stratégies de correspondance
         const improvedMatch = await this.findImprovedMatch(analysisResponse.suggestions);
         
         if (improvedMatch && improvedMatch.confidence >= 0.70) {
           console.log('✅ Correspondance améliorée trouvée avec confiance suffisante:', improvedMatch);
           finalBoKey = improvedMatch.boKey;
           finalPartnerKey = improvedMatch.partnerKey;
           transformationToApply = improvedMatch.transformation;
         } else {
           console.warn('⚠️ Aucune amélioration suffisante trouvée (confiance <70%)');
           this.popupService.showWarning(`Échec de la détection automatique : Confiance insuffisante (${(confidence * 100).toFixed(1)}%). Une confiance >70% est requise. Veuillez utiliser le Mode Assisté pour choisir les clés manuellement.`);
           this.isLoading = false;
           return;
         }
       }
       
       console.log(`✅ Utilisation de la clé: ${finalBoKey} ↔ ${finalPartnerKey}`);
       
       // Créer la configuration de réconciliation
       const config: any = {
         boFile: this.boFile,
         partnerFile: this.partnerFile,
         boReconciliationKey: finalBoKey,
         partnerReconciliationKey: finalPartnerKey,
         additionalKeys: [],
         tolerance: 0.01,
         transformation: transformationToApply
       };
        
               console.log('⚙️ Configuration créée:', config);
       
       // Appliquer la transformation si nécessaire avant la réconciliation
       if (transformationToApply) {
         console.log('🔧 Application de la transformation avant réconciliation...');
         console.log(`📋 Type de transformation: ${transformationToApply.type}`);
         console.log(`📋 Description: ${transformationToApply.description}`);
         
         const transformedData = await this.applyTransformationToFile(
           this.boFile!,
           finalBoKey,
           transformationToApply
         );
         config.boFileContent = transformedData;
         console.log('✅ Transformation appliquée aux données BO');
         
         // Afficher quelques exemples de transformation
         if (transformedData.length > 0) {
           const sampleOriginal = await this.readFileContent(this.boFile!);
           console.log('🔍 Exemples de transformations:');
           for (let i = 0; i < Math.min(3, transformedData.length); i++) {
             const original = sampleOriginal[i][finalBoKey];
             const transformed = transformedData[i][finalBoKey];
             console.log(`  "${original}" → "${transformed}"`);
           }
           
           // Afficher des statistiques de formatage
           if (transformationToApply && transformationToApply.type === 'format') {
             console.log(`📊 Formatage appliqué: ${transformationToApply.format}`);
             console.log(`🎯 Amélioration de correspondance détectée automatiquement`);
           }
         }
       }
       
       // Appliquer les règles de traitement des colonnes aux données
       console.log('🔧 Application des règles de traitement des colonnes...');
       let processedBoData = await this.readFileContent(this.boFile!);
       let processedPartnerData = await this.readFileContent(this.partnerFile!);
       
       if (columnProcessingRules.length > 0) {
         console.log('📋 Application des règles de traitement...');
         
         // Appliquer les règles aux données BO
         processedBoData = this.applyColumnProcessingRules(processedBoData, columnProcessingRules);
         console.log('✅ Règles appliquées aux données BO');
         
         // Appliquer les règles aux données Partenaire
         processedPartnerData = this.applyColumnProcessingRules(processedPartnerData, columnProcessingRules);
         console.log('✅ Règles appliquées aux données Partenaire');
         
         // Afficher quelques exemples de transformation
         console.log('🔍 Exemples de transformations appliquées:');
         const originalBoData = await this.readFileContent(this.boFile!);
         const originalPartnerData = await this.readFileContent(this.partnerFile!);
         
         for (let i = 0; i < Math.min(3, processedBoData.length); i++) {
           columnProcessingRules.forEach(rule => {
             const originalBoValue = originalBoData[i][rule.sourceColumn];
             const processedBoValue = processedBoData[i][rule.sourceColumn];
             const originalPartnerValue = originalPartnerData[i][rule.sourceColumn];
             const processedPartnerValue = processedPartnerData[i][rule.sourceColumn];
             
             if (originalBoValue !== processedBoValue) {
               console.log(`  BO "${originalBoValue}" → "${processedBoValue}"`);
             }
             if (originalPartnerValue !== processedPartnerValue) {
               console.log(`  Partner "${originalPartnerValue}" → "${processedPartnerValue}"`);
             }
           });
         }
       }
       
       // Lancer la réconciliation avec les données traitées
       let reconciliationResponse;
       console.log('🚀 Lancement de la réconciliation avec données traitées...');
       
       const reconciliationRequest = {
         boFileContent: processedBoData,
         partnerFileContent: processedPartnerData,
         boKeyColumn: finalBoKey,
         partnerKeyColumn: finalPartnerKey,
         comparisonColumns: [],
         additionalKeys: [],
         tolerance: 0.01
       };
       
       reconciliationResponse = await this.reconciliationService.reconcile(reconciliationRequest).toPromise();
         
         if (reconciliationResponse) {
           console.log('✅ Réconciliation terminée avec succès:', reconciliationResponse);
           
           // Stocker les résultats dans l'état et naviguer directement vers les résultats
           this.appStateService.setReconciliationResults(reconciliationResponse);
           this.router.navigate(['/results']);
        } else {
           throw new Error('Aucun résultat reçu lors de la réconciliation');
         }
       
     } catch (error) {
       console.error('❌ Erreur lors du démarrage du mode magique:', error);
       this.popupService.showError('Erreur lors du démarrage du mode magique: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
        this.isLoading = false;
      }
  }


   
   // Méthode pour lire les en-têtes d'un fichier
   private getFileHeaders(file: File): Promise<string[]> {
     return new Promise((resolve, reject) => {
       const reader = new FileReader();
       reader.onload = (e) => {
         try {
           const content = e.target?.result as string;
           const lines = content.split('\n');
           const firstLine = lines[0];
           
           // Détecter le séparateur
           let separator = ',';
           if (firstLine.includes(';')) {
             separator = ';';
           }
           
           const headers = firstLine.split(separator).map(h => h.trim().replace(/"/g, ''));
           resolve(headers);
         } catch (error) {
           reject(error);
         }
       };
       reader.onerror = reject;
       reader.readAsText(file);
     });
   }
   
   // Méthode pour lire le contenu d'un fichier
   private readFileContent(file: File): Promise<Record<string, string>[]> {
     return new Promise((resolve, reject) => {
       const reader = new FileReader();
       reader.onload = (e) => {
         try {
           const content = e.target?.result as string;
           const lines = content.split('\n');
           
           // Détecter le séparateur
           let separator = ',';
           if (lines[0].includes(';')) {
             separator = ';';
           }
           
           const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
           
           // Lire les données
           const data = lines.slice(1)
             .filter(line => line.trim())
             .map(line => {
               const values = line.split(separator);
               const row: Record<string, string> = {};
               
               headers.forEach((header, index) => {
                 row[header] = values[index] ? values[index].trim().replace(/"/g, '') : '';
               });
               
               return row;
             });
           
           resolve(data);
         } catch (error) {
           reject(error);
         }
       };
       reader.onerror = reject;
       reader.readAsText(file);
     });
   }
   
   // Méthode pour tester différents formats et trouver la meilleure correspondance
   private async testFormattingForBetterMatch(
     boFile: File,
     partnerFile: File,
     boKey: string,
     partnerKey: string,
     originalSuggestion: any
   ): Promise<{ boKey: string; partnerKey: string; transformation: any; confidence: number } | null> {
     console.log('🔧 Test de formatage intelligent...');
     
     // Lire les données originales
     const boData = await this.readFileContent(boFile);
     const partnerData = await this.readFileContent(partnerFile);
     
            // Formats à tester pour améliorer la correspondance
       const formattingTests = [
         { name: 'trimSpaces', transform: this.applyTrimSpaces },
         { name: 'toLowerCase', transform: this.applyToLowerCase },
         { name: 'toUpperCase', transform: this.applyToUpperCase },
         { name: 'removeSeparators', transform: this.applyRemoveSeparators },
         { name: 'cleanAmounts', transform: this.applyCleanAmounts },
         { name: 'normalizeNumbers', transform: this.applyNormalizeNumbers },
         { name: 'removeDashesAndCommas', transform: this.applyRemoveDashesAndCommas },
         { name: 'removeSuffix_CM', transform: this.applyRemoveSuffixCM },
         { name: 'removeSuffix_MTN', transform: this.applyRemoveSuffixMTN },
         { name: 'removeSuffix_OM', transform: this.applyRemoveSuffixOM },
         { name: 'removeSpaces', transform: this.applyRemoveSpaces },
         { name: 'removeSpecialChars', transform: this.applyRemoveSpecialChars },
         { name: 'normalizeDates', transform: this.applyNormalizeDates },
         { name: 'extractNumbers', transform: this.applyExtractNumbers },
         { name: 'removeCurrencySymbols', transform: this.applyRemoveCurrencySymbols }
       ];
     
     let bestMatch = {
       boKey,
       partnerKey,
       transformation: null,
       confidence: originalSuggestion.confidence || originalSuggestion.confidenceScore || 0
     };
     
     // Tester chaque format
     for (const test of formattingTests) {
       try {
         console.log(`🔍 Test du formatage: ${test.name}`);
         
         // Appliquer le formatage aux données BO
         const formattedBoData = test.transform(boData, boKey);
         
         // Calculer la correspondance après formatage
         const matchCount = this.calculateMatchCount(formattedBoData, partnerData, boKey, partnerKey);
         const confidence = matchCount / Math.max(boData.length, partnerData.length);
         
         console.log(`📊 Formatage ${test.name}: ${matchCount} correspondances (confiance: ${(confidence * 100).toFixed(1)}%)`);
         
         if (confidence > bestMatch.confidence) {
           bestMatch = {
             boKey,
             partnerKey,
             transformation: { type: 'format', format: test.name },
             confidence
           };
           console.log(`✅ Amélioration détectée avec ${test.name}!`);
         }
         
       } catch (error) {
         console.warn(`⚠️ Erreur lors du test ${test.name}:`, error);
       }
     }
     
     // Retourner la meilleure amélioration trouvée, même si elle est minime
     if (bestMatch.confidence > (originalSuggestion.confidence || originalSuggestion.confidenceScore || 0)) {
       console.log(`🎯 Amélioration de confiance: ${((bestMatch.confidence - (originalSuggestion.confidence || originalSuggestion.confidenceScore || 0)) * 100).toFixed(1)}%`);
       return bestMatch;
     }
     
     // Si aucune amélioration, retourner quand même le meilleur match trouvé
     if (bestMatch.confidence > 0.05) { // Seuil très bas pour accepter des correspondances faibles
       console.log(`⚠️ Aucune amélioration trouvée, mais utilisation du meilleur match disponible (confiance: ${(bestMatch.confidence * 100).toFixed(1)}%)`);
       return bestMatch;
     }
     
     return null;
   }
   
   // Méthodes de formatage
   private applyTrimSpaces(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].trim() : ''
     }));
   }
   
   private applyToLowerCase(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].toLowerCase() : ''
     }));
   }
   
   private applyToUpperCase(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].toUpperCase() : ''
     }));
   }
   
   private applyRemoveSeparators(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/[,;]/g, '') : ''
     }));
   }
   
   private applyCleanAmounts(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => {
       let value = row[columnName] || '';
       // Enlever les espaces
       value = value.replace(/\s/g, '');
       // Enlever ",00" ou ",0" à la fin
       value = value.replace(/[,]00?$/, '');
       return {
         ...row,
         [columnName]: value
       };
     });
   }
   
   private applyNormalizeNumbers(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => {
       let value = row[columnName] || '';
       // Supprimer les espaces et caractères spéciaux
       value = value.replace(/[^\d.,-]/g, '');
       // Remplacer les virgules par des points
       value = value.replace(',', '.');
       return {
         ...row,
         [columnName]: value
       };
     });
   }
   
   private applyRemoveDashesAndCommas(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/[-,_]/g, '') : ''
     }));
   }
   
   private applyRemoveSuffixCM(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/_CM$/, '') : ''
     }));
   }
   
   private applyRemoveSuffixMTN(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/_MTN$/, '') : ''
     }));
   }
   
   private applyRemoveSuffixOM(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/_OM$/, '') : ''
     }));
   }

   private applyRemoveSpaces(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/\s/g, '') : ''
     }));
   }

   private applyRemoveSpecialChars(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/[^a-zA-Z0-9]/g, '') : ''
     }));
   }

   private applyNormalizeDates(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? this.normalizeDate(row[columnName]) : ''
     }));
   }

   private applyExtractNumbers(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/[^\d]/g, '') : ''
     }));
   }

   private applyRemoveCurrencySymbols(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/[€$£¥₦₨₩₪₫₭₮₯₰₱₲₳₴₵₶₷₸₹₺₻₼₽₾₿]/g, '') : ''
     }));
   }



   // Méthode pour tester des combinaisons de transformations
   private async testCombinedTransformations(
     boFile: File,
     partnerFile: File,
     boKey: string,
     partnerKey: string
   ): Promise<{ boKey: string; partnerKey: string; transformation: any; confidence: number } | null> {
     console.log('🔧 Test de combinaisons de transformations...');
     
     const boData = await this.readFileContent(boFile);
     const partnerData = await this.readFileContent(partnerFile);
     
     // Combinaisons de transformations à tester
     const combinations = [
       ['trimSpaces', 'toLowerCase', 'removeSpecialChars'],
       ['trimSpaces', 'removeSpaces', 'extractNumbers'],
       ['normalizeNumbers', 'removeCurrencySymbols', 'trimSpaces'],
       ['toUpperCase', 'removeDashesAndCommas', 'trimSpaces'],
       ['cleanAmounts', 'normalizeNumbers', 'removeSpaces']
     ];
     
     let bestCombination = null;
     let bestConfidence = 0;
     
     for (const combination of combinations) {
       console.log(`🔧 Test de la combinaison: ${combination.join(' + ')}`);
       
       // Appliquer la combinaison de transformations
       let transformedBoData = [...boData];
       let transformedPartnerData = [...partnerData];
       
       for (const transformName of combination) {
         const transformMethod = this.getTransformMethod(transformName);
         if (transformMethod) {
           transformedBoData = transformMethod(transformedBoData, boKey);
           transformedPartnerData = transformMethod(transformedPartnerData, partnerKey);
         }
       }
       
       // Calculer la confiance après transformation
       const matchCount = this.calculateMatchCount(transformedBoData, transformedPartnerData, boKey, partnerKey);
       const confidence = matchCount / Math.max(transformedBoData.length, transformedPartnerData.length);
       
       console.log(`📊 Combinaison ${combination.join(' + ')}: ${(confidence * 100).toFixed(1)}%`);
       
       if (confidence > bestConfidence) {
         bestConfidence = confidence;
         bestCombination = {
           boKey,
           partnerKey,
           transformation: { type: 'combined', transforms: combination },
           confidence
         };
       }
       
                // Si on atteint >70%, on s'arrête
         if (confidence >= 0.70) {
           console.log('🎯 Confiance >70% atteinte avec combinaison!');
           break;
         }
     }
     
     return bestCombination;
   }

   // Méthode pour obtenir une méthode de transformation par nom
   private getTransformMethod(transformName: string): any {
     const transformMethods: { [key: string]: any } = {
       'trimSpaces': this.applyTrimSpaces,
       'toLowerCase': this.applyToLowerCase,
       'toUpperCase': this.applyToUpperCase,
       'removeSeparators': this.applyRemoveSeparators,
       'cleanAmounts': this.applyCleanAmounts,
       'normalizeNumbers': this.applyNormalizeNumbers,
       'removeDashesAndCommas': this.applyRemoveDashesAndCommas,
       'removeSuffix_CM': this.applyRemoveSuffixCM,
       'removeSuffix_MTN': this.applyRemoveSuffixMTN,
       'removeSuffix_OM': this.applyRemoveSuffixOM,
       'removeSpaces': this.applyRemoveSpaces,
       'removeSpecialChars': this.applyRemoveSpecialChars,
       'normalizeDates': this.applyNormalizeDates,
       'extractNumbers': this.applyExtractNumbers,
       'removeCurrencySymbols': this.applyRemoveCurrencySymbols
     };
     
     return transformMethods[transformName];
   }

   // Méthode pour trouver des correspondances de dernier recours
   private async findLastResortMatch(boData: any[], partnerData: any[]): Promise<{ boKey: string; partnerKey: string; transformation: any; confidence: number } | null> {
     console.log('🔍 Stratégies de dernier recours...');
     
     const boHeaders = Object.keys(boData[0] || {});
     const partnerHeaders = Object.keys(partnerData[0] || {});
     
     // Stratégies de dernier recours
     const lastResortStrategies = [
       // Stratégie spécifique pour IDTransaction ↔ Id avec suppression _CM
       {
         name: 'IDTransaction ↔ Id (dernier recours)',
         test: (boCol: string, partnerCol: string) => {
           const boLower = boCol.toLowerCase();
           const partnerLower = partnerCol.toLowerCase();
           
           // Test spécifique pour IDTransaction ↔ Id
           return (boLower.includes('idtransaction') || boLower.includes('id_transaction')) && 
                  (partnerLower === 'id' || partnerLower.includes('id'));
         },
         specialTransform: 'removeSuffix_CM'
       },
       // Chercher des colonnes avec des IDs uniques
       {
         name: 'IDs uniques',
         test: (boCol: string, partnerCol: string) => {
           const boSample = boData.slice(0, 50).map(row => row[boCol]).filter(val => val && val.trim());
           const partnerSample = partnerData.slice(0, 50).map(row => row[partnerCol]).filter(val => val && val.trim());
           
           const boUnique = new Set(boSample).size;
           const partnerUnique = new Set(partnerSample).size;
           
           // Si les deux colonnes ont beaucoup de valeurs uniques, c'est probablement un ID
           return boUnique > boSample.length * 0.8 && partnerUnique > partnerSample.length * 0.8;
         }
       },
       // Chercher des colonnes avec des dates
       {
         name: 'Dates',
         test: (boCol: string, partnerCol: string) => {
           const dateKeywords = ['date', 'time', 'heure', 'timestamp'];
           const boLower = boCol.toLowerCase();
           const partnerLower = partnerCol.toLowerCase();
           return dateKeywords.some(keyword => boLower.includes(keyword) || partnerLower.includes(keyword));
         }
       },
       // Chercher des colonnes avec des montants
       {
         name: 'Montants',
         test: (boCol: string, partnerCol: string) => {
           const amountKeywords = ['montant', 'amount', 'somme', 'total', 'prix', 'price'];
           const boLower = boCol.toLowerCase();
           const partnerLower = partnerCol.toLowerCase();
           return amountKeywords.some(keyword => boLower.includes(keyword) || partnerLower.includes(keyword));
         }
       }
     ];
     
     for (const strategy of lastResortStrategies) {
       for (const boCol of boHeaders) {
         for (const partnerCol of partnerHeaders) {
           if (strategy.test(boCol, partnerCol)) {
             console.log(`🔍 Test stratégie de dernier recours "${strategy.name}": ${boCol} ↔ ${partnerCol}`);
             
             // Si c'est la stratégie spéciale IDTransaction ↔ Id, appliquer directement la transformation _CM
             if (strategy.specialTransform === 'removeSuffix_CM') {
               console.log('🔧 Application de la transformation spéciale _CM dans le dernier recours');
               
               // Appliquer la transformation _CM aux données BO
               const transformedBoData = this.applyRemoveSuffixCM(boData, boCol);
               
               // Calculer la confiance avec les données transformées
               const matchCount = this.calculateMatchCount(transformedBoData, partnerData, boCol, partnerCol);
               const confidence = matchCount / Math.max(transformedBoData.length, partnerData.length);
               
               console.log(`📊 Confiance avec transformation _CM: ${(confidence * 100).toFixed(1)}%`);
               
               if (confidence >= 0.70) {
                 console.log(`🎯 Correspondance >70% trouvée avec transformation _CM!`);
                 return {
                   boKey: boCol,
                   partnerKey: partnerCol,
                   transformation: { type: 'remove_suffix', pattern: '_CM' },
                   confidence
                 };
               }
             } else {
               // Tester avec transformations agressives pour les autres stratégies
               const result = await this.testCombinedTransformations(
                 this.boFile!,
                 this.partnerFile!,
                 boCol,
                 partnerCol
               );
               
               if (result && result.confidence >= 0.70) {
                 console.log(`🎯 Correspondance trouvée avec stratégie de dernier recours!`);
                 return result;
               }
             }
           }
         }
       }
     }
     
     return null;
   }
   
   // Méthode pour calculer le nombre de correspondances
   private calculateMatchCount(boData: Record<string, string>[], partnerData: Record<string, string>[], boKey: string, partnerKey: string): number {
     const boValues = new Set(boData.map(row => row[boKey]).filter(v => v && v.trim()));
     const partnerValues = partnerData.map(row => row[partnerKey]).filter(v => v && v.trim());
     
     return partnerValues.filter(value => boValues.has(value)).length;
   }
   
   // Méthode pour trouver une correspondance améliorée avec des stratégies avancées
   private async findImprovedMatch(suggestions: any[]): Promise<{ boKey: string; partnerKey: string; transformation: any; confidence: number } | null> {
     console.log('🚨 ===== DÉBUT findImprovedMatch =====');
     console.log('🔍 Recherche de correspondance améliorée...');
     console.log('🚨 ATTENTION: Cette méthode devrait donner 73% comme le mode assisté!');
     
     // Lire les données des deux fichiers
     const boData = await this.readFileContent(this.boFile!);
     const partnerData = await this.readFileContent(this.partnerFile!);
     
     // Obtenir les en-têtes
     const boHeaders = Object.keys(boData[0] || {});
     const partnerHeaders = Object.keys(partnerData[0] || {});
     
     console.log('📊 En-têtes BO:', boHeaders);
     console.log('📊 En-têtes Partenaire:', partnerHeaders);
     console.log('🔍 Recherche de colonnes IDTransaction et Id...');
     
     // 🚨 TEST SPÉCIFIQUE IDTransaction ↔ Id EN PREMIER (PRIORITÉ MAXIMALE)
     console.log('🚨 ===== TEST SPÉCIFIQUE IDTransaction ↔ Id (PRIORITÉ MAXIMALE) =====');
     console.log('🔍 Test spécifique pour IDTransaction ↔ Id...');
     console.log('🚨 ATTENTION: Ce test devrait donner 73% comme le mode assisté!');
     const idTransactionCol = boHeaders.find(col => col.toLowerCase().includes('idtransaction'));
     const idCol = partnerHeaders.find(col => col.toLowerCase() === 'id');
     
     console.log('🔍 Recherche des colonnes:');
     console.log('  - Colonnes BO disponibles:', boHeaders);
     console.log('  - Colonnes Partenaire disponibles:', partnerHeaders);
     console.log('  - IDTransaction trouvé:', idTransactionCol);
     console.log('  - Id trouvé:', idCol);
       
     console.log('📊 Colonnes trouvées:');
     console.log('  - IDTransaction:', idTransactionCol);
     console.log('  - Id:', idCol);
         
     // Test spécifique IDTransaction ↔ Id en PRIORITÉ
     if (idTransactionCol && idCol) {
       console.log(`🎯 Test spécifique PRIORITAIRE: ${idTransactionCol} ↔ ${idCol}`);
       
       // Afficher quelques exemples de données
       console.log('📊 Exemples de données BO:');
       const boSample = boData.slice(0, 5).map(row => row[idTransactionCol]);
       boSample.forEach((value, index) => console.log(`  ${index + 1}: "${value}"`));
       
       console.log('📊 Exemples de données Partenaire:');
       const partnerSample = partnerData.slice(0, 5).map(row => row[idCol]);
       partnerSample.forEach((value, index) => console.log(`  ${index + 1}: "${value}"`));
       
       // Test SANS transformation _CM (comme dans le mode assisté)
       const dataMatchScore = this.calculateDataMatchScore(boData, partnerData, idTransactionCol, idCol);
       
       console.log(`📊 Score IDTransaction ↔ Id SANS _CM: ${(dataMatchScore * 100).toFixed(1)}%`);
       
       // Si on atteint >70% sans transformation, c'est parfait !
       if (dataMatchScore >= 0.70) {
         console.log(`🎯 SUCCÈS! Confiance >70% atteinte SANS transformation: ${(dataMatchScore * 100).toFixed(1)}%`);
         return {
           boKey: idTransactionCol,
           partnerKey: idCol,
           transformation: null, // Pas de transformation
           confidence: dataMatchScore
         };
       }
       
       // Test AVEC transformation _CM pour comparaison
       const transformedBoData = this.applyRemoveSuffixCM(boData, idTransactionCol);
       const dataMatchScoreWithCM = this.calculateDataMatchScore(transformedBoData, partnerData, idTransactionCol, idCol);
       
       console.log(`📊 Score IDTransaction ↔ Id AVEC _CM: ${(dataMatchScoreWithCM * 100).toFixed(1)}%`);
       
       // Si on atteint >70% avec transformation, c'est parfait !
       if (dataMatchScoreWithCM >= 0.70) {
         console.log(`🎯 SUCCÈS! Confiance >70% atteinte AVEC transformation _CM: ${(dataMatchScoreWithCM * 100).toFixed(1)}%`);
         return {
           boKey: idTransactionCol,
           partnerKey: idCol,
           transformation: { type: 'remove_suffix', pattern: '_CM' },
           confidence: dataMatchScoreWithCM
         };
       }
       
       // Prendre le meilleur des deux scores même si <70%
       const bestScore = Math.max(dataMatchScore, dataMatchScoreWithCM);
       const bestTransformation = dataMatchScoreWithCM > dataMatchScore ? 
         { type: 'remove_suffix', pattern: '_CM' } : null;
       
       console.log(`📊 Meilleur score IDTransaction ↔ Id: ${(bestScore * 100).toFixed(1)}%`);
       
       // Retourner le meilleur résultat trouvé pour IDTransaction ↔ Id
       return {
         boKey: idTransactionCol,
         partnerKey: idCol,
         transformation: bestTransformation,
         confidence: bestScore
       };
     } else {
       console.log('❌ Colonnes IDTransaction ou Id non trouvées');
     }
     
     // Stratégies de correspondance avancées
     const strategies = [
       // Stratégie 1: Correspondance exacte des noms de colonnes
       {
         name: 'Correspondance exacte',
         test: (boCol: string, partnerCol: string) => boCol.toLowerCase() === partnerCol.toLowerCase(),
         priority: 10
       },
       // Stratégie 2: Correspondance partielle (contient)
       {
         name: 'Correspondance partielle',
         test: (boCol: string, partnerCol: string) => 
           boCol.toLowerCase().includes(partnerCol.toLowerCase()) || 
           partnerCol.toLowerCase().includes(boCol.toLowerCase()),
         priority: 8
       },
       // Stratégie 3: Correspondance par mots-clés
       {
         name: 'Mots-clés',
         test: (boCol: string, partnerCol: string) => {
           const keywords = ['id', 'reference', 'montant', 'amount', 'date', 'transaction', 'compte', 'account'];
           const boLower = boCol.toLowerCase();
           const partnerLower = partnerCol.toLowerCase();
           return keywords.some(keyword => boLower.includes(keyword) && partnerLower.includes(keyword));
         },
         priority: 7
       },
       // Stratégie 4: Correspondance spécifique IDTransaction ↔ Id (avec suppression _CM)
       {
         name: 'IDTransaction ↔ Id (sans _CM)',
         test: (boCol: string, partnerCol: string) => {
           const boLower = boCol.toLowerCase();
           const partnerLower = partnerCol.toLowerCase();
           
           // Test spécifique pour IDTransaction ↔ Id
           if ((boLower.includes('idtransaction') || boLower.includes('id_transaction')) && 
               (partnerLower === 'id' || partnerLower.includes('id'))) {
             return true;
           }
           
           // Test pour d'autres variations d'ID
           if ((boLower.includes('id') && boLower.includes('transaction')) && 
               (partnerLower === 'id' || partnerLower.includes('id'))) {
             return true;
           }
           
           return false;
         },
         priority: 9, // Priorité élevée car c'est souvent la bonne correspondance
         specialTransform: 'removeSuffix_CM' // Transformation spéciale à appliquer
       },
       // Stratégie 5: Correspondance par type de données
       {
         name: 'Type de données',
         test: (boCol: string, partnerCol: string) => {
           // Analyser le type de données des colonnes
           const boSample = boData.slice(0, 10).map(row => row[boCol]).filter(val => val && val.trim());
           const partnerSample = partnerData.slice(0, 10).map(row => row[partnerCol]).filter(val => val && val.trim());
           
           if (boSample.length === 0 || partnerSample.length === 0) return false;
           
           // Vérifier si les deux colonnes contiennent principalement des nombres
           const boNumeric = boSample.filter(val => !isNaN(Number(val))).length / boSample.length;
           const partnerNumeric = partnerSample.filter(val => !isNaN(Number(val))).length / partnerSample.length;
           
           return boNumeric > 0.7 && partnerNumeric > 0.7;
         },
         priority: 6
       }
     ];
     
     let bestMatch = null;
     let bestScore = 0;
     
     // Tester toutes les combinaisons de colonnes
     for (const boCol of boHeaders) {
       for (const partnerCol of partnerHeaders) {
         console.log(`🔍 Test de correspondance: ${boCol} ↔ ${partnerCol}`);
         for (const strategy of strategies) {
           const testResult = strategy.test(boCol, partnerCol);
           if (testResult) {
             console.log(`✅ Stratégie "${strategy.name}" détectée pour ${boCol} ↔ ${partnerCol}`);
             console.log(`🔍 Test ${strategy.name}: ${boCol} ↔ ${partnerCol}`);
             
             // Si c'est la stratégie spéciale IDTransaction ↔ Id, appliquer la transformation _CM
             if (strategy.specialTransform === 'removeSuffix_CM') {
               console.log('🔧 Application de la transformation spéciale: suppression _CM');
               
               // Appliquer la transformation _CM aux données BO
               const transformedBoData = this.applyRemoveSuffixCM(boData, boCol);
               
               // Calculer le score avec les données transformées
               const dataMatchScore = this.calculateDataMatchScore(transformedBoData, partnerData, boCol, partnerCol);
               const totalScore = strategy.priority * dataMatchScore;
               
               console.log(`📊 Score avec transformation _CM: ${(dataMatchScore * 100).toFixed(1)}% (total: ${totalScore.toFixed(3)})`);
               
               if (totalScore > bestScore) {
                 bestScore = totalScore;
                 bestMatch = {
                   boKey: boCol,
                   partnerKey: partnerCol,
                   transformation: { type: 'remove_suffix', pattern: '_CM' },
                   confidence: dataMatchScore // Utiliser directement le score de correspondance
                 };
                 
                 console.log(`✅ Nouvelle meilleure correspondance trouvée avec transformation _CM!`);
               }
             } else {
               // Calculer un score basé sur la stratégie et la correspondance des données
               const dataMatchScore = this.calculateDataMatchScore(boData, partnerData, boCol, partnerCol);
               const totalScore = strategy.priority * dataMatchScore;
               
               console.log(`📊 Score sans transformation: ${(dataMatchScore * 100).toFixed(1)}% (total: ${totalScore.toFixed(3)})`);
               
               if (totalScore > bestScore) {
                 bestScore = totalScore;
                 bestMatch = {
                   boKey: boCol,
                   partnerKey: partnerCol,
                   transformation: null,
                   confidence: dataMatchScore
                 };
               }
             }
           }
         }
       }
     }
     

     
     // Si on a trouvé une correspondance, essayer d'améliorer avec des transformations
     if (bestMatch && bestMatch.confidence > 0.1) {
       console.log('🔧 Tentative d\'amélioration agressive avec transformations...');
       
       // Essayer toutes les transformations possibles pour atteindre >90%
       const improvedWithTransform = await this.testFormattingForBetterMatch(
         this.boFile!,
         this.partnerFile!,
         bestMatch.boKey,
         bestMatch.partnerKey,
         { confidence: bestMatch.confidence }
       );
       
       if (improvedWithTransform && improvedWithTransform.confidence > bestMatch.confidence) {
         console.log('✅ Amélioration trouvée avec transformation');
         
         // Si on atteint >70%, c'est parfait
         if (improvedWithTransform.confidence >= 0.70) {
           console.log('🎯 Confiance >70% atteinte avec transformation!');
           return improvedWithTransform;
         }
         
         // Sinon, essayer des combinaisons de transformations
         const superImproved = await this.testCombinedTransformations(
           this.boFile!,
           this.partnerFile!,
           bestMatch.boKey,
           bestMatch.partnerKey
         );
         
         if (superImproved && superImproved.confidence >= 0.70) {
           console.log('🎯 Confiance >70% atteinte avec combinaison de transformations!');
           return superImproved;
         }
         
         return improvedWithTransform;
       }
     }
     
     // Si aucune correspondance trouvée, essayer des stratégies de dernier recours
     console.log('🔍 Tentative de stratégies de dernier recours...');
     const lastResortMatch = await this.findLastResortMatch(boData, partnerData);
     
     console.log('🚨 ===== FIN findImprovedMatch =====');
     console.log('🎯 Résultat final:', lastResortMatch || bestMatch);
     
     return lastResortMatch || bestMatch;
   }
   
   // Méthode pour calculer le score de correspondance des données (version améliorée)
   private calculateDataMatchScore(boData: any[], partnerData: any[], boCol: string, partnerCol: string): number {
     if (boData.length === 0 || partnerData.length === 0) return 0;
     
     // Utiliser TOUTES les données (comme le mode assisté)
     const boValues = boData.map(row => row[boCol]).filter(val => val && val.trim());
     const partnerValues = partnerData.map(row => row[partnerCol]).filter(val => val && val.trim());
     
     if (boValues.length === 0 || partnerValues.length === 0) return 0;
     
     // Calculer le nombre de correspondances exactes
     const boSet = new Set(boValues);
     const matches = partnerValues.filter(val => boSet.has(val)).length;
     
     // Score de base basé sur les correspondances exactes (comme le mode assisté)
     // Le mode assisté privilégie la correspondance côté BO (plus petit dataset)
     const exactMatchScore = matches / Math.min(boValues.length, partnerValues.length);
     
     // Score de similarité des noms de colonnes
     const nameSimilarity = this.calculateNameSimilarity(boCol, partnerCol);
     
     // Score de format de données
     const formatScore = this.calculateFormatCompatibility(boValues, partnerValues);
     
     // Score d'unicité
     const uniquenessScore = this.calculateUniquenessScore(boValues, partnerValues);
     
     // Score combiné (pondération similaire au mode assisté)
     const combinedScore = (
       exactMatchScore * 0.4 +      // 40% pour les correspondances exactes
       nameSimilarity * 0.2 +       // 20% pour la similarité des noms
       formatScore * 0.2 +          // 20% pour la compatibilité des formats
       uniquenessScore * 0.2        // 20% pour l'unicité
     );
     
     // Logs détaillés pour le débogage
     console.log(`🔍 Calcul de correspondance amélioré ${boCol} ↔ ${partnerCol}:`);
     console.log(`  - Total BO: ${boValues.length} valeurs`);
     console.log(`  - Total Partenaire: ${partnerValues.length} valeurs`);
     console.log(`  - Correspondances exactes: ${matches}`);
     console.log(`  - Score exact: ${(exactMatchScore * 100).toFixed(1)}%`);
     console.log(`  - Similarité des noms: ${(nameSimilarity * 100).toFixed(1)}%`);
     console.log(`  - Compatibilité format: ${(formatScore * 100).toFixed(1)}%`);
     console.log(`  - Score d'unicité: ${(uniquenessScore * 100).toFixed(1)}%`);
     console.log(`  - Score combiné: ${(combinedScore * 100).toFixed(1)}%`);
     
     return combinedScore;
   }
   
   // Méthode pour calculer la similarité des noms de colonnes
   private calculateNameSimilarity(boCol: string, partnerCol: string): number {
     const boLower = boCol.toLowerCase();
     const partnerLower = partnerCol.toLowerCase();
     
     // Correspondance exacte
     if (boLower === partnerLower) return 1.0;
     
     // Correspondance partielle
     if (boLower.includes(partnerLower) || partnerLower.includes(boLower)) return 0.8;
     
     // Mots-clés communs
     const boWords = boLower.split(/[\s_]+/);
     const partnerWords = partnerLower.split(/[\s_]+/);
     const commonWords = boWords.filter(word => partnerWords.includes(word));
     
     if (commonWords.length > 0) {
       return Math.min(0.6, commonWords.length * 0.3);
     }
     
     return 0.1;
   }
   
   // Méthode pour calculer la compatibilité des formats
   private calculateFormatCompatibility(boSample: string[], partnerSample: string[]): number {
     if (boSample.length === 0 || partnerSample.length === 0) return 0;
     
     // Analyser les formats des données
     const boFormats = this.analyzeDataFormats(boSample);
     const partnerFormats = this.analyzeDataFormats(partnerSample);
     
     // Comparer les formats
     let compatibility = 0;
     
     // Même type de données
     if (boFormats.isNumeric === partnerFormats.isNumeric) compatibility += 0.3;
     if (boFormats.isAlphanumeric === partnerFormats.isAlphanumeric) compatibility += 0.3;
     if (boFormats.hasSpecialChars === partnerFormats.hasSpecialChars) compatibility += 0.2;
     if (boFormats.avgLength === partnerFormats.avgLength) compatibility += 0.2;
     
     return Math.min(1.0, compatibility);
   }
   
   // Méthode pour analyser les formats de données
   private analyzeDataFormats(sample: string[]): any {
     const numericCount = sample.filter(val => /^\d+$/.test(val)).length;
     const alphanumericCount = sample.filter(val => /^[a-zA-Z0-9]+$/.test(val)).length;
     const specialCharsCount = sample.filter(val => /[^a-zA-Z0-9\s]/.test(val)).length;
     const avgLength = sample.reduce((sum, val) => sum + val.length, 0) / sample.length;
     
     return {
       isNumeric: numericCount / sample.length > 0.7,
       isAlphanumeric: alphanumericCount / sample.length > 0.7,
       hasSpecialChars: specialCharsCount / sample.length > 0.3,
       avgLength: Math.round(avgLength)
     };
   }
   
   // Méthode pour calculer le score d'unicité
   private calculateUniquenessScore(boSample: string[], partnerSample: string[]): number {
     const boUnique = new Set(boSample).size;
     const partnerUnique = new Set(partnerSample).size;
     
     const boUniqueness = boUnique / boSample.length;
     const partnerUniqueness = partnerUnique / partnerSample.length;
     
     // Si les deux colonnes ont une forte unicité, c'est probablement un ID
     if (boUniqueness > 0.8 && partnerUniqueness > 0.8) {
       return 0.9;
     }
     
     // Si une seule colonne a une forte unicité
     if (boUniqueness > 0.8 || partnerUniqueness > 0.8) {
       return 0.5;
     }
     
     return 0.1;
   }
   
   // Méthode helper pour normaliser les dates
   private normalizeDate(dateStr: string): string {
     if (!dateStr || typeof dateStr !== 'string') return dateStr;
     
     try {
       // Essayer de parser la date
       const date = new Date(dateStr);
       if (isNaN(date.getTime())) return dateStr;
       
       // Retourner au format ISO
       return date.toISOString().split('T')[0];
     } catch (error) {
       return dateStr;
     }
   }

   // Méthode pour appliquer une transformation aux données d'un fichier
   private applyTransformationToFile(file: File, columnName: string, transformation: any): Promise<Record<string, string>[]> {
     return new Promise((resolve, reject) => {
       const reader = new FileReader();
       reader.onload = (e) => {
         try {
           const content = e.target?.result as string;
           const lines = content.split('\n');
           
           // Détecter le séparateur
           let separator = ',';
           if (lines[0].includes(';')) {
             separator = ';';
           }
           
           const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
           
           // Trouver l'index de la colonne
           const columnIndex = headers.indexOf(columnName);
           if (columnIndex === -1) {
             reject(new Error(`Colonne ${columnName} non trouvée dans le fichier`));
             return;
           }
           
           // Appliquer la transformation aux données
           const data = lines.slice(1)
             .filter(line => line.trim())
             .map(line => {
               const values = line.split(separator);
               const row: Record<string, string> = {};
               
               headers.forEach((header, index) => {
                 let value = values[index] ? values[index].trim().replace(/"/g, '') : '';
                 
                 // Appliquer la transformation à la colonne spécifique
                 if (index === columnIndex && transformation && value) {
                   const originalValue = value;
                   
                   switch (transformation.type) {
                     case 'remove_suffix':
                       if (value.endsWith(transformation.pattern)) {
                         value = value.slice(0, -transformation.pattern.length);
                       }
                       break;
                     case 'remove_prefix':
                       if (value.startsWith(transformation.pattern)) {
                         value = value.slice(transformation.pattern.length);
                       }
                       break;
                     case 'remove_pattern':
                       const pattern = new RegExp(transformation.pattern + '$');
                       value = value.replace(pattern, '');
                       break;
                     case 'format':
                       // Appliquer les formats intelligents détectés
                       switch (transformation.format) {
                         case 'trimSpaces':
                           value = value.trim();
                           break;
                         case 'toLowerCase':
                           value = value.toLowerCase();
                           break;
                         case 'toUpperCase':
                           value = value.toUpperCase();
                           break;
                         case 'removeSeparators':
                           value = value.replace(/[,;]/g, '');
                           break;
                         case 'cleanAmounts':
                           value = value.replace(/\s/g, '').replace(/[,]00?$/, '');
                           break;
                         case 'normalizeNumbers':
                           value = value.replace(/[^\d.,-]/g, '').replace(',', '.');
                           break;
                         case 'removeDashesAndCommas':
                           value = value.replace(/[-,_]/g, '');
                           break;
                       }
                       break;
                   }
                   
                   console.log(`🔧 Transformation: "${originalValue}" → "${value}"`);
                 }
                 
                 row[header] = value;
               });
               
               return row;
             });
           
           resolve(data);
         } catch (error) {
           reject(error);
         }
       };
       reader.onerror = reject;
       reader.readAsText(file);
     });
   }

   /**
    * Applique les règles de traitement des colonnes aux données
    */
   private applyColumnProcessingRules(data: Record<string, string>[], rules: any[]): Record<string, string>[] {
     console.log('🔧 Application des règles de traitement des colonnes...');
     
     return data.map(row => {
       const processedRow = { ...row };
       
       rules.forEach(rule => {
         const columnName = rule.sourceColumn;
         if (processedRow[columnName]) {
           let value = processedRow[columnName];
           const originalValue = value;
           
           // Appliquer les transformations dans l'ordre
           if (rule.removeSpecialChars) {
             // Supprimer les caractères spéciaux autorisés (_CM, _ML, etc.)
             const allowedSuffixes = ['_CM', '_ML', '_GN', '_CI', '_BF', '_KE', '_SN', '_KN', '_BJ', '_GB'];
             allowedSuffixes.forEach(suffix => {
               value = value.replace(new RegExp(suffix, 'g'), '');
             });
           }
           
           if (rule.trimSpaces) {
             value = value.trim();
           }
           
           if (rule.toUpperCase) {
             value = value.toUpperCase();
           }
           
           if (rule.toLowerCase) {
             value = value.toLowerCase();
           }
           
           if (rule.removeAccents) {
             value = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
           }
           
           // Mettre à jour la valeur si elle a changé
           if (value !== originalValue) {
             processedRow[columnName] = value;
             console.log(`🔧 Transformation ${columnName}: "${originalValue}" → "${value}"`);
           }
         }
       });
       
       return processedRow;
     });
   }

   /**
    * Vérifie s'il y a des données à réinitialiser
    */
   get hasDataToReset(): boolean {
     return !!(this.boFile || this.partnerFile || this.selectedMode);
   }

   /**
    * Réinitialise toutes les données et fichiers
    */
   async resetData(): Promise<void> {
     // Demander confirmation à l'utilisateur
     const confirmed = await this.popupService.showConfirm(
       'Êtes-vous sûr de vouloir réinitialiser toutes les données ? Cette action ne peut pas être annulée.',
       'Confirmation de réinitialisation'
     );
     
     if (confirmed) {
       console.log('🔄 Réinitialisation des données...');
       
       // Réinitialiser les fichiers
       this.boFile = null;
       this.partnerFile = null;
       
       // Réinitialiser le mode sélectionné
       this.selectedMode = null;
       

       
       // Réinitialiser l'état de l'application
       this.appStateService.clearUploadedFiles();
       this.appStateService.clearReconciliationData();
       
       // Réinitialiser les données de réconciliation
       this.reconciliationService.clearData();
       
       // Réinitialiser les inputs de fichiers
       const boFileInput = document.getElementById('boFileInput') as HTMLInputElement;
       const partnerFileInput = document.getElementById('partnerFileInput') as HTMLInputElement;
       
       if (boFileInput) {
         boFileInput.value = '';
       }
       if (partnerFileInput) {
         partnerFileInput.value = '';
       }
       
       console.log('✅ Données réinitialisées avec succès');
       
       // Afficher un message de confirmation
       this.popupService.showSuccess('Données réinitialisées avec succès');
     }
   }


}
