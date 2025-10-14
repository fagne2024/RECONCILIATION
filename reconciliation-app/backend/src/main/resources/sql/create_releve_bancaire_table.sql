CREATE TABLE IF NOT EXISTS releve_bancaire (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  numero_compte VARCHAR(255),
  date_comptable DATE,
  date_valeur DATE,
  libelle TEXT,
  debit DOUBLE,
  credit DOUBLE,
  montant DOUBLE,
  numero_cheque VARCHAR(255),
  devise VARCHAR(50),
  solde_courant DOUBLE,
  solde_disponible_cloture DOUBLE,
  solde_disponible_ouverture DOUBLE,
  source_filename VARCHAR(512),
  uploaded_at DATETIME
);


