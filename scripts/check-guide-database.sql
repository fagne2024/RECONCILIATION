-- Script de vérification et d'initialisation de la table guide_node
-- Base de données : top20

USE top20;

-- 1. Vérifier si la table existe
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME,
    UPDATE_TIME
FROM 
    information_schema.TABLES
WHERE 
    TABLE_SCHEMA = 'top20' 
    AND TABLE_NAME = 'guide_node';

-- 2. Afficher la structure de la table
DESCRIBE guide_node;

-- 3. Compter le nombre total de nœuds
SELECT COUNT(*) AS total_nodes FROM guide_node;

-- 4. Afficher tous les nœuds existants
SELECT 
    id,
    node_id,
    label,
    parent_id,
    display_order,
    created_at,
    updated_at
FROM 
    guide_node
ORDER BY 
    display_order ASC;

-- 5. Vérifier si le nœud racine existe
SELECT * FROM guide_node WHERE node_id = 'root';

-- 6. Compter les nœuds orphelins (sans parent, sauf root)
SELECT 
    COUNT(*) AS orphans_count,
    GROUP_CONCAT(node_id SEPARATOR ', ') AS orphan_node_ids
FROM 
    guide_node
WHERE 
    parent_id IS NULL 
    AND node_id != 'root';

-- 7. Afficher la hiérarchie des nœuds
SELECT 
    g1.node_id AS parent_node_id,
    g1.label AS parent_label,
    g2.node_id AS child_node_id,
    g2.label AS child_label,
    g2.display_order
FROM 
    guide_node g1
LEFT JOIN 
    guide_node g2 ON g1.id = g2.parent_id
ORDER BY 
    g1.node_id, g2.display_order;

-- ========================================
-- INITIALISATION (si nécessaire)
-- ========================================

-- Si le nœud racine n'existe pas, créez-le :
-- INSERT INTO guide_node (node_id, label, display_order, created_at, updated_at)
-- VALUES ('root', 'Visualisation des Guides', 0, NOW(), NOW());

-- Exemple : Ajouter un guide de test
-- INSERT INTO guide_node (node_id, label, parent_id, display_order, created_at, updated_at)
-- SELECT 'guide-test-1', 'Guide de Test 1', id, 0, NOW(), NOW()
-- FROM guide_node WHERE node_id = 'root';

-- Exemple : Ajouter un sous-guide
-- INSERT INTO guide_node (node_id, label, parent_id, display_order, created_at, updated_at)
-- SELECT 'sous-guide-test-1', 'Sous-Guide de Test 1', id, 0, NOW(), NOW()
-- FROM guide_node WHERE node_id = 'guide-test-1';


