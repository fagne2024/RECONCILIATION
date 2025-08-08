-- Script de mise à jour des types d'opérations
-- Changement de "approvisionnement" vers "Appro_client"
-- Changement de "compense" vers "Compense_client"

-- 1. Mise à jour des opérations de type "approvisionnement" vers "Appro_client"
UPDATE operation 
SET type_operation = 'Appro_client' 
WHERE type_operation = 'approvisionnement';

-- 2. Mise à jour des opérations de type "compense" vers "Compense_client"
UPDATE operation 
SET type_operation = 'Compense_client' 
WHERE type_operation = 'compense';

-- 3. Mise à jour des opérations d'annulation correspondantes
-- Annulation d'approvisionnement vers annulation d'Appro_client
UPDATE operation 
SET type_operation = 'annulation_Appro_client' 
WHERE type_operation = 'annulation_approvisionnement';

-- Annulation de compense vers annulation de Compense_client
UPDATE operation 
SET type_operation = 'annulation_Compense_client' 
WHERE type_operation = 'annulation_compense';

-- 4. Vérification des mises à jour
-- Compter les opérations mises à jour
SELECT 
    'Appro_client' as type_operation,
    COUNT(*) as nombre_operations
FROM operation 
WHERE type_operation = 'Appro_client'
UNION ALL
SELECT 
    'Compense_client' as type_operation,
    COUNT(*) as nombre_operations
FROM operation 
WHERE type_operation = 'Compense_client'
UNION ALL
SELECT 
    'annulation_Appro_client' as type_operation,
    COUNT(*) as nombre_operations
FROM operation 
WHERE type_operation = 'annulation_Appro_client'
UNION ALL
SELECT 
    'annulation_Compense_client' as type_operation,
    COUNT(*) as nombre_operations
FROM operation 
WHERE type_operation = 'annulation_Compense_client';

-- 5. Vérification qu'il ne reste plus d'anciens types
SELECT 
    type_operation,
    COUNT(*) as nombre_operations
FROM operation 
WHERE type_operation IN ('approvisionnement', 'compense', 'annulation_approvisionnement', 'annulation_compense')
GROUP BY type_operation;
