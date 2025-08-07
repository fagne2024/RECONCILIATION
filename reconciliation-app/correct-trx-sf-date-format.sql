-- Correction du format de date pour TRX SF
-- Problème: Les dates sont au format DD/MM/YYYY au lieu de YYYY-MM-DD

-- 1. Vérifier les formats de date actuels
SELECT 
    'Formats de date trouvés' as info,
    date_transaction,
    COUNT(*) as nombre_transactions
FROM trx_sf 
GROUP BY date_transaction 
ORDER BY nombre_transactions DESC;

-- 2. Identifier les transactions avec format problématique
SELECT 
    id,
    id_transaction,
    agence,
    date_transaction,
    frais,
    service,
    statut
FROM trx_sf 
WHERE date_transaction LIKE '%/%' 
   OR date_transaction LIKE '%06/08/2025%'
   OR date_transaction LIKE '%2025-08-06%'
ORDER BY date_transaction;

-- 3. Corriger le format de date pour CELCM0001
-- Convertir DD/MM/YYYY en YYYY-MM-DD
UPDATE trx_sf 
SET date_transaction = '2025-08-06 00:00:00'
WHERE agence = 'CELCM0001' 
  AND date_transaction = '06/08/2025';

-- 4. Corriger tous les formats DD/MM/YYYY
-- Cette requête convertit automatiquement tous les formats DD/MM/YYYY
UPDATE trx_sf 
SET date_transaction = CONCAT(
    SUBSTRING_INDEX(date_transaction, '/', -1), '-',  -- année
    LPAD(SUBSTRING_INDEX(SUBSTRING_INDEX(date_transaction, '/', 2), '/', -1), 2, '0'), '-',  -- mois
    LPAD(SUBSTRING_INDEX(date_transaction, '/', 1), 2, '0'),  -- jour
    ' 00:00:00'
)
WHERE date_transaction LIKE '%/%' 
  AND date_transaction NOT LIKE '%/%/%/%';  -- éviter les formats avec 4 parties

-- 5. Vérifier les corrections appliquées
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
ORDER BY date_transaction;

-- 6. Test de la requête de frais après correction
-- Cette requête devrait maintenant retourner les frais correctement
SELECT 
    agence,
    DATE(date_transaction) as date,
    SUM(frais) as total_frais
FROM trx_sf 
WHERE agence = 'CELCM0001' 
  AND DATE(date_transaction) = '2025-08-06'
GROUP BY agence, DATE(date_transaction);

-- 7. Vérifier toutes les agences disponibles
SELECT 
    agence,
    COUNT(*) as nombre_transactions,
    SUM(frais) as total_frais
FROM trx_sf 
GROUP BY agence 
ORDER BY agence;

-- 8. Statistiques par date pour CELCM0001
SELECT 
    DATE(date_transaction) as date,
    COUNT(*) as nombre_transactions,
    SUM(frais) as total_frais,
    AVG(frais) as moyenne_frais
FROM trx_sf 
WHERE agence = 'CELCM0001'
GROUP BY DATE(date_transaction)
ORDER BY date DESC;
