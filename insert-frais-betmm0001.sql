-- Script SQL pour insérer les frais de transaction pour le client BETMM0001
-- Basé sur les données existantes avec BETCL8400

-- Insertion des frais de transaction pour BETMM0001
-- Les données sont basées sur les lignes fournies avec remplacement de BETCL8400 par BETMM0001

INSERT INTO frais_transaction (
    service, 
    agence, 
    montant_frais, 
    type_calcul, 
    pourcentage, 
    description, 
    actif, 
    date_creation, 
    date_modification
) VALUES 
-- CI_CASHIN_WAVE_LONACI - Frais en % 2.00% - FRAIS CI
('CI_CASHIN_WAVE_LONACI', 'BETMM0001', 0.0, 'POURCENTAGE', 2.00, 'FRAIS CI', TRUE, NOW(), NOW()),

-- CASHINMOOVPART_LONACI - Frais en % 2.00% - FRAIS CI  
('CASHINMOOVPART_LONACI', 'BETMM0001', 0.0, 'POURCENTAGE', 2.00, 'FRAIS CI', TRUE, NOW(), NOW()),

-- CASHINMTNPART_LONACI - Frais en % 2.00% - FRAIS CI
('CASHINMTNPART_LONACI', 'BETMM0001', 0.0, 'POURCENTAGE', 2.00, 'FRAIS CI', TRUE, NOW(), NOW()),

-- CASHINOMCIPART_LONACI - Frais en % 2.00% - FRAIS CI
('CASHINOMCIPART_LONACI', 'BETMM0001', 0.0, 'POURCENTAGE', 2.00, 'FRAIS CI', TRUE, NOW(), NOW()),

-- CI_PAIEMENTMARCHANDOM_LONACI - Frais en % 4.00% - FRAIS PM
('CI_PAIEMENTMARCHANDOM_LONACI', 'BETMM0001', 0.0, 'POURCENTAGE', 4.00, 'FRAIS PM', TRUE, NOW(), NOW()),

-- CI_PAIEMENTWAVE_LONACI - Frais en % 4.00% - FRAIS PM
('CI_PAIEMENTWAVE_LONACI', 'BETMM0001', 0.0, 'POURCENTAGE', 4.00, 'FRAIS PM', TRUE, NOW(), NOW()),

-- CI_PAIEMENTMARCHANDMOOV_LONACI - Frais en % 4.00% - FRAIS PM
('CI_PAIEMENTMARCHANDMOOV_LONACI', 'BETMM0001', 0.0, 'POURCENTAGE', 4.00, 'FRAIS PM', TRUE, NOW(), NOW()),

-- CI_PAIEMENTMARCHAND_MTNMOMO_LONACI - Frais en % 4.00% - FRAIS PM
('CI_PAIEMENTMARCHAND_MTNMOMO_LONACI', 'BETMM0001', 0.0, 'POURCENTAGE', 4.00, 'FRAIS PM', TRUE, NOW(), NOW());

-- Vérification des insertions
SELECT 
    service,
    agence,
    type_calcul,
    pourcentage,
    description,
    actif,
    date_creation
FROM frais_transaction 
WHERE agence = 'BETMM0001'
ORDER BY service;

-- Message de confirmation
SELECT 'Insertion terminée avec succès pour le client BETMM0001' AS message;
