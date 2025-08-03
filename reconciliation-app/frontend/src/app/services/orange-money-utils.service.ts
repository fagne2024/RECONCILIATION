import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class OrangeMoneyUtilsService {

  constructor() { }

  /**
   * Détecte si un fichier est un fichier Orange Money
   */
  isOrangeMoneyFile(fileName: string): boolean {
    console.log('🔍 isOrangeMoneyFile appelée avec fileName:', fileName);
    const fileNameLower = fileName.toLowerCase();
    console.log('🔍 fileName.toLowerCase():', fileNameLower);
    
    const hasCiomcm = fileNameLower.includes('ciomcm');
    const hasOrange = fileNameLower.includes('orange');
    const hasOrangeMoney = fileNameLower.includes('orange money');
    
    // Détecter les patterns CIOM et PMOM suivis de codes de pays
    const ciomPattern = /ciom\d{2}/i;
    const pmomPattern = /pmom\d{2}/i;
    const ciomCountryPattern = /ciom(cm|ml|gn|ci|sn|kn|bj|gb)/i;
    const pmomCountryPattern = /pmom(cm|ml|gn|ci|sn|kn|bj|gb)/i;
    const hasCiomPattern = ciomPattern.test(fileName);
    const hasPmomPattern = pmomPattern.test(fileName);
    const hasCiomCountryPattern = ciomCountryPattern.test(fileName);
    const hasPmomCountryPattern = pmomCountryPattern.test(fileName);
    
    console.log('🔍 Détection des clés:');
    console.log('  - ciomcm:', hasCiomcm);
    console.log('  - orange:', hasOrange);
    console.log('  - orange money:', hasOrangeMoney);
    console.log('  - pattern CIOM + 2 chiffres:', hasCiomPattern);
    console.log('  - pattern PMOM + 2 chiffres:', hasPmomPattern);
    console.log('  - pattern CIOM + codes pays:', hasCiomCountryPattern);
    console.log('  - pattern PMOM + codes pays:', hasPmomCountryPattern);
    
    const result = hasCiomcm || hasOrange || hasOrangeMoney || hasCiomPattern || hasPmomPattern || hasCiomCountryPattern || hasPmomCountryPattern;
    console.log('🔍 Résultat final:', result);
    
    return result;
  }

  /**
   * Retourne les valeurs spécifiques pour un champ donné dans un fichier Orange Money
   */
  getOrangeMoneyFieldValues(fieldName: string): string[] {
    console.log('🔍 getOrangeMoneyFieldValues appelée avec fieldName:', fieldName);
    
    // Normaliser le nom de la colonne pour la comparaison
    const normalizedFieldName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (normalizedFieldName.includes('statut')) {
      console.log('✅ Retour des valeurs Statut spécifiques Orange Money: ["Succès"]');
      return ['Succès'];
    }
    
    if (normalizedFieldName.includes('service')) {
      console.log('✅ Retour des valeurs Service spécifiques Orange Money: ["Cash in", "Débit"]');
      return ['Cash in', 'Débit'];
    }
    
    // Pour tous les autres champs, retourner un tableau vide
    console.log('❌ Aucune valeur spécifique trouvée pour:', fieldName);
    return [];
  }

  /**
   * Retourne les valeurs mockées par défaut pour un champ donné
   */
  getMockColumnValues(columnName: string): string[] {
    console.log('🔍 getMockColumnValues appelée avec columnName:', columnName);
    
    const mockData: { [key: string]: string[] } = {
      // Colonnes d'agence
      'Code_Agence': ['AG001', 'AG002', 'AG003', 'AG004', 'AG005'],
      'Nom_Agence': ['Agence Centrale', 'Agence Nord', 'Agence Sud', 'Agence Est', 'Agence Ouest'],
      
      // Colonnes de transaction
      'Code_Transaction': ['TRX001', 'TRX002', 'TRX003', 'TRX004', 'TRX005'],
      'Type_Transaction': ['VENTE', 'ACHAT', 'REMBOURSEMENT', 'VIREMENT', 'PAIEMENT'],
      'Montant': ['1000.00', '2500.50', '500.25', '1500.75', '3000.00'],
      
      // Colonnes de client
      'Code_Client': ['CLI001', 'CLI002', 'CLI003', 'CLI004', 'CLI005'],
      'Nom_Client': ['Dupont', 'Martin', 'Bernard', 'Petit', 'Robert'],
      'Prenom_Client': ['Jean', 'Marie', 'Pierre', 'Sophie', 'Paul'],
      
      // Colonnes de compte
      'Code_Compte': ['ACC001', 'ACC002', 'ACC003', 'ACC004', 'ACC005'],
      'Type_Compte': ['COURANT', 'EPARGNE', 'TERME', 'INVESTISSEMENT'],
      'Solde': ['5000.00', '12000.50', '2500.25', '8000.75', '15000.00'],
      
      // Colonnes génériques
      'Statut': ['ACTIF', 'INACTIF', 'EN_ATTENTE', 'BLOQUE'],
      'Devise': ['EUR', 'USD', 'GBP', 'JPY', 'CHF'],
      'Categorie': ['ALIMENTATION', 'TRANSPORT', 'LOISIRS', 'SANTE', 'EDUCATION'],
      'Region': ['NORD', 'SUD', 'EST', 'OUEST', 'CENTRE'],
      'Departement': ['FINANCE', 'RH', 'IT', 'MARKETING', 'VENTES'],
      'Niveau': ['DEBUTANT', 'INTERMEDIAIRE', 'AVANCE', 'EXPERT'],
      'Priorite': ['BASSE', 'MOYENNE', 'HAUTE', 'URGENTE'],
      'Statut_Paiement': ['EN_ATTENTE', 'PAYE', 'REFUSE', 'ANNULE'],
      
      // Colonnes d'adresse
      'Adresse': ['123 Rue de la Paix', '456 Avenue des Champs', '789 Boulevard Central'],
      'Ville': ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'],
      'Code_Postal': ['75001', '69001', '13001', '31000', '06000'],
      
      // Colonnes de contact
      'Telephone': ['01.23.45.67.89', '04.78.90.12.34', '05.61.23.45.67'],
      'Email': ['contact@agence.fr', 'info@banque.com', 'service@finance.net'],
      
      // Colonnes de description
      'Description': ['Transaction standard', 'Paiement en ligne', 'Virement interbancaire', 'Remboursement'],
      
      // Colonnes de date
      'Date_Transaction': ['2025-01-15', '2025-01-16', '2025-01-17', '2025-01-18'],
      'Date_Ouverture': ['2020-01-01', '2021-03-15', '2022-06-20', '2023-09-10'],
      
      // Colonnes Orange Money
      'N°': ['1', '2', '3', '4', '5'],
      'Heure': ['09:30', '10:15', '11:45', '14:20', '16:30'],
      'Référence': ['REF001', 'REF002', 'REF003', 'REF004', 'REF005'],
      'Service': ['Orange Money', 'Transfert', 'Paiement', 'Recharge'],
      'Paiement': ['Débit', 'Crédit', 'Transfert', 'Paiement'],
      'Mode': ['Mobile', 'Web', 'SMS', 'USSD'],
      'N° de Compte': ['656250168', '693511313', '41052831'],
      'Wallet': ['Orange Money', 'Mobile Money', 'E-Wallet'],
      'N° Pseudo': ['USER001', 'USER002', 'USER003'],
      'Débit': ['1000', '2500', '500', '1500'],
      'Crédit': ['5000', '12000', '2500', '8000'],
      'Compte: 656250168': ['656250168'],
      'Sous-réseau': ['Réseau 1', 'Réseau 2', 'Réseau 3'],
      
      // Colonnes génériques pour les noms de colonnes courants
      'date': ['2025-01-15', '2025-01-16', '2025-01-17', '2025-01-18'],
      'montant': ['1000.00', '2500.50', '500.25', '1500.75', '3000.00'],
      'description': ['Transaction standard', 'Paiement en ligne', 'Virement interbancaire'],
      'reference': ['REF001', 'REF002', 'REF003', 'REF004', 'REF005'],
      'type': ['VENTE', 'ACHAT', 'REMBOURSEMENT', 'VIREMENT', 'PAIEMENT'],
      'code': ['CODE001', 'CODE002', 'CODE003', 'CODE004', 'CODE005'],
      'nom': ['Dupont', 'Martin', 'Bernard', 'Petit', 'Robert'],
      'prenom': ['Jean', 'Marie', 'Pierre', 'Sophie', 'Paul'],
      'ville': ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'],
      'adresse': ['123 Rue de la Paix', '456 Avenue des Champs', '789 Boulevard Central'],
      'telephone': ['01.23.45.67.89', '04.78.90.12.34', '05.61.23.45.67'],
      'email': ['contact@agence.fr', 'info@banque.com', 'service@finance.net']
    };

    // Rechercher une correspondance exacte
    if (mockData[columnName]) {
      console.log('✅ Valeurs mockées trouvées pour:', columnName, mockData[columnName]);
      return mockData[columnName];
    }

    // Rechercher une correspondance partielle (insensible à la casse)
    const columnNameLower = columnName.toLowerCase();
    for (const [key, values] of Object.entries(mockData)) {
      if (key.toLowerCase().includes(columnNameLower) || columnNameLower.includes(key.toLowerCase())) {
        console.log('✅ Correspondance partielle trouvée:', key, 'pour', columnName);
        return values;
      }
    }

    // Valeurs génériques par défaut
    console.log('🔄 Utilisation des valeurs génériques pour:', columnName);
    return ['Valeur1', 'Valeur2', 'Valeur3', 'Valeur4', 'Valeur5'];
  }

  /**
   * Retourne les valeurs appropriées pour un champ donné, en tenant compte du type de fichier
   */
  getFieldValues(fieldName: string, fileName?: string): string[] {
    // Si c'est un fichier Orange Money, utiliser les valeurs spécifiques
    if (fileName && this.isOrangeMoneyFile(fileName)) {
      const orangeMoneyValues = this.getOrangeMoneyFieldValues(fieldName);
      if (orangeMoneyValues.length > 0) {
        return orangeMoneyValues;
      }
    }
    
    // Sinon, utiliser les valeurs mockées par défaut
    return this.getMockColumnValues(fieldName);
  }
} 