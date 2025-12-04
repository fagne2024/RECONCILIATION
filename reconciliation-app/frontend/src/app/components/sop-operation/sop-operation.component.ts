import { Component, OnInit } from '@angular/core';
import { SopDocumentService } from '../../services/sop-document.service';

interface SOPNode {
  id: string;
  label: string;
  children?: SOPNode[];
  route?: string;
  description?: string;
}

@Component({
  selector: 'app-sop-operation',
  templateUrl: './sop-operation.component.html',
  styleUrls: ['./sop-operation.component.scss']
})
export class SopOperationComponent implements OnInit {
  selectedNode: SOPNode | null = null;
  showPopup: boolean = false;
  popupNode: SOPNode | null = null;
  
  // Modals pour ajouter, modifier et supprimer
  showAddModal: boolean = false;
  showEditModal: boolean = false;
  showDeleteModal: boolean = false;
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

  // Modal de modification
  showEditDocumentModal: boolean = false;
  editDocumentFile: File | null = null;
  editDocumentText: string = '';
  isEditingDocument: boolean = false;

  // Modal de suppression
  showDeleteDocumentModal: boolean = false;
  documentToDelete: { nodeId: string; optionType: string; title: string } | null = null;
  
  sopStructure: SOPNode = {
    id: 'root',
    label: 'Visualisation des SOP',
    children: [
      {
        id: 'back-office',
        label: 'Back office',
        children: [
          {
            id: 'metier-gu3',
            label: 'Métier (GU3)',
            children: [
              { id: 'appro-client-client', label: 'Appro client par client' },
              { id: 'appro-client-ops', label: 'Appro client par OPS' },
              { id: 'appro-fournisseur', label: 'Appro fournisseur' },
              { id: 'compense-client-client', label: 'Compense client par le client' },
              { id: 'compense-client-ops', label: 'Compense client par OPS' },
              { id: 'compense-fournisseur', label: 'Compense Fournisseur' },
              { id: 'transfert-uv-sous-compte', label: 'Transfert d\'UV sous compte vers le compte' },
              { id: 'transfert-uv-compte', label: 'Transfert d\'UV compte vers le sous compte' }
            ]
          },
          {
            id: 'classique',
            label: 'Classique',
            children: [
              { id: 'appro-client-classique', label: 'Appro client par le client' },
              { id: 'appro-client-ops-classique', label: 'Appro client par OPS' },
              { id: 'appro-fournisseur-classique', label: 'Appro fournisseur' },
              { id: 'compense-client-classique', label: 'Compense client' },
              { id: 'compense-fournisseur-classique', label: 'Compense Fournisseur' }
            ]
          },
          {
            id: 'gu2',
            label: 'GU2',
            children: [
              { id: 'appro-client-gu2', label: 'Appro client' },
              { id: 'compense-client-gu2', label: 'Compense client' },
              { id: 'transfert-uv-sous-compte-gu2', label: 'Transfert d\'UV sous compte vers le compte' },
              { id: 'transfert-uv-compte-gu2', label: 'Transfert d\'UV compte vers le sous compte' }
            ]
          }
        ]
      },
      {
        id: 'autres',
        label: 'Autres',
        children: [
          {
            id: 'annulation',
            label: 'Annulation',
            children: [
              { id: 'annulation-operation', label: 'Annulation Opération (tous les BO)' },
              { id: 'annulation-transaction-metier', label: 'Annulation transaction BO métier' },
              { id: 'annulation-transaction-classique', label: 'Annulation transaction BO Classique' }
            ]
          },
          {
            id: 'transfert-uv-inter-filiale',
            label: 'Transfert d\'UV inter filiale',
            children: [
              { id: 'virement-bancaire', label: 'Via une virement bancaire' },
              { id: 'service-touchpoint', label: 'Via le service TOUCHPOINT' }
            ]
          },
          {
            id: 'ajustement-memo',
            label: 'L\'usage de la fonctionnalité Ajustement et Memo',
            children: [
              { id: 'ajustement-solde', label: 'Ajustement de solde (Classique)' },
              { id: 'utilisation-memo', label: 'L\'utilisation d\'un Memo (tous les BO)' }
            ]
          },
          {
            id: 'probleme-technique',
            label: 'Problème technique et anomalie REC',
            children: [
              { id: 'correction-anomalie', label: 'Correction anomalie Réconciliation (tous les BO)' },
              { id: 'probleme-technique-ops', label: 'Problème technique lié au traitement des OPS (tous les BO)' }
            ]
          }
        ]
      }
    ]
  };

  constructor(private sopDocumentService: SopDocumentService) { }

  ngOnInit(): void {
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
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.uploadError = '';
      this.manualText = '';
      this.showManualTextInput = false;
      
      // Essayer d'extraire le texte automatiquement
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
      
      // Si l'extraction a réussi et n'est pas un message d'erreur
      if (extractedText && 
          !extractedText.includes('non disponible') && 
          !extractedText.includes('non extrait automatiquement') &&
          !extractedText.includes('Erreur lors de l\'extraction')) {
        this.manualText = extractedText;
        this.showManualTextInput = true;
      } else {
        // Si l'extraction a échoué, proposer la saisie manuelle
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

    // Pour les images, utiliser OCR (Tesseract.js)
    if (fileType.startsWith('image/') || fileName.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i)) {
      return await this.extractTextFromImage(file);
    }
    
    // Pour les PDFs, utiliser pdf.js
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await this.extractTextFromPdf(file);
    }

    // Pour les fichiers texte
    if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      return await this.readTextFile(file);
    }

    // Pour les fichiers Word
    if (fileName.endsWith('.docx')) {
      return await this.extractTextFromDocx(file);
    }
    
    if (fileName.endsWith('.doc')) {
      return await this.extractTextFromDoc(file);
    }

    // Pour les autres types, retourner un message
    return 'Texte non extrait automatiquement pour ce type de fichier. Veuillez saisir le texte manuellement.';
  }

  async extractTextFromImage(file: File): Promise<string> {
    // Utiliser Tesseract.js pour l'OCR
    try {
      // Dynamiquement importer Tesseract si disponible
      const Tesseract = (window as any).Tesseract;
      if (Tesseract) {
        const { data: { text } } = await Tesseract.recognize(file);
        return text;
      } else {
        // Si Tesseract n'est pas disponible, retourner un message
        return 'OCR non disponible. Veuillez installer Tesseract.js pour extraire le texte des images.';
      }
    } catch (error) {
      console.error('Erreur OCR:', error);
      return 'Erreur lors de l\'extraction du texte de l\'image';
    }
  }

  async extractTextFromPdf(file: File): Promise<string> {
    try {
      // Utiliser pdf.js pour extraire le texte
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        const arrayBuffer = await file.arrayBuffer();
        
        // Configurer le worker si nécessaire
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
            .trim();
          
          if (pageText) {
            fullText += pageText + '\n\n';
          }
        }

        return fullText.trim() || 'Aucun texte trouvé dans le PDF. Le document peut être une image scannée.';
      } else {
        // Essayer de charger pdf.js dynamiquement
        try {
          await this.loadPdfJs();
          return await this.extractTextFromPdf(file); // Réessayer après chargement
        } catch (loadError) {
          console.error('Erreur chargement pdf.js:', loadError);
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
      script.onerror = () => reject(new Error('Erreur lors du chargement de pdf.js'));
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
      // Utiliser mammoth.js pour extraire le texte des fichiers .docx
      const mammoth = (window as any).mammoth;
      if (mammoth) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value || 'Aucun texte trouvé dans le document Word.';
      } else {
        // Essayer de charger mammoth.js dynamiquement
        try {
          await this.loadMammothJs();
          return await this.extractTextFromDocx(file); // Réessayer après chargement
        } catch (loadError) {
          console.error('Erreur chargement mammoth.js:', loadError);
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
      script.onerror = () => reject(new Error('Erreur lors du chargement de mammoth.js'));
      document.head.appendChild(script);
    });
  }

  async extractTextFromDoc(file: File): Promise<string> {
    // Les fichiers .doc (ancien format) nécessitent une bibliothèque spécialisée
    // Pour l'instant, on suggère de convertir en .docx ou PDF
    try {
      // Essayer d'utiliser FileReader pour lire comme texte (peu probable de fonctionner)
      const text = await this.readTextFile(file);
      // Si on obtient du texte lisible, le retourner
      if (text && text.length > 50 && !text.includes('\0')) {
        return text;
      }
    } catch (error) {
      // Ignorer l'erreur et continuer
    }
    
    return 'Les fichiers .doc (ancien format Word) nécessitent une conversion. Veuillez convertir le fichier en .docx ou PDF, ou saisir le texte manuellement.';
  }

  loadDocument(nodeId: string, optionType: string): void {
    this.sopDocumentService.getDocumentContent(nodeId, optionType).subscribe({
      next: (response) => {
        if (response.exists && response.extractedText) {
          this.documentContent = response.extractedText;
          this.documentTitle = response.fileName || 'Document';
          this.currentOptionType = optionType;
          this.showDocumentView = true;
        } else {
          // Si le document existe mais n'a pas de texte, ouvrir le modal d'upload
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
      // Si un nouveau fichier est sélectionné, essayer d'extraire le texte
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
          // Continuer avec le texte manuel
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
            // Recharger le document
            this.loadDocument(this.currentNodeId, this.currentOptionType);
            this.closeEditDocumentModal();
          } else {
            alert(response.error || 'Erreur lors de la modification');
          }
          this.isEditingDocument = false;
        },
        error: (error) => {
          console.error('Erreur lors de la modification:', error);
          alert('Erreur lors de la modification du document');
          this.isEditingDocument = false;
        }
      });
    } catch (error) {
      console.error('Erreur:', error);
      this.isEditingDocument = false;
    }
  }

  openDeleteDocumentModal(): void {
    if (!this.currentNodeId || !this.currentOptionType) {
      return;
    }
    this.documentToDelete = {
      nodeId: this.currentNodeId,
      optionType: this.currentOptionType,
      title: this.documentTitle
    };
    this.showDeleteDocumentModal = true;
  }

  closeDeleteDocumentModal(): void {
    this.showDeleteDocumentModal = false;
    this.documentToDelete = null;
  }

  deleteDocument(): void {
    if (!this.documentToDelete) {
      return;
    }

    this.sopDocumentService.deleteDocument(
      this.documentToDelete.nodeId,
      this.documentToDelete.optionType
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeDocumentView();
          this.closeDeleteDocumentModal();
          // Ne pas utiliser alert, mais plutôt un message plus élégant
          console.log('Document supprimé avec succès');
        } else {
          console.error('Erreur suppression:', response.error);
          alert(response.error || 'Erreur lors de la suppression');
        }
      },
      error: (error) => {
        console.error('Erreur lors de la suppression:', error);
        // Vérifier si c'est une erreur 404 (document non trouvé)
        if (error.status === 404) {
          // Le document n'existe plus, fermer quand même la vue
          this.closeDocumentView();
          this.closeDeleteDocumentModal();
          console.log('Document déjà supprimé ou non trouvé');
        } else {
          alert('Erreur lors de la suppression du document: ' + (error.error?.error || error.message || 'Erreur inconnue'));
        }
      }
    });
  }

  hasChildren(node: SOPNode): boolean {
    return node.children && node.children.length > 0;
  }

  // Ouvrir le modal d'ajout
  openAddModal(node: SOPNode, event: Event): void {
    event.stopPropagation();
    this.parentNodeForAdd = node;
    this.newLabel = '';
    this.showAddModal = true;
  }

  // Fermer le modal d'ajout
  closeAddModal(): void {
    this.showAddModal = false;
    this.parentNodeForAdd = null;
    this.newLabel = '';
  }

  // Ajouter un nouveau titre/sous-titre
  addNode(): void {
    if (!this.parentNodeForAdd || !this.newLabel.trim()) {
      return;
    }

    const newNode: SOPNode = {
      id: this.generateId(this.newLabel),
      label: this.newLabel.trim(),
      children: []
    };

    if (!this.parentNodeForAdd.children) {
      this.parentNodeForAdd.children = [];
    }
    this.parentNodeForAdd.children.push(newNode);
    this.closeAddModal();
  }

  // Ouvrir le modal de modification
  openEditModal(node: SOPNode, event: Event): void {
    event.stopPropagation();
    this.nodeToEdit = node;
    this.editLabel = node.label;
    this.showEditModal = true;
  }

  // Fermer le modal de modification
  closeEditModal(): void {
    this.showEditModal = false;
    this.nodeToEdit = null;
    this.editLabel = '';
  }

  // Modifier un élément
  editNode(): void {
    if (!this.nodeToEdit || !this.editLabel.trim()) {
      return;
    }

    this.nodeToEdit.label = this.editLabel.trim();
    this.closeEditModal();
  }

  // Ouvrir le modal de suppression
  openDeleteModal(node: SOPNode, event: Event): void {
    event.stopPropagation();
    this.nodeToDelete = node;
    this.showDeleteModal = true;
  }

  // Fermer le modal de suppression
  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.nodeToDelete = null;
  }

  // Supprimer un élément
  deleteNode(): void {
    if (!this.nodeToDelete) {
      return;
    }

    // Trouver le parent et supprimer le nœud
    const parent = this.findParent(this.sopStructure, this.nodeToDelete);
    if (parent && parent.children) {
      const index = parent.children.findIndex(child => child.id === this.nodeToDelete!.id);
      if (index !== -1) {
        parent.children.splice(index, 1);
      }
    }

    this.closeDeleteModal();
  }

  // Trouver le parent d'un nœud
  private findParent(root: SOPNode, target: SOPNode): SOPNode | null {
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

  // Générer un ID unique basé sur le label
  private generateId(label: string): string {
    return label.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now();
  }

  formatDocumentText(text: string): string {
    if (!text) return '';
    
    // Échapper le HTML pour éviter les injections
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // Détecter et formater les titres (lignes en majuscules ou avec des caractères spéciaux)
    escaped = escaped.replace(/^([A-Z\s\-–—]+)$/gm, '<h3 class="document-title">$1</h3>');
    
    // Détecter les sections numérotées (1., 2., etc.)
    escaped = escaped.replace(/^(\d+\.\s+[^\n]+)$/gm, '<h4 class="document-section">$1</h4>');
    
    // Détecter les sous-sections avec astérisques ou tirets
    escaped = escaped.replace(/^(\s*[\*\-\•]\s+[^\n]+)$/gm, '<div class="document-item">$1</div>');
    
    // Détecter les textes en gras (entre ** ou entourés de caractères spéciaux)
    escaped = escaped.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
    
    // Formater les paragraphes (séparés par des lignes vides)
    escaped = escaped.split(/\n\n+/).map(para => {
      if (para.trim() && !para.includes('<h3') && !para.includes('<h4') && !para.includes('<div class="document-item"')) {
        return `<p class="document-paragraph">${para.trim().replace(/\n/g, '<br>')}</p>`;
      }
      return para;
    }).join('');
    
    // Formater les sauts de ligne simples
    escaped = escaped.replace(/\n/g, '<br>');
    
    return escaped;
  }
}

