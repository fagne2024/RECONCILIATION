-- Script pour ajouter les nouveaux types d'opérations
-- Appro_fournisseur, Compense_fournisseur, nivellement, régularisation_solde

-- Désactiver le mode safe update pour MySQL
SET SQL_SAFE_UPDATES = 0;

-- Vérifier les types d'opérations existants
SELECT DISTINCT type_operation FROM operation ORDER BY type_operation;

-- Ajouter les nouveaux types d'opérations (si ils n'existent pas déjà)
-- Note: Ce script ne modifie pas les données existantes, il ajoute seulement les nouveaux types

-- Vérifier si les nouveaux types existent déjà
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM operation WHERE type_operation = 'Appro_fournisseur') 
        THEN 'Appro_fournisseur existe déjà'
        ELSE 'Appro_fournisseur n''existe pas encore'
    END as status_appro_fournisseur;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM operation WHERE type_operation = 'Compense_fournisseur') 
        THEN 'Compense_fournisseur existe déjà'
        ELSE 'Compense_fournisseur n''existe pas encore'
    END as status_compense_fournisseur;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM operation WHERE type_operation = 'nivellement') 
        THEN 'nivellement existe déjà'
        ELSE 'nivellement n''existe pas encore'
    END as status_nivellement;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM operation WHERE type_operation = 'régularisation_solde') 
        THEN 'régularisation_solde existe déjà'
        ELSE 'régularisation_solde n''existe pas encore'
    END as status_regularisation_solde;

-- Réactiver le mode safe update
SET SQL_SAFE_UPDATES = 1;

-- Message de fin
SELECT 'Script d''ajout des nouveaux types d''opérations terminé' as message;
