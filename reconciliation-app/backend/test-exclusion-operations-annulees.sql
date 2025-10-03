-- Script de test pour vérifier l'exclusion des opérations d'annulation dans les relevés de compte
-- Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

-- 1. VÉRIFIER LES OPÉRATIONS D'ANNULATION EXISTANTES
SELECT 
    'OPÉRATIONS D\'ANNULATION PAR TYPE' as type_verification,
    type_operation,
    COUNT(*) as nombre_operations,
    COALESCE(SUM(montant), 0) as montant_total
FROM operation 
WHERE type_operation LIKE 'annulation_%'
GROUP BY type_operation
ORDER BY nombre_operations DESC;

-- 2. VÉRIFIER LES OPÉRATIONS AVEC STATUT 'ANNULÉE'
SELECT 
    'OPÉRATIONS AVEC STATUT ANNULÉE' as type_verification,
    statut,
    COUNT(*) as nombre_operations,
    COALESCE(SUM(montant), 0) as montant_total
FROM operation 
WHERE statut = 'Annulée'
GROUP BY statut;

-- 3. VÉRIFIER L'IMPACT SUR LES RELEVÉS DE COMPTE
-- Comparer le nombre d'opérations avant et après filtrage
SELECT 
    'IMPACT SUR RELEVÉS - COMPTE SAMPLE' as type_verification,
    'Total opérations' as categorie,
    COUNT(*) as nombre_operations
FROM operation o
JOIN compte c ON o.compte_id = c.id
WHERE c.numero_compte = (SELECT numero_compte FROM compte LIMIT 1)
UNION ALL
SELECT 
    'IMPACT SUR RELEVÉS - COMPTE SAMPLE' as type_verification,
    'Après filtrage (sans annulations)' as categorie,
    COUNT(*) as nombre_operations
FROM operation o
JOIN compte c ON o.compte_id = c.id
WHERE c.numero_compte = (SELECT numero_compte FROM compte LIMIT 1)
  AND o.type_operation NOT LIKE 'annulation_%'
  AND (o.statut IS NULL OR o.statut != 'Annulée');

-- 4. VÉRIFIER LES TYPES D'OPÉRATIONS EXCLUS
SELECT 
    'TYPES D\'OPÉRATIONS QUI SERONT EXCLUS' as type_verification,
    type_operation,
    COUNT(*) as nombre_operations,
    COALESCE(SUM(montant), 0) as montant_total
FROM operation 
WHERE type_operation LIKE 'annulation_%' 
   OR statut = 'Annulée'
GROUP BY type_operation
ORDER BY nombre_operations DESC;

-- 5. VÉRIFIER QU'AUCUNE OPÉRATION D'ANNULATION N'APPARAÎT DANS LES RELEVÉS
-- Test sur un compte spécifique
SELECT 
    'TEST EXCLUSION - COMPTE SAMPLE' as type_verification,
    'Opérations d\'annulation trouvées' as resultat,
    COUNT(*) as nombre
FROM operation o
JOIN compte c ON o.compte_id = c.id
WHERE c.numero_compte = (SELECT numero_compte FROM compte LIMIT 1)
  AND (o.type_operation LIKE 'annulation_%' OR o.statut = 'Annulée');

-- 6. VÉRIFIER LES SOLDES AVANT ET APRÈS FILTRAGE
-- Calculer l'impact sur les soldes
SELECT 
    'IMPACT SUR SOLDES' as type_verification,
    'Avec opérations d\'annulation' as mode_calcul,
    COALESCE(SUM(
        CASE 
            WHEN type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'annulation_bo', 'annulation_partenaire', 'transaction_cree') 
            THEN -montant 
            WHEN type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
            THEN montant 
            ELSE 0 
        END
    ), 0) as solde_calcule
FROM operation
UNION ALL
SELECT 
    'IMPACT SUR SOLDES' as type_verification,
    'Sans opérations d\'annulation' as mode_calcul,
    COALESCE(SUM(
        CASE 
            WHEN type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'transaction_cree') 
            THEN -montant 
            WHEN type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
            THEN montant 
            ELSE 0 
        END
    ), 0) as solde_calcule
FROM operation
WHERE type_operation NOT LIKE 'annulation_%'
  AND (statut IS NULL OR statut != 'Annulée');
