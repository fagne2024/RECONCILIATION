-- Script de test pour vérifier les modules dans la base de données

-- 1. Vérifier la structure de la table module
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'module'
ORDER BY ORDINAL_POSITION;

-- 2. Compter le nombre total de modules
SELECT COUNT(*) as total_modules FROM module;

-- 3. Lister tous les modules avec leurs détails
SELECT 
    id,
    nom,
    CASE 
        WHEN id IS NOT NULL THEN 'Module valide'
        ELSE 'Module invalide'
    END as statut
FROM module
ORDER BY id;

-- 4. Vérifier s'il y a des modules avec des noms vides ou NULL
SELECT 
    id,
    nom,
    LENGTH(nom) as longueur_nom
FROM module 
WHERE nom IS NULL OR nom = '' OR LENGTH(nom) = 0;

-- 5. Vérifier les permissions associées aux modules
SELECT 
    m.id as module_id,
    m.nom as module_nom,
    COUNT(p.id) as nombre_permissions
FROM module m
LEFT JOIN profil_permission pp ON m.id = pp.module_id
LEFT JOIN permission p ON pp.permission_id = p.id
GROUP BY m.id, m.nom
ORDER BY m.id;

-- 6. Vérifier les associations module-permission
SELECT 
    m.nom as module,
    p.nom as permission,
    pp.id as association_id
FROM module m
JOIN profil_permission pp ON m.id = pp.module_id
JOIN permission p ON pp.permission_id = p.id
ORDER BY m.nom, p.nom; 