-- Script de test pour vérifier les logiques d'annulation et de suppression
-- Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

-- 1. VÉRIFIER LES OPÉRATIONS D'ANNULATION ET LEURS IMPACTS
SELECT 
    'OPÉRATIONS D\'ANNULATION' as type_verification,
    o.id,
    o.type_operation,
    o.montant,
    o.solde_avant,
    o.solde_apres,
    o.solde_apres - o.solde_avant as impact_solde,
    o.statut,
    o.nom_bordereau,
    o.parent_operation_id,
    c.numero_compte
FROM operation o
JOIN compte c ON o.compte_id = c.id
WHERE o.type_operation LIKE 'annulation_%'
ORDER BY o.date_operation DESC
LIMIT 20;

-- 2. VÉRIFIER QUE LES ANNULATIONS ONT UN IMPACT INVERSE
SELECT 
    'VÉRIFICATION IMPACT INVERSE' as type_verification,
    o_original.id as operation_originale_id,
    o_original.type_operation as type_original,
    o_original.montant as montant_original,
    o_annulation.id as operation_annulation_id,
    o_annulation.type_operation as type_annulation,
    o_annulation.montant as montant_annulation,
    o_original.solde_apres - o_original.solde_avant as impact_original,
    o_annulation.solde_apres - o_annulation.solde_avant as impact_annulation,
    (o_original.solde_apres - o_original.solde_avant) + (o_annulation.solde_apres - o_annulation.solde_avant) as impact_total,
    CASE 
        WHEN ABS((o_original.solde_apres - o_original.solde_avant) + (o_annulation.solde_apres - o_annulation.solde_avant)) < 0.01 
        THEN '✅ CORRECT' 
        ELSE '❌ INCORRECT' 
    END as verification
FROM operation o_original
JOIN operation o_annulation ON o_annulation.parent_operation_id = o_original.id
WHERE o_annulation.type_operation LIKE 'annulation_%'
ORDER BY o_original.date_operation DESC
LIMIT 10;

-- 3. VÉRIFIER LES OPÉRATIONS SUPPRIMÉES (historique des logs)
SELECT 
    'OPÉRATIONS SUPPRIMÉES (VÉRIFICATION LOGIQUE)' as type_verification,
    'Les opérations supprimées ne doivent PAS avoir d\'impact sur le solde' as logique_attendue,
    'Vérifiez les logs de l\'application pour voir les suppressions' as verification_manuelle;

-- 4. ANALYSER LES SOLDES AVANT/APRÈS ANNULATION
SELECT 
    'ANALYSE SOLDES ANNULATION' as type_verification,
    c.id as compte_id,
    c.numero_compte,
    c.solde as solde_actuel,
    COUNT(CASE WHEN o.type_operation NOT LIKE 'annulation_%' AND (o.statut IS NULL OR o.statut != 'Annulée') THEN 1 END) as operations_valides,
    COUNT(CASE WHEN o.type_operation LIKE 'annulation_%' THEN 1 END) as operations_annulation,
    COALESCE(SUM(
        CASE 
            WHEN o.type_operation NOT LIKE 'annulation_%' AND (o.statut IS NULL OR o.statut != 'Annulée') THEN
                CASE 
                    WHEN o.type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'transaction_cree') 
                    THEN -o.montant 
                    WHEN o.type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
                    THEN o.montant 
                    ELSE 0 
                END
            ELSE 0
        END
    ), 0) as solde_calcule_sans_annulations,
    COALESCE(SUM(
        CASE 
            WHEN o.type_operation LIKE 'annulation_%' THEN
                CASE 
                    WHEN o.type_operation = 'annulation_total_cashin' THEN o.montant
                    WHEN o.type_operation = 'annulation_total_paiement' THEN -o.montant
                    WHEN o.type_operation = 'annulation_FRAIS_TRANSACTION' THEN o.montant
                    ELSE 0 
                END
            ELSE 0
        END
    ), 0) as impact_annulations,
    c.solde - COALESCE(SUM(
        CASE 
            WHEN o.type_operation NOT LIKE 'annulation_%' AND (o.statut IS NULL OR o.statut != 'Annulée') THEN
                CASE 
                    WHEN o.type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'transaction_cree') 
                    THEN -o.montant 
                    WHEN o.type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
                    THEN o.montant 
                    ELSE 0 
                END
            ELSE 0
        END
    ), 0) - COALESCE(SUM(
        CASE 
            WHEN o.type_operation LIKE 'annulation_%' THEN
                CASE 
                    WHEN o.type_operation = 'annulation_total_cashin' THEN o.montant
                    WHEN o.type_operation = 'annulation_total_paiement' THEN -o.montant
                    WHEN o.type_operation = 'annulation_FRAIS_TRANSACTION' THEN o.montant
                    ELSE 0 
                END
            ELSE 0
        END
    ), 0) as difference
FROM compte c
LEFT JOIN operation o ON c.id = o.compte_id
GROUP BY c.id, c.numero_compte, c.solde
HAVING ABS(difference) > 0.01
ORDER BY ABS(difference) DESC;

-- 5. VÉRIFIER LA COHÉRENCE DES FRUIS D'ANNULATION
SELECT 
    'COHÉRENCE FRUIS D\'ANNULATION' as type_verification,
    o_frais.id as frais_id,
    o_frais.type_operation as frais_type,
    o_frais.montant as frais_montant,
    o_frais.statut as frais_statut,
    o_annulation.id as annulation_frais_id,
    o_annulation.type_operation as annulation_type,
    o_annulation.montant as annulation_montant,
    o_annulation.statut as annulation_statut,
    CASE 
        WHEN o_annulation.id IS NOT NULL AND ABS(o_frais.montant - o_annulation.montant) < 0.01 
        THEN '✅ COHÉRENT' 
        WHEN o_frais.statut = 'Annulée' AND o_annulation.id IS NULL
        THEN '❌ ANNULATION MANQUANTE'
        ELSE '⚠️ À VÉRIFIER'
    END as coherence
FROM operation o_frais
LEFT JOIN operation o_annulation ON o_annulation.parent_operation_id = o_frais.id 
    AND o_annulation.type_operation = 'annulation_FRAIS_TRANSACTION'
WHERE o_frais.type_operation = 'FRAIS_TRANSACTION'
ORDER BY o_frais.date_operation DESC
LIMIT 15;

-- 6. RÉSUMÉ DES VÉRIFICATIONS
SELECT 
    'RÉSUMÉ DES VÉRIFICATIONS' as type_verification,
    COUNT(CASE WHEN o.type_operation LIKE 'annulation_%' THEN 1 END) as total_annulations,
    COUNT(CASE WHEN o.type_operation = 'annulation_total_cashin' THEN 1 END) as annulations_cashin,
    COUNT(CASE WHEN o.type_operation = 'annulation_total_paiement' THEN 1 END) as annulations_paiement,
    COUNT(CASE WHEN o.type_operation = 'annulation_FRAIS_TRANSACTION' THEN 1 END) as annulations_frais,
    COUNT(CASE WHEN o.statut = 'Annulée' THEN 1 END) as operations_marquees_annulees
FROM operation o;
