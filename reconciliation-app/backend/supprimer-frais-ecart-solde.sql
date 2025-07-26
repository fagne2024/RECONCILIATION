-- Suppression des opérations de frais automatiques créées pour les écarts de solde
-- Ces opérations ont le format de bordereau: FEES_ECART_SOLDE_[DATE]_[AGENCE]

-- 1. Vérifier les opérations de frais à supprimer
SELECT 
    'Opérations à supprimer' as info,
    COUNT(*) as nombre_operations,
    SUM(montant) as total_montant
FROM operation 
WHERE nom_bordereau LIKE 'FEES_ECART_SOLDE_%'
AND type_operation = 'FRAIS_TRANSACTION';

-- 2. Afficher les détails des opérations à supprimer
SELECT 
    id,
    type_operation,
    montant,
    service,
    code_proprietaire,
    nom_bordereau,
    date_operation,
    solde_avant,
    solde_apres,
    statut
FROM operation 
WHERE nom_bordereau LIKE 'FEES_ECART_SOLDE_%'
AND type_operation = 'FRAIS_TRANSACTION'
ORDER BY date_operation, id;

-- 3. Supprimer les opérations de frais automatiques pour les écarts de solde
DELETE FROM operation 
WHERE nom_bordereau LIKE 'FEES_ECART_SOLDE_%'
AND type_operation = 'FRAIS_TRANSACTION';

-- 4. Vérifier que les suppressions ont été effectuées
SELECT 
    'Vérification après suppression' as info,
    COUNT(*) as nombre_operations_restantes
FROM operation 
WHERE nom_bordereau LIKE 'FEES_ECART_SOLDE_%'
AND type_operation = 'FRAIS_TRANSACTION';

-- 5. Afficher un résumé des opérations restantes par type
SELECT 
    type_operation,
    COUNT(*) as nombre_operations,
    SUM(montant) as total_montant
FROM operation 
WHERE nom_bordereau LIKE 'FEES_ECART_SOLDE_%'
GROUP BY type_operation
ORDER BY type_operation; 