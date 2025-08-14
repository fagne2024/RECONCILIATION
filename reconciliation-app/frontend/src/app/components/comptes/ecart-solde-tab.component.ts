import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { EcartSoldeService } from '../../services/ecart-solde.service';
import { EcartSolde } from '../../models/ecart-solde.model';
import { Subscription } from 'rxjs';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-ecart-solde-tab',
  templateUrl: './ecart-solde-tab.component.html',
  styleUrls: ['./ecart-solde-tab.component.scss']
})
export class EcartSoldeTabComponent implements OnInit, OnDestroy {
  @Input() agence: string = '';
  @Input() dateTransaction: string = '';
  
  ecartSoldes: EcartSolde[] = [];
  filteredEcartSoldes: EcartSolde[] = [];
  isLoading = false;
  error: string | null = null;
  
  private subscription = new Subscription();

  constructor(private ecartSoldeService: EcartSoldeService) {}

  ngOnInit(): void {
    this.loadEcartSoldes();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadEcartSoldes(): void {
    if (!this.agence) {
      this.error = 'Agence non spécifiée';
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.subscription.add(
      this.ecartSoldeService.getEcartSoldes().subscribe({
        next: (ecartSoldes: EcartSolde[]) => {
          this.ecartSoldes = ecartSoldes;
          this.filterEcartSoldes();
          this.isLoading = false;
        },
        error: (err: any) => {
          this.error = 'Erreur lors du chargement des écarts de solde: ' + err.message;
          this.isLoading = false;
        }
      })
    );
  }

  filterEcartSoldes(): void {
    if (!this.agence) {
      this.filteredEcartSoldes = [];
      return;
    }

    // Filtrer par agence
    let filtered = this.ecartSoldes.filter(ecart => 
      ecart.agence === this.agence
    );

    // Filtrer par statut (EN_ATTENTE et TRAITE uniquement)
    filtered = filtered.filter(ecart => 
      ecart.statut === 'EN_ATTENTE' || ecart.statut === 'TRAITE'
    );

    // Filtrer par date de transaction si spécifiée
    if (this.dateTransaction) {
      const targetDate = new Date(this.dateTransaction);
      const targetDateString = targetDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
      
      filtered = filtered.filter(ecart => {
        if (!ecart.dateTransaction) return false;
        const ecartDate = new Date(ecart.dateTransaction);
        const ecartDateString = ecartDate.toISOString().split('T')[0];
        return ecartDateString === targetDateString;
      });
    }

    // Trier par date décroissante (du plus récent au plus ancien)
    filtered.sort((a, b) => new Date(b.dateTransaction).getTime() - new Date(a.dateTransaction).getTime());

    this.filteredEcartSoldes = filtered;
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE': return 'status-attente';
      case 'TRAITE': return 'status-traite';
      case 'ERREUR': return 'status-erreur';
      default: return 'status-default';
    }
  }

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant) + ' F CFA';
  }

  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  formatMontantFrais(montant: number): string {
    if (montant === null || montant === undefined) return '0,00 F CFA';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant) + ' F CFA';
  }

  getFraisTypeClass(typeCalcul: string): string {
    switch (typeCalcul) {
      case 'POURCENTAGE': return 'frais-type-percentage';
      case 'NOMINAL': return 'frais-type-nominal';
      default: return 'frais-type-default';
    }
  }

  getFraisTypeLabel(typeCalcul: string): string {
    switch (typeCalcul) {
      case 'POURCENTAGE': return 'Pourcentage';
      case 'NOMINAL': return 'Fixe';
      default: return 'Standard';
    }
  }

  calculateTotalEcart(): number {
    let totalEcart = 0;
    
    this.filteredEcartSoldes.forEach(ecart => {
      const montant = ecart.montant || 0;
      const frais = ecart.fraisAssocie?.montant || 0;
      const service = ecart.service?.toUpperCase() || '';
      
      if (service.includes('CASHIN')) {
        // Pour CASHIN : montant + frais
        totalEcart += montant + frais;
      } else if (service.includes('PAIEMENT')) {
        // Pour PAIEMENT : montant - frais
        totalEcart += montant - frais;
      } else {
        // Pour les autres services : montant seulement
        totalEcart += montant;
      }
    });
    
    return totalEcart;
  }

  formatTotalEcart(): string {
    const total = this.calculateTotalEcart();
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(total) + ' F CFA';
  }

  exportEcartSoldes(): void {
    if (this.filteredEcartSoldes.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    // Préparer les données pour l'export
    const exportData: any[] = this.filteredEcartSoldes.map(ecart => ({
      'ID Transaction': ecart.idTransaction,
      'Téléphone Client': ecart.telephoneClient || '',
      'Montant': ecart.montant,
      'Service': ecart.service || '',
      'Agence': ecart.agence || '',
      'Date Transaction': ecart.dateTransaction ? new Date(ecart.dateTransaction).toLocaleDateString('fr-FR') : '',
      'Numéro Trans GU': ecart.numeroTransGu || '',
      'Pays': ecart.pays || '',
      'Statut': ecart.statut || 'EN_ATTENTE',
      'Frais': ecart.fraisAssocie ? ecart.fraisAssocie.montant : 0,
      'Type Frais': ecart.fraisAssocie ? this.getFraisTypeLabel(ecart.fraisAssocie.typeCalcul) : '',
      'Pourcentage Frais': ecart.fraisAssocie?.pourcentage || '',
      'Commentaire': ecart.commentaire || '',
      'Date Import': ecart.dateImport ? new Date(ecart.dateImport).toLocaleDateString('fr-FR') : ''
    }));

    // Ajouter une ligne pour le total d'écart
    const totalEcart = this.calculateTotalEcart();
    exportData.push({
      'ID Transaction': '',
      'Téléphone Client': '',
      'Montant': '',
      'Service': '',
      'Agence': '',
      'Date Transaction': '',
      'Numéro Trans GU': '',
      'Pays': '',
      'Statut': '',
      'Frais': '',
      'Type Frais': '',
      'Pourcentage Frais': '',
      'Date Import': ''
    });
    exportData.push({
      'ID Transaction': '',
      'Téléphone Client': '',
      'Montant': '',
      'Service': '',
      'Agence': '',
      'Date Transaction': '',
      'Numéro Trans GU': '',
      'Pays': '',
      'Statut': 'ÉCART TOTAL',
      'Frais': totalEcart,
      'Type Frais': '',
      'Pourcentage Frais': '',
      'Date Import': ''
    });

    // Créer un fichier Excel avec des couleurs
    this.createExcelWithColors(exportData);
  }

  private createExcelWithColors(data: any[]): void {
    // Créer un workbook Excel
    const workbook = XLSX.utils.book_new();
    
    // Préparer les données pour l'export
    const exportData = data.map(row => ({
      'ID Transaction': row['ID Transaction'],
      'Téléphone Client': row['Téléphone Client'],
      'Montant': row['Montant'],
      'Service': row['Service'],
      'Agence': row['Agence'],
      'Date Transaction': row['Date Transaction'],
      'Numéro Trans GU': row['Numéro Trans GU'],
      'Pays': row['Pays'],
      'Statut': row['Statut'],
      'Frais': row['Frais'],
      'Type Frais': row['Type Frais'],
      'Pourcentage Frais': row['Pourcentage Frais'],
      'Commentaire': row['Commentaire'],
      'Date Import': row['Date Import']
    }));

    // Créer la feuille de calcul
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Définir les largeurs de colonnes
    const columnWidths = [
      { wch: 15 }, // ID Transaction
      { wch: 15 }, // Téléphone Client
      { wch: 12 }, // Montant
      { wch: 12 }, // Service
      { wch: 12 }, // Agence
      { wch: 15 }, // Date Transaction
      { wch: 15 }, // Numéro Trans GU
      { wch: 10 }, // Pays
      { wch: 12 }, // Statut
      { wch: 12 }, // Frais
      { wch: 12 }, // Type Frais
      { wch: 15 }, // Pourcentage Frais
      { wch: 20 }, // Commentaire
      { wch: 15 }  // Date Import
    ];
    worksheet['!cols'] = columnWidths;

    // Ajouter des styles conditionnels
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;
        
        const cell = worksheet[cellAddress];
        const header = exportData[0] ? Object.keys(exportData[0])[C] : '';
        const value = cell.v;
        
        // Styles pour l'en-tête
        if (R === 0) {
          cell.s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '2C3E50' } },
            alignment: { horizontal: 'center' }
          };
        } else {
          // Styles conditionnels pour les données
          let style: any = {
            font: { size: 11 },
            alignment: { horizontal: 'left' }
          };

          if (header === 'Montant' && typeof value === 'number') {
            style.font = { ...style.font, bold: true, color: { rgb: '28A745' } };
            style.fill = { fgColor: { rgb: 'D4EDDA' } };
          } else if (header === 'Statut') {
            if (value === 'EN_ATTENTE') {
              style.fill = { fgColor: { rgb: 'FFF3CD' } };
              style.font = { ...style.font, color: { rgb: '856404' } };
            } else if (value === 'TRAITE') {
              style.fill = { fgColor: { rgb: 'D4EDDA' } };
              style.font = { ...style.font, color: { rgb: '155724' } };
            } else if (value === 'ERREUR') {
              style.fill = { fgColor: { rgb: 'F8D7DA' } };
              style.font = { ...style.font, color: { rgb: '721C24' } };
            } else if (value === 'ÉCART TOTAL') {
              style.font = { ...style.font, bold: true, size: 14, color: { rgb: 'FFFFFF' } };
              style.fill = { fgColor: { rgb: 'FF6B6B' } };
              style.alignment = { horizontal: 'center' };
            }
          } else if (header === 'Frais' && typeof value === 'number' && value > 0) {
            style.font = { ...style.font, bold: true, color: { rgb: 'DC3545' } };
            style.fill = { fgColor: { rgb: 'FFF5F5' } };
          } else if (header === 'Service') {
            style.font = { ...style.font, bold: true, color: { rgb: '6F42C1' } };
          } else if (header === 'Agence') {
            style.font = { ...style.font, bold: true, color: { rgb: 'FD7E14' } };
          } else if (header === 'Commentaire' && value) {
            style.font = { ...style.font, italic: true, color: { rgb: '007BFF' } };
            style.fill = { fgColor: { rgb: 'E8F4FD' } };
          }

          cell.s = style;
        }
      }
    }

    // Ajouter la feuille au workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Écarts de Solde');

    // Générer et télécharger le fichier
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ecarts-solde-${this.agence}-${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
} 