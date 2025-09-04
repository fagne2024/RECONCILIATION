-- Script d'insertion des frais pour XBTBF2720
-- Basé sur les données FSLTO2796 fournies
-- Table: top20.frais_transaction

INSERT INTO top20.frais_transaction (service, agence, type_calcul, montant_frais, description, actif, date_creation, date_modification) VALUES
('BF_PAIEMENTMARCHAND_OM_TP', 'XBTBF2720', 'Frais en %', 3.00, 'FRAIS PAIEMENT MARCHAND XBTBF2720 (3.00%)', 1, '2025-08-27 17:38:00', '2025-08-27 17:40:00'),

('BF_PAIEMENTMARCHAND_MOBICASH_TP', 'XBTBF2720', 'Frais en %', 3.00, 'FRAIS PAIEMENT MARCHAND XBTBF2720 (3.00%)', 1, '2025-08-27 17:37:00', '2025-08-27 17:40:00'),

('BF_CASHIN_OM_PART', 'XBTBF2720', 'Frais en %', 2.50, 'FRAIS CASHIN XBTBF2720 (2.50%)', 1, '2025-08-27 17:26:00', '2025-08-27 17:39:00'),

('BF_CASHIN_MOBICASH_PART', 'XBTBF2720', 'Frais en %', 2.50, 'FRAIS CASHIN XBTBF2720 (2.50%)', 1, '2025-08-27 17:25:00', '2025-08-27 17:39:00');

-- Vérification de l'insertion
SELECT * FROM top20.frais_transaction WHERE agence = 'XBTBF2720' ORDER BY service;
