-- Script pour forcer l'ajout des permissions TRX SF
-- Exécutez ce script si les permissions ne sont pas correctement configurées

-- 1. Ajouter la permission TRX SF si elle n'existe pas
INSERT IGNORE INTO permission (nom, description) VALUES ('TRX SF', 'Gestion des transactions SF');

-- 2. Récupérer l'ID de la permission TRX SF
SET @trx_sf_permission_id = (SELECT id FROM permission WHERE nom = 'TRX SF');

-- 3. Ajouter la permission TRX SF au module "Suivi des écarts" si pas déjà fait
INSERT IGNORE INTO module_permission (module_id, permission_id) 
SELECT m.id, @trx_sf_permission_id
FROM module m 
WHERE m.nom = 'Suivi des écarts';

-- 4. Ajouter la permission TRX SF au profil ADMIN si pas déjà fait
INSERT IGNORE INTO profil_permission (profil_id, permission_id)
SELECT p.id, @trx_sf_permission_id
FROM profil p 
WHERE p.nom = 'ADMIN';

-- 5. Vérifier que tout est en place
SELECT 'Permissions TRX SF ajoutées avec succès!' as resultat;
SELECT 
    'Permission TRX SF' as type,
    COUNT(*) as nombre
FROM permission 
WHERE nom = 'TRX SF';

SELECT 
    'Lien module-permission' as type,
    COUNT(*) as nombre
FROM module m
JOIN module_permission mp ON m.id = mp.module_id
JOIN permission p ON mp.permission_id = p.id
WHERE m.nom = 'Suivi des écarts' AND p.nom = 'TRX SF';

SELECT 
    'Lien profil-permission' as type,
    COUNT(*) as nombre
FROM profil pr
JOIN profil_permission pp ON pr.id = pp.profil_id
JOIN permission p ON pp.permission_id = p.id
WHERE pr.nom = 'ADMIN' AND p.nom = 'TRX SF';
