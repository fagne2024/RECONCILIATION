export interface ReleveBancaireRow {
  id?: number;
  numeroCompte?: string;
  nomCompte?: string;
  banque?: string; // code propriétaire
  dateComptable?: string | Date; // ISO date string or Date
  dateValeur?: string | Date;    // ISO date string or Date
  libelle?: string;
  debit?: number;
  credit?: number;
  montant?: number;
  numeroCheque?: string;
  devise?: string;
  soldeCourant?: number;
  soldeDisponibleCloture?: number;
  soldeDisponibleOuverture?: number;
  reconStatus?: 'OK' | 'KO';
}

export interface ReleveUploadResponse {
  batchId: string;
  count: number;
  rows: ReleveBancaireRow[];
  totalRead: number;
  duplicatesIgnored: number;
  unmappedHeaders: string[];
}


