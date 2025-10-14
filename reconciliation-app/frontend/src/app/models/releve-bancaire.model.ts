export interface ReleveBancaireRow {
  numeroCompte?: string;
  dateComptable?: string; // ISO date string
  dateValeur?: string;    // ISO date string
  libelle?: string;
  debit?: number;
  credit?: number;
  montant?: number;
  numeroCheque?: string;
  devise?: string;
  soldeCourant?: number;
  soldeDisponibleCloture?: number;
  soldeDisponibleOuverture?: number;
}

export interface ReleveUploadResponse {
  batchId: string;
  count: number;
  rows: ReleveBancaireRow[];
  totalRead: number;
  duplicatesIgnored: number;
  unmappedHeaders: string[];
}


