export interface OperationBancaire {
    id?: number;
    pays: string;
    codePays?: string;
    mois?: string;
    dateOperation: string;
    agence: string;
    typeOperation: string;
    nomBeneficiaire?: string;
    compteADebiter?: string;
    montant: number;
    modePaiement?: string;
    reference?: string;
    idGlpi?: string;
    bo?: string;
    statut: string;
    operationId?: number; // Lien avec l'opération d'origine
    reconStatus?: 'OK' | 'KO';
}

export interface OperationBancaireCreateRequest {
    pays: string;
    codePays?: string;
    mois?: string;
    dateOperation: string;
    agence: string;
    typeOperation: string;
    nomBeneficiaire?: string;
    compteADebiter?: string;
    montant: number;
    modePaiement?: string;
    reference?: string;
    idGlpi?: string;
    bo?: string;
    statut: string;
    operationId?: number;
}

export interface OperationBancaireUpdateRequest {
    pays?: string;
    codePays?: string;
    mois?: string;
    dateOperation?: string;
    agence?: string;
    typeOperation?: string;
    nomBeneficiaire?: string;
    compteADebiter?: string;
    montant?: number;
    modePaiement?: string;
    reference?: string;
    idGlpi?: string;
    bo?: string;
    statut?: string;
    operationId?: number;
}

export interface OperationBancaireFilter {
    pays?: string;
    codePays?: string;
    mois?: string;
    agence?: string;
    typeOperation?: string;
    statut?: string;
    dateDebut?: string;
    dateFin?: string;
    reference?: string;
}

