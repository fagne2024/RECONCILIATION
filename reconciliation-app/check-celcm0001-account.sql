-- Vérification du compte CELCM0001
-- Exécuter ce script dans votre base de données MySQL

-- 1. Vérifier le compte CELCM0001
SELECT 'Vérification du compte CELCM0001' as info;
SELECT 
    id,
    numero_compte,
    solde,
    pays,
    code_proprietaire,
    agence,
    type,
    date_derniere_maj
FROM compte 
WHERE numero_compte = 'CELCM0001';

-- 2. Si l'agence est NULL ou vide, la mettre à jour
UPDATE compte 
SET agence = 'CELCM0001' 
WHERE numero_compte = 'CELCM0001' 
  AND (agence IS NULL OR agence = '');

-- 3. Vérifier après mise à jour
SELECT 'Après mise à jour' as info;
SELECT 
    id,
    numero_compte,
    solde,
    pays,
    code_proprietaire,
    agence,
    type,
    date_derniere_maj
FROM compte 
WHERE numero_compte = 'CELCM0001';

-- 4. Vérifier tous les comptes sans agence
SELECT 'Comptes sans agence' as info;
SELECT 
    numero_compte,
    agence,
    pays,
    code_proprietaire
FROM compte 
WHERE agence IS NULL OR agence = '';

-- 5. Statistiques des agences
SELECT 'Statistiques des agences' as info;
SELECT 
    agence,
    COUNT(*) as nombre_comptes
FROM compte 
WHERE agence IS NOT NULL AND agence != ''
GROUP BY agence 
ORDER BY nombre_comptes DESC;
