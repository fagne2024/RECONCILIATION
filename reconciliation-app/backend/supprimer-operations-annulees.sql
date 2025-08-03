-- Script pour supprimer toutes les opérations dont le statut est "Annulée"
-- Date de création: 2025-07-31
-- Description: Ce script supprime définitivement toutes les opérations annulées de la base de données

-- 1. Afficher le nombre d'opérations annulées avant suppression
SELECT 
    'AVANT SUPPRESSION' as etape,
    COUNT(*) as nombre_operations_annulees,
    COALESCE(SUM(montant), 0) as montant_total_annulees
FROM operation 
WHERE statut = 'Annulée';

-- 2. Afficher les détails des opérations annulées (pour vérification)
SELECT 
    id,
    type_operation,
    date_operation,
    code_proprietaire,
    service,
    montant,
    statut,
    reference,
    nom_bordereau
FROM operation 
WHERE statut = 'Annulée'
ORDER BY date_operation DESC;

-- 3. SUPPRESSION DES OPÉRATIONS ANNULEES
-- ⚠️ ATTENTION: Cette opération est irréversible !
DELETE FROM operation 
WHERE statut = 'Annulée';

-- 4. Vérifier qu'il ne reste plus dls opérations annulées
SELECT 
    'APRÈS SUPPRESSION' as etape,
    COUNT(*) as nombre_operations_annulees_restantes
FROM operation 
WHERE statut = 'Annulée';

-- 5. Afficher le nombre total d'opérations restantes
SELECT 
    'TOTAL OPÉRATIONS RESTANTES' as etape,
    COUNT(*) as nombre_total_operations,
    COALESCE(SUM(montant), 0) as montant_total_operations
FROM operation;

-- 6. Afficher la répartition par statut
SELECT 
    statut,
    COUNT(*) as nombre_operations,
    COALESCE(SUM(montant), 0) as montant_total
FROM operation 
GROUP BY statut 
ORDER BY nombre_operations DESC; 