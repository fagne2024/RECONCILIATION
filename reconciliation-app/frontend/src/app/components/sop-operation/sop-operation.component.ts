import { Component, OnInit } from '@angular/core';

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

  constructor() { }

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
    
    // Ici, vous pouvez ajouter la logique pour naviguer vers la page appropriée
    // Par exemple : this.router.navigate(['/sop-details', this.popupNode.id, option]);
    console.log(`Option sélectionnée: ${option} pour ${this.popupNode.label}`);
    
    // Fermer le popup après sélection
    this.closePopup();
  }

  hasChildren(node: SOPNode): boolean {
    return node.children && node.children.length > 0;
  }
}

