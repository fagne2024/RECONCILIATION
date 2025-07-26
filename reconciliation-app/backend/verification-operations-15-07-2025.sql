-- Vérification des opérations du 15/07/2025
-- Solde calculé: 102,402,800.59
-- Solde attendu: 43,274,664.59
-- Différence: 59,128,136.00

-- 1. Vérifier toutes les opérations du 15/07/2025
SELECT 
    id,
    type_operation,
    montant,
    solde_avant,
    solde_apres,
    service,
    code_proprietaire,
    nom_bordereau,
    date_operation,
    statut
FROM operation 
WHERE DATE(date_operation) = '2025-07-15'
ORDER BY date_operation, id;

-- 2. Calculer le total des montants par type d'opération
SELECT 
    type_operation,
    COUNT(*) as nombre_operations,
    SUM(montant) as total_montant,
    SUM(CASE 
        WHEN type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'annulation_bo', 'annulation_partenaire', 'transaction_cree') 
        THEN -montant 
        WHEN type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
        THEN montant 
        ELSE 0 
    END) as impact_solde
FROM operation 
WHERE DATE(date_operation) = '2025-07-15'
GROUP BY type_operation
ORDER BY type_operation;

-- 3. Vérifier les soldes d'ouverture et de clôture
SELECT 
    MIN(solde_avant) as solde_ouverture,
    MAX(solde_apres) as solde_cloture,
    MAX(solde_apres) - MIN(solde_avant) as variation_totale
FROM operation 
WHERE DATE(date_operation) = '2025-07-15';

-- 4. Vérifier les opérations de frais spécifiquement
SELECT 
    id,
    type_operation,
    montant,
    service,
    code_proprietaire,
    nom_bordereau,
    date_operation
FROM operation 
WHERE DATE(date_operation) = '2025-07-15'
AND type_operation = 'FRAIS_TRANSACTION'
ORDER BY date_operation;

-- 5. Vérifier les opérations d'annulation
SELECT 
    id,
    type_operation,
    montant,
    service,
    code_proprietaire,
    nom_bordereau,
    date_operation
FROM operation 
WHERE DATE(date_operation) = '2025-07-15'
AND type_operation IN ('annulation_bo', 'annulation_partenaire')
ORDER BY date_operation;

-- 6. Vérifier les opérations de transaction_cree
SELECT 
    id,
    type_operation,
    montant,
    service,
    code_proprietaire,
    nom_bordereau,
    date_operation
FROM operation 
WHERE DATE(date_operation) = '2025-07-15'
AND type_operation = 'transaction_cree'
ORDER BY date_operation;

-- 7. Calculer l'impact total sur le solde
SELECT 
    'Total Débits' as type,
    SUM(CASE 
        WHEN type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'annulation_bo', 'annulation_partenaire', 'transaction_cree') 
        THEN montant 
        ELSE 0 
    END) as montant
FROM operation 
WHERE DATE(date_operation) = '2025-07-15'

UNION ALL

SELECT 
    'Total Crédits' as type,
    SUM(CASE 
        WHEN type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
        THEN montant 
        ELSE 0 
    END) as montant
FROM operation 
WHERE DATE(date_operation) = '2025-07-15'

UNION ALL

SELECT 
    'Impact Net' as type,
    SUM(CASE 
        WHEN type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'annulation_bo', 'annulation_partenaire', 'transaction_cree') 
        THEN -montant 
        WHEN type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
        THEN montant 
        ELSE 0 
    END) as montant
FROM operation 
WHERE DATE(date_operation) = '2025-07-15';

-- 8. Vérifier les opérations avec des montants suspects (très élevés)
SELECT 
    id,
    type_operation,
    montant,
    service,
    code_proprietaire,
    nom_bordereau,
    date_operation
FROM operation 
WHERE DATE(date_operation) = '2025-07-15'
AND montant > 1000000  -- Montants supérieurs à 1 million
ORDER BY montant DESC;

-- 9. Vérifier les opérations avec des soldes négatifs
SELECT 
    id,
    type_operation,
    montant,
    solde_avant,
    solde_apres,
    service,
    code_proprietaire,
    nom_bordereau,
    date_operation
FROM operation 
WHERE DATE(date_operation) = '2025-07-15'
AND (solde_avant < 0 OR solde_apres < 0)
ORDER BY date_operation;

-- 10. Vérifier la cohérence des soldes (solde_apres = solde_avant + impact)
SELECT 
    id,
    type_operation,
    montant,
    solde_avant,
    solde_apres,
    CASE 
        WHEN type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'annulation_bo', 'annulation_partenaire', 'transaction_cree') 
        THEN solde_avant - montant
        WHEN type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
        THEN solde_avant + montant
        ELSE solde_avant
    END as solde_calcule,
    solde_apres as solde_reel,
    CASE 
        WHEN type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'annulation_bo', 'annulation_partenaire', 'transaction_cree') 
        THEN solde_avant - montant
        WHEN type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
        THEN solde_avant + montant
        ELSE solde_avant
    END - solde_apres as difference
FROM operation 
WHERE DATE(date_operation) = '2025-07-15'
ORDER BY date_operation, id; 