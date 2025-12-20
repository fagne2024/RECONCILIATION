import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { SopDocumentService } from '../../services/sop-document.service';
import { SopNodeService } from '../../services/sop-node.service';
import { PopupService } from '../../services/popup.service';

interface SOPNode {
  id: string;
  label: string;
  children?: SOPNode[];
  route?: string;
  description?: string;
}

@Component({
  selector: 'app-sop-reconciliation-trx',
  templateUrl: './sop-reconciliation-trx.component.html',
  styleUrls: ['./sop-reconciliation-trx.component.scss']
})
export class SopReconciliationTrxComponent implements OnInit {
  selectedNode: SOPNode | null = null;
  showPopup: boolean = false;
  popupNode: SOPNode | null = null;
  
  // Variables pour les opérations (maintenant gérées par les popups modernes)
  parentNodeForAdd: SOPNode | null = null;
  nodeToEdit: SOPNode | null = null;
  nodeToDelete: SOPNode | null = null;
  newLabel: string = '';
  editLabel: string = '';

  // Modal d'upload de document
  showUploadModal: boolean = false;
  uploadNodeId: string = '';
  uploadOptionType: string = '';
  selectedFile: File | null = null;
  isUploading: boolean = false;
  uploadError: string = '';
  manualText: string = '';
  showManualTextInput: boolean = false;
  isExtractingText: boolean = false;

  // Vue d'affichage du document
  showDocumentView: boolean = false;
  documentContent: string = '';
  documentTitle: string = '';
  currentOptionType: string = '';
  currentNodeId: string = '';
  safeDocumentContent: SafeHtml | null = null;

  // Modal de modification
  showEditDocumentModal: boolean = false;
  editDocumentFile: File | null = null;
  editDocumentText: string = '';
  isEditingDocument: boolean = false;

  
  // État de chargement
  isLoadingStructure: boolean = false;
  
  sopStructure: SOPNode = {
    id: 'root-trx',
    label: 'Visualisation des SOP',
    children: [
      {
        id: 'back-office-trx',
        label: 'Back Office',
        children: [
          {
            id: 'metier-trx',
            label: 'Métier',
            children: [
              { id: 'appro-client-trx', label: 'Appro client' },
              { id: 'compense-client-trx', label: 'Compense client' },
              { id: 'transfert-uv-trx', label: 'Transfert d\'UV' }
            ]
          },
          {
            id: 'classique-trx',
            label: 'Classique',
            children: [
              { id: 'appro-client-classique-trx', label: 'Appro client' },
              { id: 'compense-client-classique-trx', label: 'Compense client' },
              { id: 'transfert-classique-trx', label: 'Transfert' }
            ]
          }
        ]
      },
      {
        id: 'partenaire-trx',
        label: 'Partenaire',
        children: [
          {
            id: 'operations-partenaire',
            label: 'Opérations',
            children: [
              { id: 'depot-partenaire', label: 'Dépôt' },
              { id: 'retrait-partenaire', label: 'Retrait' },
              { id: 'virement-partenaire', label: 'Virement' }
            ]
          },
          {
            id: 'reconciliation-partenaire',
            label: 'Réconciliation',
            children: [
              { id: 'rapprochement-auto', label: 'Rapprochement automatique' },
              { id: 'rapprochement-manuel', label: 'Rapprochement manuel' },
              { id: 'ecarts-partenaire', label: 'Gestion des écarts' }
            ]
          }
        ]
      }
    ]
  };

  constructor(
    private sopDocumentService: SopDocumentService,
    private sopNodeService: SopNodeService,
    private popupService: PopupService,
    private sanitizer: DomSanitizer,
    private location: Location,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadStructure();
  }

  loadStructure(): void {
    this.isLoadingStructure = true;
    // Pour SOP TRX, on utilise une structure différente
    // On pourrait charger depuis une API différente ou utiliser la structure par défaut
    // Pour l'instant, on utilise la structure définie ci-dessus
    this.isLoadingStructure = false;
  }

  onNodeClick(node: SOPNode, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    if (node.children && node.children.length > 0) {
      // Si le nœud a des enfants, on peut afficher des détails ou naviguer
      this.selectedNode = node;
    } else {
      // Si c'est une feuille, afficher le popup avec les options
      this.popupNode = node;
      this.showPopup = true;
    }
  }

  closePopup(): void {
    this.showPopup = false;
    this.popupNode = null;
  }

  onOptionClick(option: string): void {
    if (!this.popupNode) return;
    
    // Vérifier si le document existe
    this.sopDocumentService.checkDocumentExists(this.popupNode.id, option).subscribe({
      next: (response) => {
        if (response.exists) {
          // Le document existe, récupérer son contenu et l'afficher
          this.loadDocument(this.popupNode!.id, option);
        } else {
          // Le document n'existe pas, ouvrir le modal d'upload
          this.openUploadModal(this.popupNode!.id, option);
        }
        this.closePopup();
      },
      error: (error) => {
        console.error('Erreur lors de la vérification du document:', error);
        // En cas d'erreur, ouvrir le modal d'upload
        this.openUploadModal(this.popupNode!.id, option);
        this.closePopup();
      }
    });
  }

  openUploadModal(nodeId: string, optionType: string): void {
    this.uploadNodeId = nodeId;
    this.uploadOptionType = optionType;
    this.selectedFile = null;
    this.uploadError = '';
    this.manualText = '';
    this.showManualTextInput = false;
    this.isExtractingText = false;
    this.showUploadModal = true;
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
    this.uploadNodeId = '';
    this.uploadOptionType = '';
    this.selectedFile = null;
    this.uploadError = '';
    this.manualText = '';
    this.showManualTextInput = false;
    this.isExtractingText = false;
  }

  async onFileSelected(event: Event): Promise<void> {
    console.log('📂 [FILE] Fichier sélectionné');
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      console.log('📂 [FILE] Fichier assigné:', {
        name: this.selectedFile.name,
        type: this.selectedFile.type,
        size: this.selectedFile.size
      });
      this.uploadError = '';
      this.manualText = '';
      this.showManualTextInput = false;
      
      // Essayer d'extraire le texte automatiquement
      if (this.selectedFile) {
        console.log('📂 [FILE] Déclenchement de l\'extraction automatique...');
        await this.tryExtractText();
      }
    } else {
      console.warn('⚠️ [FILE] Aucun fichier dans input.files');
    }
  }

  async tryExtractText(): Promise<void> {
    if (!this.selectedFile) {
      console.warn('⚠️ [EXTRACTION] Aucun fichier sélectionné');
      return;
    }
    
    console.log('🚀 [EXTRACTION] Début tentative extraction texte');
    console.log('📁 [EXTRACTION] Fichier:', this.selectedFile.name);
    
    this.isExtractingText = true;
    this.uploadError = '';
    
    try {
      const extractedText = await this.extractTextFromFile(this.selectedFile);
      
      console.log('✅ [EXTRACTION] Extraction terminée');
      console.log('📊 [EXTRACTION] Longueur texte extrait:', extractedText.length);
      console.log('📊 [EXTRACTION] Prévisualisation (100 premiers caractères):', extractedText.substring(0, 100));
      
      // Si l'extraction a réussi et n'est pas un message d'erreur
      const isError = extractedText.includes('non disponible') || 
                     extractedText.includes('non extrait automatiquement') ||
                     extractedText.includes('Erreur lors de l\'extraction') ||
                     extractedText.includes('nécessitent');
      
      console.log('🔍 [EXTRACTION] Est-ce une erreur?', isError);
      
      if (extractedText && !isError) {
        console.log('✅ [EXTRACTION] Extraction réussie, texte valide');
        this.manualText = extractedText;
        this.showManualTextInput = true;
      } else {
        console.warn('⚠️ [EXTRACTION] Extraction échouée ou message d\'erreur');
        // Si l'extraction a échoué, proposer la saisie manuelle
        this.showManualTextInput = true;
        if (extractedText.includes('non extrait automatiquement') || 
            extractedText.includes('non disponible')) {
          this.uploadError = 'Extraction automatique non disponible. Veuillez saisir le texte manuellement ci-dessous.';
        }
      }
    } catch (error) {
      console.error('❌ [EXTRACTION] Erreur lors de l\'extraction:', error);
      console.error('❌ [EXTRACTION] Détails:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      this.showManualTextInput = true;
      this.uploadError = 'Impossible d\'extraire le texte automatiquement. Veuillez saisir le texte manuellement.';
    } finally {
      this.isExtractingText = false;
      console.log('🏁 [EXTRACTION] Fin de la tentative d\'extraction');
    }
  }

  toggleManualTextInput(): void {
    // Cette méthode est appelée par le checkbox, donc showManualTextInput est déjà mis à jour par ngModel
    // On ne fait rien de spécial ici, juste s'assurer que le texte reste si on décoche
  }

  async uploadDocument(): Promise<void> {
    if (!this.selectedFile || !this.uploadNodeId || !this.uploadOptionType) {
      this.uploadError = 'Veuillez sélectionner un fichier';
      return;
    }

    // Utiliser le texte manuel si disponible, sinon essayer l'extraction automatique
    let extractedText = this.manualText.trim();
    
    if (!extractedText) {
      // Si pas de texte manuel, essayer l'extraction automatique
      try {
        extractedText = await this.extractTextFromFile(this.selectedFile);
        // Si c'est un message d'erreur, demander à l'utilisateur de saisir manuellement
        if (extractedText.includes('non disponible') || 
            extractedText.includes('non extrait automatiquement') ||
            extractedText.includes('Erreur lors de l\'extraction')) {
          this.uploadError = 'Veuillez saisir le texte du document manuellement dans le champ ci-dessous.';
          this.showManualTextInput = true;
          return;
        }
      } catch (error) {
        console.error('Erreur lors de l\'extraction:', error);
        this.uploadError = 'Veuillez saisir le texte du document manuellement.';
        this.showManualTextInput = true;
        return;
      }
    }

    // Si toujours pas de texte, demander à l'utilisateur
    if (!extractedText || extractedText.trim().length === 0) {
      this.uploadError = 'Veuillez saisir le texte du document ou sélectionner un fichier avec du texte extractible.';
      this.showManualTextInput = true;
      return;
    }

    this.isUploading = true;
    this.uploadError = '';

    // Uploader le document avec le texte
    this.sopDocumentService.uploadDocument(
      this.selectedFile,
      this.uploadNodeId,
      this.uploadOptionType,
      extractedText
    ).subscribe({
      next: (response) => {
        if (response.success) {
          // Afficher le document après l'upload
          this.loadDocument(this.uploadNodeId, this.uploadOptionType);
          this.closeUploadModal();
        } else {
          this.uploadError = response.error || 'Erreur lors de l\'upload';
        }
        this.isUploading = false;
      },
      error: (error) => {
        console.error('Erreur lors de l\'upload:', error);
        this.uploadError = 'Erreur lors de l\'upload du document';
        this.isUploading = false;
      }
    });
  }

  async extractTextFromFile(file: File): Promise<string> {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    console.log('🔍 [EXTRACTION] Début extraction texte');
    console.log('📄 [EXTRACTION] Nom du fichier:', file.name);
    console.log('📄 [EXTRACTION] Type MIME:', file.type);
    console.log('📄 [EXTRACTION] Taille:', file.size, 'bytes');
    console.log('📄 [EXTRACTION] fileName (lowercase):', fileName);
    console.log('📄 [EXTRACTION] fileType (lowercase):', fileType);

    // Pour les images, utiliser OCR (Tesseract.js)
    if (fileType.startsWith('image/') || fileName.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i)) {
      console.log('🖼️ [EXTRACTION] Fichier détecté comme IMAGE');
      return await this.extractTextFromImage(file);
    }
    
    // Pour les PDFs, utiliser pdf.js
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      console.log('📑 [EXTRACTION] Fichier détecté comme PDF');
      return await this.extractTextFromPdf(file);
    }

    // Pour les fichiers texte
    if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      console.log('📝 [EXTRACTION] Fichier détecté comme TEXTE');
      return await this.readTextFile(file);
    }

    // Pour les fichiers Word
    if (fileName.endsWith('.docx')) {
      console.log('📘 [EXTRACTION] Fichier détecté comme DOCX');
      return await this.extractTextFromDocx(file);
    }
    
    if (fileName.endsWith('.doc')) {
      console.log('📗 [EXTRACTION] Fichier détecté comme DOC');
      return await this.extractTextFromDoc(file);
    }

    // Pour les autres types, retourner un message
    console.warn('⚠️ [EXTRACTION] Type de fichier non reconnu');
    return 'Texte non extrait automatiquement pour ce type de fichier. Veuillez saisir le texte manuellement.';
  }

  async extractTextFromImage(file: File): Promise<string> {
    try {
      const Tesseract = (window as any).Tesseract;
      if (Tesseract) {
        const { data: { text } } = await Tesseract.recognize(file);
        return text;
      } else {
        return 'OCR non disponible. Veuillez installer Tesseract.js pour extraire le texte des images.';
      }
    } catch (error) {
      console.error('Erreur OCR:', error);
      return 'Erreur lors de l\'extraction du texte de l\'image';
    }
  }

  async extractTextFromPdf(file: File): Promise<string> {
    console.log('📑 [PDF] Début extraction PDF avec formatage');
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      console.log('📑 [PDF] pdfjsLib disponible?', !!pdfjsLib);
      
      if (pdfjsLib) {
        console.log('📑 [PDF] pdf.js trouvé, début extraction...');
        const arrayBuffer = await file.arrayBuffer();
        console.log('📑 [PDF] ArrayBuffer créé, taille:', arrayBuffer.byteLength);
        
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          console.log('📑 [PDF] Configuration du worker pdf.js');
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        
        console.log('📑 [PDF] Chargement du document PDF...');
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        console.log('📑 [PDF] PDF chargé, nombre de pages:', pdf.numPages);
        
        let htmlContent = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          console.log(`📑 [PDF] Extraction page ${i}/${pdf.numPages} avec images...`);
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          console.log(`📑 [PDF] Rendu de la page ${i} sur canvas...`);
          await page.render({
            canvasContext: context!,
            viewport: viewport
          }).promise;
          
          const pageImage = canvas.toDataURL('image/png');
          console.log(`📑 [PDF] Page ${i} convertie en image, taille: ${(pageImage.length / 1024).toFixed(2)} KB`);
          
          htmlContent += `<div class="pdf-page" style="text-align: center; margin-bottom: 30px;">
            <img src="${pageImage}" alt="Page ${i}" style="max-width: 100%; height: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 4px;" />
          </div>\n`;
        }

        const result = htmlContent.trim() || '<p>Aucun texte trouvé dans le PDF. Le document peut être une image scannée.</p>';
        console.log('📑 [PDF] Extraction terminée, HTML généré:', result.length, 'caractères');
        return result;
      } else {
        console.warn('📑 [PDF] pdf.js non disponible');
        return 'Extraction PDF non disponible. Veuillez saisir le texte manuellement ou installer pdf.js.';
      }
    } catch (error) {
      console.error('❌ [PDF] Erreur extraction PDF:', error);
      return 'Erreur lors de l\'extraction du texte du PDF. Veuillez saisir le texte manuellement.';
    }
  }

  async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  async extractTextFromDocx(file: File): Promise<string> {
    console.log('📘 [DOCX] Début extraction DOCX');
    try {
      const mammoth = (window as any).mammoth;
      if (mammoth) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        return result.value || '<p>Aucun texte trouvé dans le document Word.</p>';
      } else {
        return 'Extraction Word (.docx) non disponible. Veuillez saisir le texte manuellement ou convertir en PDF.';
      }
    } catch (error) {
      console.error('❌ [DOCX] Erreur extraction .docx:', error);
      return 'Erreur lors de l\'extraction du texte du document Word. Veuillez saisir le texte manuellement.';
    }
  }

  async extractTextFromDoc(file: File): Promise<string> {
    console.log('📗 [DOC] Format .doc non supporté');
    return 'Les fichiers .doc (ancien format Word) nécessitent une conversion. Veuillez convertir le fichier en .docx ou PDF, ou saisir le texte manuellement.';
  }

  loadDocument(nodeId: string, optionType: string): void {
    this.sopDocumentService.getDocumentContent(nodeId, optionType).subscribe({
      next: (response) => {
        if (response.exists && response.extractedText) {
          this.documentContent = response.extractedText;
          this.documentTitle = response.fileName || 'Document';
          this.currentOptionType = optionType;
          this.currentNodeId = nodeId;
          
          let formattedHtml = this.formatDocumentText(this.documentContent);
          formattedHtml = `<div class="document-wrapper" style="max-width: 100%; margin: 0 auto;">${formattedHtml}</div>`;
          
          this.safeDocumentContent = this.sanitizer.bypassSecurityTrustHtml(formattedHtml);
          this.showDocumentView = true;
        } else {
          this.openUploadModal(nodeId, optionType);
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement du document:', error);
        this.openUploadModal(nodeId, optionType);
      }
    });
  }

  closeDocumentView(): void {
    this.showDocumentView = false;
    this.documentContent = '';
    this.documentTitle = '';
    this.currentOptionType = '';
    this.currentNodeId = '';
    this.safeDocumentContent = null;
  }

  downloadDocument(): void {
    if (!this.currentNodeId || !this.currentOptionType) {
      console.error('❌ [DOWNLOAD] Impossible de télécharger: informations du document manquantes.');
      return;
    }

    this.sopDocumentService.downloadDocument(this.currentNodeId, this.currentOptionType).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = this.documentTitle || `document_${this.currentNodeId}_${this.currentOptionType}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('❌ [DOWNLOAD] Erreur lors du téléchargement:', error);
        this.popupService.showError('Erreur lors du téléchargement du document', 'Erreur de téléchargement');
      }
    });
  }

  openEditDocumentModal(): void {
    this.editDocumentFile = null;
    this.editDocumentText = this.documentContent;
    this.showEditDocumentModal = true;
  }

  closeEditDocumentModal(): void {
    this.showEditDocumentModal = false;
    this.editDocumentFile = null;
    this.editDocumentText = '';
    this.isEditingDocument = false;
  }

  onEditFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.editDocumentFile = input.files[0];
    }
  }

  async updateDocument(): Promise<void> {
    if (!this.currentNodeId || !this.currentOptionType) {
      return;
    }

    this.isEditingDocument = true;

    try {
      let extractedText = this.editDocumentText;
      
      if (this.editDocumentFile) {
        try {
          const extracted = await this.extractTextFromFile(this.editDocumentFile);
          if (extracted && 
              !extracted.includes('non disponible') && 
              !extracted.includes('non extrait automatiquement') &&
              !extracted.includes('Erreur lors de l\'extraction')) {
            extractedText = extracted;
          }
        } catch (error) {
          console.error('Erreur lors de l\'extraction:', error);
        }
      }

      this.sopDocumentService.updateDocument(
        this.currentNodeId,
        this.currentOptionType,
        this.editDocumentFile || undefined,
        extractedText
      ).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadDocument(this.currentNodeId, this.currentOptionType);
            this.closeEditDocumentModal();
          } else {
            this.popupService.showError(response.error || 'Erreur lors de la modification', 'Erreur de modification');
          }
          this.isEditingDocument = false;
        },
        error: (error) => {
          console.error('Erreur lors de la modification:', error);
          this.popupService.showError('Erreur lors de la modification du document', 'Erreur de modification');
          this.isEditingDocument = false;
        }
      });
    } catch (error) {
      console.error('Erreur:', error);
      this.isEditingDocument = false;
    }
  }

  async openDeleteDocumentModal(): Promise<void> {
    if (!this.currentNodeId || !this.currentOptionType) {
      return;
    }
    
    const message = `Êtes-vous sûr de vouloir supprimer le document "${this.documentTitle}" ?\n\n⚠️ Cette action est irréversible. Le document et son contenu seront définitivement supprimés.`;
    const confirmed = await this.popupService.showConfirm(message, 'Confirmation de suppression');
    
    if (confirmed) {
      await this.deleteDocument();
    }
  }

  private async deleteDocument(): Promise<void> {
    if (!this.currentNodeId || !this.currentOptionType) {
      return;
    }

    this.sopDocumentService.deleteDocument(
      this.currentNodeId,
      this.currentOptionType
    ).subscribe({
      next: async (response) => {
        if (response.success) {
          this.closeDocumentView();
          await this.popupService.showSuccess('Document supprimé avec succès', 'Succès');
        } else {
          await this.popupService.showError(response.error || 'Erreur lors de la suppression', 'Erreur de suppression');
        }
      },
      error: async (error) => {
        console.error('Erreur lors de la suppression:', error);
        if (error.status === 404) {
          this.closeDocumentView();
          await this.popupService.showInfo('Document déjà supprimé ou non trouvé', 'Information');
        } else {
          await this.popupService.showError('Erreur lors de la suppression du document', 'Erreur de suppression');
        }
      }
    });
  }

  hasChildren(node: SOPNode): boolean {
    return node.children && node.children.length > 0;
  }

  async openAddModal(node: SOPNode, event: Event): Promise<void> {
    event.stopPropagation();
    this.parentNodeForAdd = node;
    
    const label = await this.popupService.showTextInput(
      'Entrez le libellé du nouveau titre/sous-titre :',
      'Ajouter un titre/sous-titre',
      '',
      'Ex: Nouveau titre'
    );
    
    if (label && label.trim()) {
      await this.addNode(label.trim());
    }
  }

  private async addNode(newLabel: string): Promise<void> {
    if (!this.parentNodeForAdd || !newLabel.trim()) {
      return;
    }

    const newNodeId = this.generateId(newLabel);
    const parentNodeId = this.parentNodeForAdd.id === 'root-trx' ? undefined : this.parentNodeForAdd.id;

    this.sopNodeService.createNode(newNodeId, newLabel, parentNodeId).subscribe({
      next: async (response) => {
        if (response.success) {
          this.loadStructure();
          await this.popupService.showSuccess('Nœud créé avec succès', 'Succès');
        } else {
          await this.popupService.showError('Erreur lors de la création: ' + (response.error || 'Erreur inconnue'), 'Erreur de création');
        }
      },
      error: async (error) => {
        console.error('Erreur lors de la création:', error);
        await this.popupService.showError('Erreur lors de la création du nœud', 'Erreur de création');
      }
    });
  }

  async openEditModal(node: SOPNode, event: Event): Promise<void> {
    event.stopPropagation();
    this.nodeToEdit = node;
    
    const newLabel = await this.popupService.showTextInput(
      'Modifiez le libellé :',
      'Modifier le titre/sous-titre',
      node.label,
      'Ex: Nouveau libellé'
    );
    
    if (newLabel && newLabel.trim() && newLabel.trim() !== node.label) {
      await this.editNode(newLabel.trim());
    }
  }

  private async editNode(newLabel: string): Promise<void> {
    if (!this.nodeToEdit || !newLabel.trim()) {
      return;
    }

    this.sopNodeService.updateNode(this.nodeToEdit.id, newLabel).subscribe({
      next: async (response) => {
        if (response.success) {
          this.loadStructure();
          await this.popupService.showSuccess('Nœud modifié avec succès', 'Succès');
        } else {
          await this.popupService.showError('Erreur lors de la modification: ' + (response.error || 'Erreur inconnue'), 'Erreur de modification');
        }
      },
      error: async (error) => {
        console.error('Erreur lors de la modification:', error);
        await this.popupService.showError('Erreur lors de la modification du nœud', 'Erreur de modification');
      }
    });
  }

  async openDeleteModal(node: SOPNode, event: Event): Promise<void> {
    event.stopPropagation();
    this.nodeToDelete = node;
    
    let message = `Êtes-vous sûr de vouloir supprimer "${node.label}" ?`;
    if (node.children && node.children.length > 0) {
      message += `\n\n⚠️ Attention : Ce nœud contient ${node.children.length} sous-élément(s) qui seront également supprimés.`;
    }
    
    const confirmed = await this.popupService.showConfirm(message, 'Confirmation de suppression');
    
    if (confirmed) {
      await this.deleteNode();
    }
  }

  private async deleteNode(): Promise<void> {
    if (!this.nodeToDelete) {
      return;
    }

    const nodeIdToDelete = this.nodeToDelete.id;

    this.sopNodeService.deleteNode(nodeIdToDelete).subscribe({
      next: async (response) => {
        if (response.success) {
          this.loadStructure();
          await this.popupService.showSuccess('Nœud supprimé avec succès', 'Succès');
        } else {
          await this.popupService.showError('Erreur lors de la suppression: ' + (response.error || 'Erreur inconnue'), 'Erreur de suppression');
        }
      },
      error: async (error) => {
        console.error('Erreur lors de la suppression:', error);
        await this.popupService.showError('Erreur lors de la suppression du nœud', 'Erreur de suppression');
      }
    });
  }

  private generateId(label: string): string {
    return label.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now();
  }

  formatDocumentText(text: string): string {
    if (!text) return '';
    
    const hasHtmlTags = /<[^>]+>/g.test(text);
    const hasImages = /<img[^>]*>/gi.test(text);
    const hasInlineStyles = /style\s*=\s*["'][^"']*["']/gi.test(text);
    
    if (hasHtmlTags || hasImages || hasInlineStyles) {
      return text;
    }
    
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    escaped = escaped.replace(/^([A-Z\s\-–—]+)$/gm, '<h3 class="document-title">$1</h3>');
    escaped = escaped.replace(/^(\d+\.\s+[^\n]+)$/gm, '<h4 class="document-section">$1</h4>');
    escaped = escaped.replace(/^(\s*[\*\-\•]\s+[^\n]+)$/gm, '<div class="document-item">$1</div>');
    escaped = escaped.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
    
    escaped = escaped.split(/\n\n+/).map(para => {
      if (para.trim() && !para.includes('<h3') && !para.includes('<h4') && !para.includes('<div class="document-item"')) {
        return `<p class="document-paragraph">${para.trim().replace(/\n/g, '<br>')}</p>`;
      }
      return para;
    }).join('');
    
    escaped = escaped.replace(/\n/g, '<br>');
    
    return escaped;
  }

  goBack(): void {
    this.location.back();
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  goToAide(): void {
    this.router.navigate(['/aide']);
  }
}




