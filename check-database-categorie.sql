-- Script pour vérifier l'état de la table compte
-- Vérifier si la colonne catégorie existe
DESCRIBE compte;

-- Vérifier les contraintes sur la table
SHOW CREATE TABLE compte;

-- Vérifier les données actuelles
SELECT id, numero_compte, solde, pays, type, categorie FROM compte LIMIT 5;

-- Vérifier les index
SHOW INDEX FROM compte;
