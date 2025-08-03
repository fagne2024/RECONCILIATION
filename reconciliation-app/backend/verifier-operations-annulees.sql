-- Script pour vérifier les opérations annulées avant suppression
-- Date de création: 2025-07-31
-- Description: Ce script permet de vérifier combien d'opérations annulées existent

-- 1. Compter le nombre total d'opérations annulées
SELECT 
    'TOTAL OPÉRATIONS ANNULEES' as type,
    COUNT(*) as nombre_operations,
    COALESCE(SUM(montant), 0) as montant_total
FROM operation 
WHERE statut = 'Annulée';

-- 2. Répartition des opérations annulées par type d'opération
SELECT 
    type_operation,
    COUNT(*) as nombre_operations,
    COALESCE(SUM(montant), 0) as montant_total,
    MIN(date_operation) as date_plus_ancienne,
    MAX(date_operation) as date_plus_recente
FROM operation 
WHERE statut = 'Annulée'
GROUP BY type_operation
ORDER BY nombre_operations DESC;

-- 3. Répartition des opérations annulées par service
SELECT 
    service,
    COUNT(*) as nombre_operations,
    COALESCE(SUM(montant), 0) as montant_total
FROM operation 
WHERE statut = 'Annulée'
GROUP BY service
ORDER BY nombre_operations DESC;

-- 4. Répartition des opérations annulées par agence (code_proprietaire)
SELECT 
    code_proprietaire,
    COUNT(*) as nombre_operations,
    COALESCE(SUM(montant), 0) as montant_total
FROM operation 
WHERE statut = 'Annulée'
GROUP BY code_proprietaire
ORDER BY nombre_operations DESC;

-- 5. Répartition des opérations annulées par mois
SELECT 
    DATE_FORMAT(date_operation, '%Y-%m') as mois,
    COUNT(*) as nombre_operations,
    COALESCE(SUM(montant), 0) as montant_total
FROM operation 
WHERE statut = 'Annulée'
GROUP BY DATE_FORMAT(date_operation, '%Y-%m')
ORDER BY mois DESC;

-- 6. Détails des 10 dernières opérations annulées
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
ORDER BY date_operation DESC
LIMIT 10;

-- 7. Vérifier s'il y a des opérations annulées avec des références
SELECT 
    'OPÉRATIONS ANNULEES AVEC RÉFÉRENCE' as type,
    COUNT(*) as nombre_operations
FROM operation 
WHERE statut = 'Annulée' 
AND reference IS NOT NULL 
AND reference != '';

-- 8. Vérifier s'il y a des opérations annulées avec des bordereaux
SELECT 
    'OPÉRATIONS ANNULEES AVEC BORDEREAU' as type,
    COUNT(*) as nombre_operations
FROM operation 
WHERE statut = 'Annulée' 
AND nom_bordereau IS NOT NULL 
AND nom_bordereau != ''; 