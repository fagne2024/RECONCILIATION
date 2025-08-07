-- =====================================================
-- Script SQL pour mettre a jour les commentaires des impacts OP
-- Auteur: Assistant IA
-- Date: $(Get-Date -Format "yyyy-MM-dd")
-- =====================================================

-- Afficher les statistiques avant mise a jour
SELECT 
    'AVANT MISE A JOUR' as periode,
    COUNT(*) as total_impacts,
    SUM(CASE WHEN UPPER(type_operation) LIKE '%TSOP%' THEN 1 ELSE 0 END) as impacts_tsop,
    SUM(CASE WHEN UPPER(type_operation) NOT LIKE '%TSOP%' THEN 1 ELSE 0 END) as impacts_autres,
    SUM(CASE WHEN commentaire = 'TSOP' THEN 1 ELSE 0 END) as commentaires_tsop,
    SUM(CASE WHEN commentaire = 'IMPACT J+1' THEN 1 ELSE 0 END) as commentaires_j1,
    SUM(CASE WHEN commentaire IS NULL OR commentaire = '' THEN 1 ELSE 0 END) as commentaires_vides
FROM impact_op;

-- =====================================================
-- MISE A JOUR DES COMMENTAIRES
-- =====================================================

-- 1. Mettre a jour les impacts de type TSOP
UPDATE impact_op 
SET 
    commentaire = 'TSOP',
    updated_at = NOW()
WHERE 
    UPPER(type_operation) LIKE '%TSOP%'
    AND (commentaire IS NULL OR commentaire != 'TSOP');

-- 2. Mettre a jour les autres impacts (non-TSOP)
UPDATE impact_op 
SET 
    commentaire = 'IMPACT J+1',
    updated_at = NOW()
WHERE 
    UPPER(type_operation) NOT LIKE '%TSOP%'
    AND (commentaire IS NULL OR commentaire != 'IMPACT J+1');

-- =====================================================
-- VERIFICATION APRES MISE A JOUR
-- =====================================================

-- Afficher les statistiques apres mise a jour
SELECT 
    'APRES MISE A JOUR' as periode,
    COUNT(*) as total_impacts,
    SUM(CASE WHEN UPPER(type_operation) LIKE '%TSOP%' THEN 1 ELSE 0 END) as impacts_tsop,
    SUM(CASE WHEN UPPER(type_operation) NOT LIKE '%TSOP%' THEN 1 ELSE 0 END) as impacts_autres,
    SUM(CASE WHEN commentaire = 'TSOP' THEN 1 ELSE 0 END) as commentaires_tsop,
    SUM(CASE WHEN commentaire = 'IMPACT J+1' THEN 1 ELSE 0 END) as commentaires_j1,
    SUM(CASE WHEN commentaire IS NULL OR commentaire = '' THEN 1 ELSE 0 END) as commentaires_vides
FROM impact_op;

-- =====================================================
-- DETAIL DES IMPACTS PAR TYPE
-- =====================================================

-- Afficher le detail des types d'operation et leurs commentaires
SELECT 
    type_operation,
    COUNT(*) as nombre_impacts,
    commentaire,
    CASE 
        WHEN UPPER(type_operation) LIKE '%TSOP%' THEN 'TSOP'
        ELSE 'IMPACT J+1'
    END as commentaire_attendu
FROM impact_op 
GROUP BY type_operation, commentaire
ORDER BY type_operation, commentaire;

-- =====================================================
-- VERIFICATION DES ANOMALIES
-- =====================================================

-- Afficher les impacts qui n'ont pas le bon commentaire
SELECT 
    id,
    type_operation,
    commentaire as commentaire_actuel,
    CASE 
        WHEN UPPER(type_operation) LIKE '%TSOP%' THEN 'TSOP'
        ELSE 'IMPACT J+1'
    END as commentaire_attendu
FROM impact_op 
WHERE 
    (UPPER(type_operation) LIKE '%TSOP%' AND commentaire != 'TSOP')
    OR (UPPER(type_operation) NOT LIKE '%TSOP%' AND commentaire != 'IMPACT J+1')
ORDER BY type_operation;

-- =====================================================
-- RESUME FINAL
-- =====================================================

SELECT 
    'RESUME FINAL' as info,
    COUNT(*) as total_impacts,
    CONCAT(
        SUM(CASE WHEN commentaire = 'TSOP' THEN 1 ELSE 0 END), 
        ' impacts TSOP'
    ) as impacts_tsop,
    CONCAT(
        SUM(CASE WHEN commentaire = 'IMPACT J+1' THEN 1 ELSE 0 END), 
        ' impacts J+1'
    ) as impacts_j1
FROM impact_op; 