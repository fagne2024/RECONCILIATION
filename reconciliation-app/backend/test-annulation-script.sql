-- Script de test pour la nouvelle logique d'annulation simplifiée
-- Ce script simule le comportement attendu

-- 1. Créer une opération de test
INSERT INTO operations (
    id, type_operation, montant, solde_avant, solde_apres, 
    statut, nom_bordereau, service, date_operation, compte_id
) VALUES (
    999, 'Ajustement', 0.01, 207869213.56, 207869213.57,
    'Non calculé', 'CELCM0001', 'CM', '2024-10-21 08:08:00', 1
);

-- 2. Créer un frais associé
INSERT INTO operations (
    id, type_operation, montant, solde_avant, solde_apres,
    statut, nom_bordereau, service, date_operation, compte_id, parent_operation_id
) VALUES (
    1000, 'FRAIS_TRANSACTION', 0.01, 207869213.57, 207869213.56,
    'Validée', 'FRAIS_CELCM0001', 'CM', '2024-10-21 08:08:00', 1, 999
);

-- 3. Simuler l'annulation (ce que fait maintenant le code)
-- Au lieu de créer de nouvelles lignes, on modifie les existantes

-- Annulation de l'opération principale
UPDATE operations 
SET 
    type_operation = 'Annulation_Ajustement',
    nom_bordereau = 'ANNULATION_CELCM0001',
    solde_avant = 207869213.57,
    solde_apres = 207869213.56,  -- Impact inverse
    statut = 'Annulée'
WHERE id = 999;

-- Annulation du frais associé
UPDATE operations 
SET 
    type_operation = 'Annulation_FRAIS_TRANSACTION',
    nom_bordereau = 'ANNULATION_FRAIS_CELCM0001',
    solde_avant = 207869213.56,
    solde_apres = 207869213.57,  -- Impact inverse
    statut = 'Annulée'
WHERE id = 1000;

-- 4. Vérifier le résultat
SELECT 
    id,
    type_operation,
    montant,
    solde_avant,
    solde_apres,
    statut,
    nom_bordereau
FROM operations 
WHERE id IN (999, 1000)
ORDER BY id;

-- Résultat attendu :
-- ID 999: Annulation_Ajustement, 0.01, 207869213.57, 207869213.56, Annulée, ANNULATION_CELCM0001
-- ID 1000: Annulation_FRAIS_TRANSACTION, 0.01, 207869213.56, 207869213.57, Annulée, ANNULATION_FRAIS_CELCM0001
