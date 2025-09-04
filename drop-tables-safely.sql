-- Script pour supprimer les tables en respectant les contraintes de clés étrangères
USE top20;

-- 1. Désactiver la vérification des clés étrangères temporairement
SET FOREIGN_KEY_CHECKS = 0;

-- 2. Supprimer les données des tables dans l'ordre correct
DELETE FROM processing_steps;
DELETE FROM auto_processing_models;

-- 3. Supprimer les tables
DROP TABLE IF EXISTS processing_steps;
DROP TABLE IF EXISTS auto_processing_models;

-- 4. Réactiver la vérification des clés étrangères
SET FOREIGN_KEY_CHECKS = 1;

-- 5. Vérifier que les tables ont été supprimées
SHOW TABLES LIKE '%auto_processing%';
SHOW TABLES LIKE '%processing_steps%';
