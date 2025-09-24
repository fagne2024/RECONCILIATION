-- Script de test pour vérifier le recalcul automatique du solde de clôture
-- après annulation ou suppression d'opérations

-- 1. Créer un compte de test
INSERT INTO compte (numero_compte, nom_compte, solde, date_creation, date_derniere_maj)
VALUES ('TEST001', 'Compte Test Solde Clôture', 1000.00, NOW(), NOW())
ON DUPLICATE KEY UPDATE nom_compte = 'Compte Test Solde Clôture';

-- 2. Récupérer l'ID du compte de test
SET @compte_test_id = (SELECT id FROM compte WHERE numero_compte = 'TEST001');

-- 3. Créer quelques opérations de test pour le même jour
INSERT INTO operation (
    compte_id, type_operation, montant, solde_avant, solde_apres, 
    date_operation, statut, banque, code_proprietaire, service, nom_bordereau
) VALUES 
(@compte_test_id, 'total_cashin', 500.00, 1000.00, 1500.00, 
 '2025-01-15 10:00:00', 'Validée', 'TEST_BANK', 'TEST_AGENCY', 'TEST_SERVICE', 'BORDEREAU_1'),
(@compte_test_id, 'total_paiement', 200.00, 1500.00, 1700.00, 
 '2025-01-15 11:00:00', 'Validée', 'TEST_BANK', 'TEST_AGENCY', 'TEST_SERVICE', 'BORDEREAU_2'),
(@compte_test_id, 'ajustement', 100.00, 1700.00, 1800.00, 
 '2025-01-15 12:00:00', 'Validée', 'TEST_BANK', 'TEST_AGENCY', 'TEST_SERVICE', 'BORDEREAU_3');

-- 4. Vérifier l'état initial
SELECT '=== ÉTAT INITIAL ===' as test_phase;
SELECT 
    c.numero_compte,
    c.solde as solde_compte,
    COUNT(o.id) as nb_operations,
    MAX(o.solde_apres) as derniere_operation_solde_apres,
    CASE 
        WHEN c.solde = MAX(o.solde_apres) THEN '✅ COHÉRENT'
        ELSE '❌ INCOHÉRENT'
    END as coherence_solde
FROM compte c
LEFT JOIN operation o ON c.id = o.compte_id AND o.statut != 'Annulée'
WHERE c.numero_compte = 'TEST001'
GROUP BY c.id, c.numero_compte, c.solde;

-- 5. Annuler la dernière opération (ajustement)
UPDATE operation 
SET statut = 'Annulée', type_operation = 'annulation_ajustement'
WHERE compte_id = @compte_test_id 
  AND type_operation = 'ajustement' 
  AND statut = 'Validée';

-- 6. Vérifier après annulation
SELECT '=== APRÈS ANNULATION ===' as test_phase;
SELECT 
    c.numero_compte,
    c.solde as solde_compte,
    COUNT(CASE WHEN o.statut != 'Annulée' THEN 1 END) as nb_operations_valides,
    MAX(CASE WHEN o.statut != 'Annulée' THEN o.solde_apres END) as derniere_operation_valide_solde_apres,
    CASE 
        WHEN c.solde = MAX(CASE WHEN o.statut != 'Annulée' THEN o.solde_apres END) THEN '✅ COHÉRENT'
        ELSE '❌ INCOHÉRENT'
    END as coherence_solde
FROM compte c
LEFT JOIN operation o ON c.id = o.compte_id
WHERE c.numero_compte = 'TEST001'
GROUP BY c.id, c.numero_compte, c.solde;

-- 7. Supprimer une opération
DELETE FROM operation 
WHERE compte_id = @compte_test_id 
  AND type_operation = 'total_paiement' 
  AND statut = 'Validée';

-- 8. Vérifier après suppression
SELECT '=== APRÈS SUPPRESSION ===' as test_phase;
SELECT 
    c.numero_compte,
    c.solde as solde_compte,
    COUNT(CASE WHEN o.statut != 'Annulée' THEN 1 END) as nb_operations_valides,
    MAX(CASE WHEN o.statut != 'Annulée' THEN o.solde_apres END) as derniere_operation_valide_solde_apres,
    CASE 
        WHEN c.solde = MAX(CASE WHEN o.statut != 'Annulée' THEN o.solde_apres END) THEN '✅ COHÉRENT'
        ELSE '❌ INCOHÉRENT'
    END as coherence_solde
FROM compte c
LEFT JOIN operation o ON c.id = o.compte_id
WHERE c.numero_compte = 'TEST001'
GROUP BY c.id, c.numero_compte, c.solde;

-- 9. Nettoyer les données de test
DELETE FROM operation WHERE compte_id = @compte_test_id;
DELETE FROM compte WHERE numero_compte = 'TEST001';

SELECT '=== TEST TERMINÉ ===' as test_phase;
