-- Vérification des permissions TRX SF
-- Exécutez ce script dans votre base de données pour vérifier les permissions

-- 1. Vérifier si la permission TRX SF existe
SELECT '1. Permission TRX SF' as verification;
SELECT id, nom, description FROM permission WHERE nom = 'TRX SF';

-- 2. Vérifier si la permission est liée au module "Suivi des écarts"
SELECT '2. Lien permission-module' as verification;
SELECT 
    m.nom as module,
    p.nom as permission
FROM module m
JOIN module_permission mp ON m.id = mp.module_id
JOIN permission p ON mp.permission_id = p.id
WHERE m.nom = 'Suivi des écarts' AND p.nom = 'TRX SF';

-- 3. Vérifier si la permission est liée au profil ADMIN
SELECT '3. Lien permission-profil ADMIN' as verification;
SELECT 
    pr.nom as profil,
    p.nom as permission
FROM profil pr
JOIN profil_permission pp ON pr.id = pp.profil_id
JOIN permission p ON pp.permission_id = p.id
WHERE pr.nom = 'ADMIN' AND p.nom = 'TRX SF';

-- 4. Vérifier toutes les permissions du profil ADMIN
SELECT '4. Toutes les permissions du profil ADMIN' as verification;
SELECT 
    pr.nom as profil,
    p.nom as permission,
    p.description
FROM profil pr
JOIN profil_permission pp ON pr.id = pp.profil_id
JOIN permission p ON pp.permission_id = p.id
WHERE pr.nom = 'ADMIN'
ORDER BY p.nom;

-- 5. Vérifier tous les modules et leurs permissions
SELECT '5. Tous les modules et leurs permissions' as verification;
SELECT 
    m.nom as module,
    p.nom as permission
FROM module m
LEFT JOIN module_permission mp ON m.id = mp.module_id
LEFT JOIN permission p ON mp.permission_id = p.id
ORDER BY m.nom, p.nom;
