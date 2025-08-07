-- Script pour corriger l'utilisateur admin et les permissions
-- Exécutez ce script pour corriger les problèmes de permissions

-- 1. Créer le profil ADMIN s'il n'existe pas
INSERT IGNORE INTO profil (nom, description) VALUES ('ADMIN', 'Administrateur système');

-- 2. Créer le module "Suivi des écarts" s'il n'existe pas
INSERT IGNORE INTO module (nom, description) VALUES ('Suivi des écarts', 'Suivi des écarts de solde');

-- 3. Créer la permission "TRX SF" si elle n'existe pas
INSERT IGNORE INTO permission (nom, description) VALUES ('TRX SF', 'Gestion des transactions SF');

-- 4. Créer la permission "TSOP" si elle n'existe pas
INSERT IGNORE INTO permission (nom, description) VALUES ('TSOP', 'Gestion des transactions TSOP');

-- 5. Créer la permission "Impact OP" si elle n'existe pas
INSERT IGNORE INTO permission (nom, description) VALUES ('Impact OP', 'Gestion des impacts opérationnels');

-- 6. Récupérer les IDs
SET @admin_profil_id = (SELECT id FROM profil WHERE nom = 'ADMIN');
SET @suivi_ecarts_module_id = (SELECT id FROM module WHERE nom = 'Suivi des écarts');
SET @trx_sf_permission_id = (SELECT id FROM permission WHERE nom = 'TRX SF');
SET @tsop_permission_id = (SELECT id FROM permission WHERE nom = 'TSOP');
SET @impact_op_permission_id = (SELECT id FROM permission WHERE nom = 'Impact OP');

-- 7. Lier les permissions au module "Suivi des écarts"
INSERT IGNORE INTO module_permission (module_id, permission_id) VALUES (@suivi_ecarts_module_id, @trx_sf_permission_id);
INSERT IGNORE INTO module_permission (module_id, permission_id) VALUES (@suivi_ecarts_module_id, @tsop_permission_id);
INSERT IGNORE INTO module_permission (module_id, permission_id) VALUES (@suivi_ecarts_module_id, @impact_op_permission_id);

-- 8. Lier toutes les permissions au profil ADMIN
INSERT IGNORE INTO profil_permission (profil_id, permission_id) VALUES (@admin_profil_id, @trx_sf_permission_id);
INSERT IGNORE INTO profil_permission (profil_id, permission_id) VALUES (@admin_profil_id, @tsop_permission_id);
INSERT IGNORE INTO profil_permission (profil_id, permission_id) VALUES (@admin_profil_id, @impact_op_permission_id);

-- 9. Mettre à jour l'utilisateur admin pour lui assigner le profil ADMIN
UPDATE utilisateur SET profil_id = @admin_profil_id WHERE username = 'admin';

-- 10. Vérification finale
SELECT '=== VÉRIFICATION FINALE ===' as info;

SELECT 'Profils existants:' as type;
SELECT id, nom, description FROM profil;

SELECT 'Modules existants:' as type;
SELECT id, nom, description FROM module;

SELECT 'Permissions existantes:' as type;
SELECT id, nom, description FROM permission;

SELECT 'Liens module-permission:' as type;
SELECT 
    m.nom as module,
    p.nom as permission
FROM module m
JOIN module_permission mp ON m.id = mp.module_id
JOIN permission p ON mp.permission_id = p.id
ORDER BY m.nom, p.nom;

SELECT 'Liens profil-permission:' as type;
SELECT 
    pr.nom as profil,
    p.nom as permission
FROM profil pr
JOIN profil_permission pp ON pr.id = pp.profil_id
JOIN permission p ON pp.permission_id = p.id
ORDER BY pr.nom, p.nom;

SELECT 'Utilisateur admin:' as type;
SELECT u.username, u.profil_id, p.nom as profil_nom
FROM utilisateur u
LEFT JOIN profil p ON u.profil_id = p.id
WHERE u.username = 'admin';
