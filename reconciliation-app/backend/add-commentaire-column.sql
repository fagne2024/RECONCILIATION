-- Script pour ajouter la colonne commentaire à la table releve_bancaire
-- Exécuter ce script sur la base de données pour ajouter la colonne commentaire

-- Ajouter la colonne commentaire à la table releve_bancaire
ALTER TABLE releve_bancaire ADD COLUMN commentaire VARCHAR(1000);

-- Vérifier que la colonne a été ajoutée
-- SELECT sql FROM sqlite_master WHERE type='table' AND name='releve_bancaire';
