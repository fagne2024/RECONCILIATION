import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SopDocumentService } from '../../services/sop-document.service';
import { SopNodeService } from '../../services/sop-node.service';
import { PopupService } from '../../services/popup.service';

interface GuideNode {
  id: string;
  label: string;
  children?: GuideNode[];
  route?: string;
  description?: string;
}

@Component({
  selector: 'app-guide-utilisation',
  templateUrl: './guide-utilisation.component.html',
  styleUrls: ['./guide-utilisation.component.scss']
})
export class GuideUtilisationComponent implements OnInit {
  selectedNode: GuideNode | null = null;
  showPopup: boolean = false;
  popupNode: GuideNode | null = null;
  
  // Variables pour les opérations
  parentNodeForAdd: GuideNode | null = null;
  nodeToEdit: GuideNode | null = null;
  nodeToDelete: GuideNode | null = null;
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
  
  guideStructure: GuideNode = {
    id: 'root',
    label: 'Visualisation des Guides',
    children: []
  };

  constructor(
    private sopDocumentService: SopDocumentService,
    private sopNodeService: SopNodeService,
    private popupService: PopupService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.loadStructure();
  }

  loadStructure(): void {
    this.isLoadingStructure = true;
    this.sopNodeService.getGuideStructure().subscribe({
      next: (response) => {
        console.log('📥 Réponse reçue complète:', JSON.stringify(response));
        console.log('📥 Structure brute:', response.structure);
        console.log('📥 Type de structure:', typeof response.structure);
        console.log('📥 Clés de structure:', Object.keys(response.structure));
        if (response.success && response.structure) {
          // Réassignation directe avec création d'une nouvelle référence
          this.guideStructure = {
            id: response.structure.id,
            label: response.structure.label,
            children: response.structure.children ? [...response.structure.children] : []
          };
          console.log('✅ Structure mise à jour:', this.guideStructure);
          console.log('✅ Nombre d\'enfants:', this.guideStructure.children?.length || 0);
        } else {
          console.error('Erreur lors du chargement de la structure:', response.error);
        }
        this.isLoadingStructure = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la structure:', error);
        this.isLoadingStructure = false;
      }
    });
  }

  onNodeClick(node: GuideNode, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    if (node.children && node.children.length > 0) {
      this.selectedNode = node;
    } else {
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
    
    this.sopDocumentService.checkGuideDocumentExists(this.popupNode.id, option).subscribe({
      next: (response) => {
        if (response.exists) {
          this.loadDocument(this.popupNode!.id, option);
        } else {
          this.openUploadModal(this.popupNode!.id, option);
        }
        this.closePopup();
      },
      error: (error) => {
        console.error('Erreur lors de la vérification du document:', error);
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
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.uploadError = '';
      this.manualText = '';
      this.showManualTextInput = false;
      
      if (this.selectedFile) {
        await this.tryExtractText();
      }
    }
  }

  async tryExtractText(): Promise<void> {
    if (!this.selectedFile) return;
    
    this.isExtractingText = true;
    this.uploadError = '';
    
    try {
      const extractedText = await this.extractTextFromFile(this.selectedFile);
      
      const isError = extractedText.includes('non disponible') || 
                     extractedText.includes('non extrait automatiquement') ||
                     extractedText.includes('Erreur lors de l\'extraction') ||
                     extractedText.includes('nécessitent');
      
      if (extractedText && !isError) {
        this.manualText = extractedText;
        this.showManualTextInput = true;
      } else {
        this.showManualTextInput = true;
        if (extractedText.includes('non extrait automatiquement') || 
            extractedText.includes('non disponible')) {
          this.uploadError = 'Extraction automatique non disponible. Veuillez saisir le texte manuellement ci-dessous.';
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'extraction:', error);
      this.showManualTextInput = true;
      this.uploadError = 'Impossible d\'extraire le texte automatiquement. Veuillez saisir le texte manuellement.';
    } finally {
      this.isExtractingText = false;
    }
  }

  toggleManualTextInput(): void {
    // Called by checkbox
  }

  async uploadDocument(): Promise<void> {
    if (!this.selectedFile || !this.uploadNodeId || !this.uploadOptionType) {
      this.uploadError = 'Veuillez sélectionner un fichier';
      return;
    }

    let extractedText = this.manualText.trim();
    
    if (!extractedText) {
      try {
        extractedText = await this.extractTextFromFile(this.selectedFile);
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

    if (!extractedText || extractedText.trim().length === 0) {
      this.uploadError = 'Veuillez saisir le texte du document ou sélectionner un fichier avec du texte extractible.';
      this.showManualTextInput = true;
      return;
    }

    this.isUploading = true;
    this.uploadError = '';

    this.sopDocumentService.uploadGuideDocument(
      this.selectedFile,
      this.uploadNodeId,
      this.uploadOptionType,
      extractedText
    ).subscribe({
      next: (response) => {
        if (response.success) {
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
    
    if (fileType.startsWith('image/') || fileName.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i)) {
      return await this.extractTextFromImage(file);
    }
    
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await this.extractTextFromPdf(file);
    }

    if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      return await this.readTextFile(file);
    }

    if (fileName.endsWith('.docx')) {
      return await this.extractTextFromDocx(file);
    }
    
    if (fileName.endsWith('.doc')) {
      return await this.extractTextFromDoc(file);
    }

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
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      
      if (pdfjsLib) {
        const arrayBuffer = await file.arrayBuffer();
        
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let htmlContent = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({
            canvasContext: context!,
            viewport: viewport
          }).promise;
          
          const pageImage = canvas.toDataURL('image/png');
          
          htmlContent += `<div class="pdf-page" style="text-align: center; margin-bottom: 30px;">
            <img src="${pageImage}" alt="Page ${i}" style="max-width: 100%; height: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 4px;" />
          </div>\n`;
        }

        return htmlContent.trim() || '<p>Aucun texte trouvé dans le PDF.</p>';
      } else {
        try {
          await this.loadPdfJs();
          return await this.extractTextFromPdf(file);
        } catch (loadError) {
          return 'Extraction PDF non disponible. Veuillez saisir le texte manuellement ou installer pdf.js.';
        }
      }
    } catch (error) {
      console.error('Erreur extraction PDF:', error);
      return 'Erreur lors de l\'extraction du texte du PDF. Veuillez saisir le texte manuellement.';
    }
  }

  async loadPdfJs(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        if ((window as any).pdfjsLib) {
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve();
        } else {
          reject(new Error('pdf.js n\'a pas pu être chargé'));
        }
      };
      script.onerror = (error) => {
        reject(new Error('Erreur lors du chargement de pdf.js'));
      };
      document.head.appendChild(script);
    });
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
    try {
      const mammoth = (window as any).mammoth;
      
      if (mammoth) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        return result.value || '<p>Aucun texte trouvé dans le document Word.</p>';
      } else {
        try {
          await this.loadMammothJs();
          return await this.extractTextFromDocx(file);
        } catch (loadError) {
          return 'Extraction Word (.docx) non disponible. Veuillez saisir le texte manuellement ou convertir en PDF.';
        }
      }
    } catch (error) {
      console.error('Erreur extraction .docx:', error);
      return 'Erreur lors de l\'extraction du texte du document Word. Veuillez saisir le texte manuellement.';
    }
  }

  async loadMammothJs(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).mammoth) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
      script.onload = () => {
        if ((window as any).mammoth) {
          resolve();
        } else {
          reject(new Error('mammoth.js n\'a pas pu être chargé'));
        }
      };
      script.onerror = (error) => {
        reject(new Error('Erreur lors du chargement de mammoth.js'));
      };
      document.head.appendChild(script);
    });
  }

  async extractTextFromDoc(file: File): Promise<string> {
    try {
      const text = await this.readTextFile(file);
      if (text && text.length > 50 && !text.includes('\0')) {
        return text;
      }
    } catch (error) {
      console.error('Erreur lors de la lecture:', error);
    }
    
    return 'Les fichiers .doc (ancien format Word) nécessitent une conversion. Veuillez convertir le fichier en .docx ou PDF, ou saisir le texte manuellement.';
  }

  loadDocument(nodeId: string, optionType: string): void {
    this.sopDocumentService.getGuideDocumentContent(nodeId, optionType).subscribe({
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
      return;
    }

    this.sopDocumentService.downloadGuideDocument(this.currentNodeId, this.currentOptionType).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = this.documentTitle || `guide_${this.currentNodeId}_${this.currentOptionType}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Erreur lors du téléchargement:', error);
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

      this.sopDocumentService.updateGuideDocument(
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
    
    const message = `Êtes-vous sûr de vouloir supprimer le document "${this.documentTitle}" ?\n\n⚠️ Cette action est irréversible.`;
    const confirmed = await this.popupService.showConfirm(message, 'Confirmation de suppression');
    
    if (confirmed) {
      await this.deleteDocument();
    }
  }

  private async deleteDocument(): Promise<void> {
    if (!this.currentNodeId || !this.currentOptionType) {
      return;
    }

    this.sopDocumentService.deleteGuideDocument(
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

  hasChildren(node: GuideNode): boolean {
    return node.children && node.children.length > 0;
  }

  async openAddModal(node: GuideNode, event: Event): Promise<void> {
    event.stopPropagation();
    this.parentNodeForAdd = node;
    
    const label = await this.popupService.showTextInput(
      'Entrez le libellé du nouveau guide :',
      'Ajouter un guide',
      '',
      'Ex: Nouveau guide'
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
    const parentNodeId = this.parentNodeForAdd.id === 'root' ? undefined : this.parentNodeForAdd.id;

    this.sopNodeService.createGuideNode(newNodeId, newLabel, parentNodeId).subscribe({
      next: async (response) => {
        if (response.success) {
          this.loadStructure();
          await this.popupService.showSuccess('Guide créé avec succès', 'Succès');
        } else {
          await this.popupService.showError('Erreur lors de la création: ' + (response.error || 'Erreur inconnue'), 'Erreur de création');
        }
      },
      error: async (error) => {
        console.error('Erreur lors de la création:', error);
        await this.popupService.showError('Erreur lors de la création du guide', 'Erreur de création');
      }
    });
  }

  async openEditModal(node: GuideNode, event: Event): Promise<void> {
    event.stopPropagation();
    this.nodeToEdit = node;
    
    const newLabel = await this.popupService.showTextInput(
      'Modifiez le libellé :',
      'Modifier le guide',
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

    this.sopNodeService.updateGuideNode(this.nodeToEdit.id, newLabel).subscribe({
      next: async (response) => {
        if (response.success) {
          this.loadStructure();
          await this.popupService.showSuccess('Guide modifié avec succès', 'Succès');
        } else {
          await this.popupService.showError('Erreur lors de la modification: ' + (response.error || 'Erreur inconnue'), 'Erreur de modification');
        }
      },
      error: async (error) => {
        console.error('Erreur lors de la modification:', error);
        await this.popupService.showError('Erreur lors de la modification du guide', 'Erreur de modification');
      }
    });
  }

  async openDeleteModal(node: GuideNode, event: Event): Promise<void> {
    event.stopPropagation();
    this.nodeToDelete = node;
    
    let message = `Êtes-vous sûr de vouloir supprimer "${node.label}" ?`;
    if (node.children && node.children.length > 0) {
      message += `\n\n⚠️ Attention : Ce guide contient ${node.children.length} sous-élément(s) qui seront également supprimés.`;
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

    this.sopNodeService.deleteGuideNode(nodeIdToDelete).subscribe({
      next: async (response) => {
        if (response.success) {
          this.loadStructure();
          await this.popupService.showSuccess('Guide supprimé avec succès', 'Succès');
        } else {
          await this.popupService.showError('Erreur lors de la suppression: ' + (response.error || 'Erreur inconnue'), 'Erreur de suppression');
        }
      },
      error: async (error) => {
        console.error('Erreur lors de la suppression:', error);
        await this.popupService.showError('Erreur lors de la suppression du guide', 'Erreur de suppression');
      }
    });
  }

  private findParent(root: GuideNode, target: GuideNode): GuideNode | null {
    if (!root.children) {
      return null;
    }

    if (root.children.some(child => child.id === target.id)) {
      return root;
    }

    for (const child of root.children) {
      const found = this.findParent(child, target);
      if (found) {
        return found;
      }
    }

    return null;
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

  escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
