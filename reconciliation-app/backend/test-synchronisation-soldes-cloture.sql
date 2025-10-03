-- Script de test pour vérifier la synchronisation des soldes de clôture
-- Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

-- 1. VÉRIFIER L'ÉTAT ACTUEL DES SOLDES
SELECT 
    'ÉTAT ACTUEL DES SOLDES' as type_verification,
    c.id as compte_id,
    c.numero_compte,
    c.solde as solde_compte,
    c.date_derniere_maj,
    COUNT(o.id) as nombre_operations_total,
    COUNT(CASE WHEN o.type_operation NOT LIKE 'annulation_%' AND (o.statut IS NULL OR o.statut != 'Annulée') THEN 1 END) as nombre_operations_valides
FROM compte c
LEFT JOIN operation o ON c.id = o.compte_id
GROUP BY c.id, c.numero_compte, c.solde, c.date_derniere_maj
ORDER BY c.numero_compte;

-- 2. CALCULER LE SOLDE DE CLÔTURE ATTENDU POUR CHAQUE COMPTE
SELECT 
    'SOLDE DE CLÔTURE ATTENDU' as type_verification,
    c.id as compte_id,
    c.numero_compte,
    c.solde as solde_actuel_compte,
    COALESCE(SUM(
        CASE 
            WHEN o.type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'transaction_cree') 
            THEN -o.montant 
            WHEN o.type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
            THEN o.montant 
            ELSE 0 
        END
    ), 0) as solde_cloture_calcule,
    c.solde - COALESCE(SUM(
        CASE 
            WHEN o.type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'transaction_cree') 
            THEN -o.montant 
            WHEN o.type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
            THEN o.montant 
            ELSE 0 
        END
    ), 0) as difference
FROM compte c
LEFT JOIN operation o ON c.id = o.compte_id 
    AND o.type_operation NOT LIKE 'annulation_%' 
    AND (o.statut IS NULL OR o.statut != 'Annulée')
GROUP BY c.id, c.numero_compte, c.solde
ORDER BY ABS(c.solde - COALESCE(SUM(
        CASE 
            WHEN o.type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'transaction_cree') 
            THEN -o.montant 
            WHEN o.type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
            THEN o.montant 
            ELSE 0 
        END
    ), 0)) DESC;

-- 3. IDENTIFIER LES COMPTES AVEC DES DIFFÉRENCES
SELECT 
    'COMPTES AVEC DIFFÉRENCES' as type_verification,
    c.id as compte_id,
    c.numero_compte,
    c.solde as solde_compte_actuel,
    COALESCE(SUM(
        CASE 
            WHEN o.type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'transaction_cree') 
            THEN -o.montant 
            WHEN o.type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
            THEN o.montant 
            ELSE 0 
        END
    ), 0) as solde_cloture_attendu,
    ROUND(c.solde - COALESCE(SUM(
        CASE 
            WHEN o.type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'transaction_cree') 
            THEN -o.montant 
            WHEN o.type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
            THEN o.montant 
            ELSE 0 
        END
    ), 0), 2) as difference
FROM compte c
LEFT JOIN operation o ON c.id = o.compte_id 
    AND o.type_operation NOT LIKE 'annulation_%' 
    AND (o.statut IS NULL OR o.statut != 'Annulée')
GROUP BY c.id, c.numero_compte, c.solde
HAVING ABS(c.solde - COALESCE(SUM(
        CASE 
            WHEN o.type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'transaction_cree') 
            THEN -o.montant 
            WHEN o.type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
            THEN o.montant 
            ELSE 0 
        END
    ), 0)) > 0.01
ORDER BY ABS(difference) DESC;

-- 4. VÉRIFIER LA DERNIÈRE OPÉRATION DE CHAQUE COMPTE
SELECT 
    'DERNIÈRE OPÉRATION PAR COMPTE' as type_verification,
    c.id as compte_id,
    c.numero_compte,
    o.id as derniere_operation_id,
    o.type_operation,
    o.montant,
    o.solde_avant,
    o.solde_apres,
    o.date_operation,
    o.statut
FROM compte c
LEFT JOIN (
    SELECT o1.*, ROW_NUMBER() OVER (PARTITION BY o1.compte_id ORDER BY o1.date_operation DESC) as rn
    FROM operation o1
    WHERE o1.type_operation NOT LIKE 'annulation_%' 
      AND (o1.statut IS NULL OR o1.statut != 'Annulée')
) o ON c.id = o.compte_id AND o.rn = 1
ORDER BY c.numero_compte;

-- 5. STATISTIQUES GLOBALES
SELECT 
    'STATISTIQUES GLOBALES' as type_verification,
    COUNT(DISTINCT c.id) as nombre_comptes_total,
    COUNT(DISTINCT CASE WHEN ABS(c.solde - COALESCE(SUM(
        CASE 
            WHEN o.type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'transaction_cree') 
            THEN -o.montant 
            WHEN o.type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
            THEN o.montant 
            ELSE 0 
        END
    ), 0)) <= 0.01 THEN c.id END) as comptes_synchronises,
    COUNT(DISTINCT CASE WHEN ABS(c.solde - COALESCE(SUM(
        CASE 
            WHEN o.type_operation IN ('total_cashin', 'FRAIS_TRANSACTION', 'transaction_cree') 
            THEN -o.montant 
            WHEN o.type_operation IN ('total_paiement', 'approvisionnement', 'ajustement') 
            THEN o.montant 
            ELSE 0 
        END
    ), 0)) > 0.01 THEN c.id END) as comptes_a_synchroniser
FROM compte c
LEFT JOIN operation o ON c.id = o.compte_id 
    AND o.type_operation NOT LIKE 'annulation_%' 
    AND (o.statut IS NULL OR o.statut != 'Annulée');
