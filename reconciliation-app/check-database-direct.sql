-- Script de diagnostic direct pour TRX SF
-- Exécuter ce script dans votre base de données MySQL

-- 1. Vérifier l'existence de la table
SELECT 'Vérification de la table trx_sf' as info;
SHOW TABLES LIKE 'trx_sf';

-- 2. Compter le nombre total de transactions
SELECT 'Nombre total de transactions TRX SF' as info;
SELECT COUNT(*) as total_transactions FROM trx_sf;

-- 3. Vérifier les transactions pour CELCM0001
SELECT 'Transactions pour CELCM0001' as info;
SELECT 
    id,
    id_transaction,
    agence,
    date_transaction,
    frais,
    service,
    statut,
    date_import
FROM trx_sf 
WHERE agence = 'CELCM0001'
ORDER BY date_transaction;

-- 4. Vérifier les formats de date
SELECT 'Formats de date trouvés' as info;
SELECT 
    date_transaction,
    COUNT(*) as nombre_transactions
FROM trx_sf 
GROUP BY date_transaction 
ORDER BY nombre_transactions DESC;

-- 5. Chercher spécifiquement la transaction problématique
SELECT 'Recherche de la transaction 06/08/2025' as info;
SELECT 
    id,
    id_transaction,
    agence,
    date_transaction,
    frais,
    service,
    statut
FROM trx_sf 
WHERE agence = 'CELCM0001' 
  AND (date_transaction LIKE '%06/08/2025%' OR date_transaction LIKE '%2025-08-06%');

-- 6. Vérifier toutes les agences
SELECT 'Toutes les agences disponibles' as info;
SELECT 
    agence,
    COUNT(*) as nombre_transactions,
    SUM(frais) as total_frais
FROM trx_sf 
GROUP BY agence 
ORDER BY agence;

-- 7. Test de la requête de frais par date
SELECT 'Test de la requête de frais pour 2025-08-06' as info;
SELECT 
    agence,
    DATE(date_transaction) as date,
    SUM(frais) as total_frais
FROM trx_sf 
WHERE agence = 'CELCM0001' 
  AND DATE(date_transaction) = '2025-08-06'
GROUP BY agence, DATE(date_transaction);

-- 8. Si aucune donnée trouvée, vérifier les dates proches
SELECT 'Vérification des dates proches' as info;
SELECT 
    agence,
    DATE(date_transaction) as date,
    COUNT(*) as nombre_transactions,
    SUM(frais) as total_frais
FROM trx_sf 
WHERE agence = 'CELCM0001' 
  AND date_transaction >= '2025-08-01' 
  AND date_transaction <= '2025-08-10'
GROUP BY agence, DATE(date_transaction)
ORDER BY date;
