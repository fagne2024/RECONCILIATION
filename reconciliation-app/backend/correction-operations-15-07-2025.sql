-- Correction automatique des opérations du 15/07/2025
-- Basé sur les problèmes identifiés dans les corrections précédentes

-- 1. Vérifier et corriger les frais de transaction incorrects
-- Chercher les opérations de frais avec des montants suspects (> 100,000)
UPDATE operation 
SET montant = 31800.0  -- Frais fixe standard (106 transactions × 300 FCFA)
WHERE DATE(date_operation) = '2025-07-15'
AND type_operation = 'FRAIS_TRANSACTION'
AND montant > 100000
AND service = 'CASHINMTNCMPART';

-- 2. Vérifier et corriger les opérations d'annulation avec des montants incorrects
-- Les annulations ne devraient pas avoir des montants très élevés
UPDATE operation 
SET montant = ABS(montant)  -- S'assurer que le montant est positif
WHERE DATE(date_operation) = '2025-07-15'
AND type_operation IN ('annulation_bo', 'annulation_partenaire')
AND montant < 0;

-- 3. Vérifier et corriger les opérations transaction_cree avec des montants suspects
-- Les transactions créées ne devraient pas avoir des montants très élevés
UPDATE operation 
SET montant = CASE 
    WHEN montant > 10000000 THEN 1000000  -- Limiter à 1M si trop élevé
    ELSE montant 
END
WHERE DATE(date_operation) = '2025-07-15'
AND type_operation = 'transaction_cree'
AND montant > 10000000;

-- 4. Recalculer les soldes pour toutes les opérations du 15/07/2025
-- Créer une table temporaire pour stocker les opérations corrigées
CREATE TEMPORARY TABLE temp_operations_15_07 AS
SELECT 
    id,
    type_operation,
    montant,
    solde_avant,
    CASE 
        WHEN type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'annulation_bo', 'annulation_partenaire', 'transaction_cree') 
        THEN solde_avant - montant
        WHEN type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
        THEN solde_avant + montant
        ELSE solde_avant
    END as solde_apres_calcule
FROM operation 
WHERE DATE(date_operation) = '2025-07-15'
ORDER BY date_operation, id;

-- 5. Mettre à jour les soldes après calculés
UPDATE operation o
JOIN temp_operations_15_07 t ON o.id = t.id
SET o.solde_apres = t.solde_apres_calcule
WHERE DATE(o.date_operation) = '2025-07-15';

-- 6. Nettoyer la table temporaire
DROP TEMPORARY TABLE IF EXISTS temp_operations_15_07;

-- 7. Vérifier les corrections appliquées
SELECT 
    'Résumé des corrections' as info,
    COUNT(*) as nombre_operations,
    SUM(montant) as total_montant,
    MIN(solde_avant) as solde_ouverture,
    MAX(solde_apres) as solde_cloture,
    MAX(solde_apres) - MIN(solde_avant) as variation_totale
FROM operation 
WHERE DATE(date_operation) = '2025-07-15';

-- 8. Vérifier les opérations de frais corrigées
SELECT 
    'Frais corrigés' as type,
    id,
    type_operation,
    montant,
    service,
    code_proprietaire,
    nom_bordereau
FROM operation 
WHERE DATE(date_operation) = '2025-07-15'
AND type_operation = 'FRAIS_TRANSACTION'
ORDER BY montant DESC;

-- 9. Vérifier les opérations d'annulation corrigées
SELECT 
    'Annulations corrigées' as type,
    id,
    type_operation,
    montant,
    service,
    code_proprietaire,
    nom_bordereau
FROM operation 
WHERE DATE(date_operation) = '2025-07-15'
AND type_operation IN ('annulation_bo', 'annulation_partenaire')
ORDER BY montant DESC;

-- 10. Vérifier les opérations transaction_cree corrigées
SELECT 
    'Transactions créées corrigées' as type,
    id,
    type_operation,
    montant,
    service,
    code_proprietaire,
    nom_bordereau
FROM operation 
WHERE DATE(date_operation) = '2025-07-15'
AND type_operation = 'transaction_cree'
ORDER BY montant DESC;

-- 11. Calculer l'impact total après correction
SELECT 
    'Impact total après correction' as type,
    SUM(CASE 
        WHEN type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'annulation_bo', 'annulation_partenaire', 'transaction_cree') 
        THEN -montant 
        WHEN type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
        THEN montant 
        ELSE 0 
    END) as impact_net
FROM operation 
WHERE DATE(date_operation) = '2025-07-15'; 