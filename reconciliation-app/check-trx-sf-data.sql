-- Vérification des données TRX SF pour CELCM0001
-- Exécuter ce script dans votre base de données MySQL

-- 1. Vérifier si la table trx_sf existe
SHOW TABLES LIKE 'trx_sf';

-- 2. Vérifier la structure de la table
DESCRIBE trx_sf;

-- 3. Compter le nombre total de transactions
SELECT COUNT(*) as total_transactions FROM trx_sf;

-- 4. Vérifier les transactions pour CELCM0001
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

-- 5. Vérifier les formats de date
SELECT 
    date_transaction,
    COUNT(*) as nombre_transactions
FROM trx_sf 
GROUP BY date_transaction 
ORDER BY nombre_transactions DESC;

-- 6. Chercher spécifiquement la transaction avec date 06/08/2025
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

-- 7. Vérifier toutes les agences disponibles
SELECT 
    agence,
    COUNT(*) as nombre_transactions,
    SUM(frais) as total_frais
FROM trx_sf 
GROUP BY agence 
ORDER BY agence;

-- 8. Test de la requête de frais par date
SELECT 
    agence,
    DATE(date_transaction) as date,
    SUM(frais) as total_frais
FROM trx_sf 
WHERE agence = 'CELCM0001' 
  AND DATE(date_transaction) = '2025-08-06'
GROUP BY agence, DATE(date_transaction);
