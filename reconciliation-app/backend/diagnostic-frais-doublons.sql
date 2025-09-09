-- Diagnostic des frais en double
-- Vérifier s'il y a des frais dupliqués pour les mêmes opérations

-- 1. Vérifier les frais avec le même parentOperationId
SELECT 
    'Frais avec même parentOperationId' as type_diagnostic,
    parent_operation_id,
    COUNT(*) as nombre_frais,
    GROUP_CONCAT(id) as ids_frais,
    GROUP_CONCAT(montant) as montants,
    GROUP_CONCAT(nom_bordereau) as bordereaux
FROM operation 
WHERE type_operation = 'FRAIS_TRANSACTION' 
AND parent_operation_id IS NOT NULL
GROUP BY parent_operation_id
HAVING COUNT(*) > 1
ORDER BY parent_operation_id;

-- 2. Vérifier les frais avec le même bordereau
SELECT 
    'Frais avec même bordereau' as type_diagnostic,
    nom_bordereau,
    COUNT(*) as nombre_frais,
    GROUP_CONCAT(id) as ids_frais,
    GROUP_CONCAT(montant) as montants,
    GROUP_CONCAT(parent_operation_id) as parents
FROM operation 
WHERE type_operation = 'FRAIS_TRANSACTION' 
AND nom_bordereau IS NOT NULL
GROUP BY nom_bordereau
HAVING COUNT(*) > 1
ORDER BY nom_bordereau;

-- 3. Vérifier les frais pour la même date, agence et service
SELECT 
    'Frais même date/agence/service' as type_diagnostic,
    DATE(date_operation) as date_op,
    code_proprietaire,
    service,
    COUNT(*) as nombre_frais,
    GROUP_CONCAT(id) as ids_frais,
    GROUP_CONCAT(montant) as montants,
    GROUP_CONCAT(nom_bordereau) as bordereaux
FROM operation 
WHERE type_operation = 'FRAIS_TRANSACTION' 
GROUP BY DATE(date_operation), code_proprietaire, service
HAVING COUNT(*) > 1
ORDER BY date_op, code_proprietaire, service;

-- 4. Statistiques générales des frais
SELECT 
    'Statistiques générales' as type_diagnostic,
    COUNT(*) as total_frais,
    COUNT(DISTINCT parent_operation_id) as frais_avec_parent_unique,
    COUNT(CASE WHEN parent_operation_id IS NULL THEN 1 END) as frais_sans_parent,
    COUNT(DISTINCT nom_bordereau) as bordereaux_uniques,
    SUM(montant) as total_montant_frais
FROM operation 
WHERE type_operation = 'FRAIS_TRANSACTION';

-- 5. Vérifier les opérations qui ont plusieurs frais associés
SELECT 
    'Opérations avec plusieurs frais' as type_diagnostic,
    o.id as operation_id,
    o.type_operation,
    o.service,
    o.code_proprietaire,
    o.date_operation,
    COUNT(f.id) as nombre_frais_associes,
    GROUP_CONCAT(f.id) as ids_frais,
    GROUP_CONCAT(f.montant) as montants_frais
FROM operation o
LEFT JOIN operation f ON f.parent_operation_id = o.id AND f.type_operation = 'FRAIS_TRANSACTION'
WHERE o.type_operation != 'FRAIS_TRANSACTION'
GROUP BY o.id, o.type_operation, o.service, o.code_proprietaire, o.date_operation
HAVING COUNT(f.id) > 1
ORDER BY o.date_operation DESC, o.id;

-- 6. Vérifier les frais orphelins (sans parent valide)
SELECT 
    'Frais orphelins' as type_diagnostic,
    f.id as frais_id,
    f.parent_operation_id,
    f.montant,
    f.nom_bordereau,
    f.date_operation,
    f.service,
    f.code_proprietaire,
    CASE 
        WHEN o.id IS NULL THEN 'Parent inexistant'
        ELSE 'Parent existe'
    END as statut_parent
FROM operation f
LEFT JOIN operation o ON o.id = f.parent_operation_id
WHERE f.type_operation = 'FRAIS_TRANSACTION'
AND (f.parent_operation_id IS NULL OR o.id IS NULL)
ORDER BY f.date_operation DESC;
