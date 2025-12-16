package com.reconciliation.service;

import com.reconciliation.entity.GuideNodeEntity;
import com.reconciliation.repository.GuideNodeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class GuideNodeService {

    @Autowired
    private GuideNodeRepository guideNodeRepository;

    /**
     * Initialise automatiquement le nœud racine au démarrage si nécessaire
     */
    @PostConstruct
    public void init() {
        try {
            boolean rootExists = guideNodeRepository.existsByNodeId("root");
            if (!rootExists) {
                log.info("🔧 Nœud racine 'root' non trouvé, initialisation automatique...");
                initializeDefaultStructure();
                log.info("✅ Nœud racine créé automatiquement au démarrage");
            } else {
                log.info("✅ Nœud racine 'root' déjà existant");
            }
        } catch (Exception e) {
            log.error("❌ Erreur lors de l'initialisation au démarrage: {}", e.getMessage(), e);
        }
    }

    /**
     * Récupère toute la structure des guides sous forme d'arbre
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getStructure() {
        try {
            log.info("📋 Récupération de la structure des Guides...");
            
            // Vérifier si le nœud racine existe, sinon l'initialiser dans une transaction séparée
            boolean rootExists = guideNodeRepository.existsByNodeId("root");
            if (!rootExists) {
                log.warn("⚠️ Nœud racine non trouvé, initialisation requise...");
                return getDefaultStructure();
            }
            
            List<GuideNodeEntity> allNodes = guideNodeRepository.findAll();
            log.info("✅ {} nœuds de guides chargés", allNodes.size());
            
            if (allNodes.isEmpty()) {
                log.info("🔧 Base de données vide");
                return getDefaultStructure();
            }
            
            log.info("🌳 Construction de l'arbre avec {} nœuds...", allNodes.size());
            Map<String, Object> rootNode = buildTreeStructure(allNodes);
            log.info("✅ Structure des guides construite avec succès");
            return rootNode;
        } catch (Exception e) {
            log.error("❌ Erreur lors de la récupération de la structure: {}", e.getMessage(), e);
            return getDefaultStructure();
        }
    }
    
    /**
     * Retourne la structure par défaut en mémoire (fallback)
     */
    public Map<String, Object> getDefaultStructure() {
        log.info("📋 Retour de la structure par défaut des guides en mémoire");
        Map<String, Object> root = new HashMap<>();
        root.put("id", "root");
        root.put("label", "Visualisation des Guides");
        root.put("children", new ArrayList<>());
        return root;
    }

    /**
     * Construit la structure d'arbre à partir de la liste plate de nœuds
     */
    private Map<String, Object> buildTreeStructure(List<GuideNodeEntity> allNodes) {
        log.info("🔍 Nœuds disponibles: {}", allNodes.size());
        for (GuideNodeEntity node : allNodes) {
            log.info("  - Node ID: {}, Label: {}, Parent: {}", 
                node.getNodeId(), 
                node.getLabel(), 
                node.getParent() != null ? node.getParent().getNodeId() : "null");
        }
        
        GuideNodeEntity rootEntity = allNodes.stream()
            .filter(node -> "root".equals(node.getNodeId()))
            .findFirst()
            .orElse(null);
        
        if (rootEntity == null) {
            log.warn("⚠️ Nœud racine non trouvé parmi les {} nœuds", allNodes.size());
            log.warn("⚠️ Utilisez POST /api/guide-nodes/initialize pour créer le nœud racine");
            return Collections.emptyMap();
        }
        
        log.info("✅ Nœud racine trouvé: {}", rootEntity.getLabel());
        return buildNodeMap(rootEntity, allNodes);
    }

    /**
     * Construit un nœud et ses enfants récursivement
     */
    private Map<String, Object> buildNodeMap(GuideNodeEntity entity, List<GuideNodeEntity> allNodes) {
        Map<String, Object> nodeMap = new HashMap<>();
        nodeMap.put("id", entity.getNodeId());
        nodeMap.put("label", entity.getLabel());
        
        if (entity.getRoute() != null) {
            nodeMap.put("route", entity.getRoute());
        }
        if (entity.getDescription() != null) {
            nodeMap.put("description", entity.getDescription());
        }
        
        Long entityId = entity.getId();
        List<GuideNodeEntity> children = new ArrayList<>();
        
        for (GuideNodeEntity node : allNodes) {
            try {
                GuideNodeEntity parent = node.getParent();
                if (parent != null && parent.getId() != null && parent.getId().equals(entityId)) {
                    children.add(node);
                }
            } catch (Exception e) {
                log.debug("⚠️ Impossible de charger le parent pour le nœud {}: {}", node.getNodeId(), e.getMessage());
            }
        }
        
        children.sort(Comparator.comparing(GuideNodeEntity::getDisplayOrder));
        
        if (!children.isEmpty()) {
            List<Map<String, Object>> childrenList = new ArrayList<>();
            for (GuideNodeEntity child : children) {
                try {
                    childrenList.add(buildNodeMap(child, allNodes));
                } catch (Exception e) {
                    log.warn("⚠️ Erreur lors de la construction du nœud enfant {}: {}", child.getNodeId(), e.getMessage());
                }
            }
            nodeMap.put("children", childrenList);
        }
        
        return nodeMap;
    }

    /**
     * Crée un nouveau nœud de guide
     */
    @Transactional
    public GuideNodeEntity createNode(String nodeId, String label, String parentNodeId, Integer displayOrder) {
        log.info("📝 Création nœud guide - nodeId: {}, label: {}, parentNodeId: {}", nodeId, label, parentNodeId);
        
        if (guideNodeRepository.existsByNodeId(nodeId)) {
            throw new IllegalArgumentException("Un guide avec l'ID '" + nodeId + "' existe déjà");
        }
        
        GuideNodeEntity node = new GuideNodeEntity();
        node.setNodeId(nodeId);
        node.setLabel(label);
        
        if (parentNodeId != null && !parentNodeId.isEmpty()) {
            GuideNodeEntity parent = guideNodeRepository.findByNodeId(parentNodeId)
                .orElseThrow(() -> new IllegalArgumentException("Parent avec nodeId '" + parentNodeId + "' non trouvé"));
            node.setParent(parent);
        }
        
        if (displayOrder == null) {
            List<GuideNodeEntity> siblings;
            if (parentNodeId != null && !parentNodeId.isEmpty()) {
                GuideNodeEntity parent = guideNodeRepository.findByNodeId(parentNodeId).orElse(null);
                siblings = parent != null ? guideNodeRepository.findByParentOrderByDisplayOrderAsc(parent) : new ArrayList<>();
            } else {
                siblings = guideNodeRepository.findByParentIsNullOrderByDisplayOrderAsc();
            }
            displayOrder = siblings.isEmpty() ? 0 : siblings.size();
        }
        node.setDisplayOrder(displayOrder);
        
        GuideNodeEntity saved = guideNodeRepository.save(node);
        log.info("✅ Nœud guide créé avec ID: {}", saved.getId());
        return saved;
    }

    /**
     * Met à jour un nœud existant
     */
    @Transactional
    public GuideNodeEntity updateNode(String nodeId, String label, String route, String description) {
        try {
            log.info("📝 Mise à jour nœud guide - nodeId: {}, label: {}", nodeId, label);
            
            GuideNodeEntity node = guideNodeRepository.findByNodeId(nodeId)
                .orElseThrow(() -> new IllegalArgumentException("Guide avec nodeId '" + nodeId + "' non trouvé"));
            
            if (label != null && !label.trim().isEmpty()) {
                node.setLabel(label.trim());
            }
            
            if (route != null) {
                node.setRoute(route);
            }
            
            if (description != null) {
                node.setDescription(description);
            }
            
            GuideNodeEntity saved = guideNodeRepository.save(node);
            log.info("✅ Nœud guide mis à jour avec ID: {}", saved.getId());
            return saved;
        } catch (Exception e) {
            log.error("❌ Erreur lors de la mise à jour du guide {}: {}", nodeId, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Supprime un nœud et tous ses enfants récursivement
     */
    @Transactional
    public boolean deleteNode(String nodeId) {
        log.info("🗑️ Suppression nœud guide - nodeId: {}", nodeId);
        
        GuideNodeEntity node = guideNodeRepository.findByNodeId(nodeId)
            .orElseThrow(() -> new IllegalArgumentException("Guide avec nodeId '" + nodeId + "' non trouvé"));
        
        deleteNodeRecursive(node);
        
        log.info("✅ Nœud guide supprimé: {}", nodeId);
        return true;
    }

    /**
     * Supprime un nœud et tous ses enfants récursivement
     */
    private void deleteNodeRecursive(GuideNodeEntity node) {
        List<GuideNodeEntity> children = guideNodeRepository.findByParentOrderByDisplayOrderAsc(node);
        
        for (GuideNodeEntity child : children) {
            deleteNodeRecursive(child);
        }
        
        guideNodeRepository.delete(node);
    }

    /**
     * Initialise la structure par défaut si la base est vide
     */
    @Transactional
    public void initializeDefaultStructure() {
        log.info("🔧 Initialisation de la structure des guides par défaut");
        
        // Vérifier si le nœud racine existe déjà
        GuideNodeEntity root = guideNodeRepository.findByNodeId("root").orElse(null);
        
        if (root == null) {
            // Créer le nœud racine
            root = new GuideNodeEntity();
            root.setNodeId("root");
            root.setLabel("Visualisation des Guides");
            root.setDisplayOrder(0);
            root = guideNodeRepository.save(root);
            log.info("✅ Nœud racine créé");
        } else {
            log.info("✅ Nœud racine déjà existant");
        }
        
        // Attacher tous les nœuds orphelins au nœud racine
        List<GuideNodeEntity> orphans = guideNodeRepository.findByParentIsNullOrderByDisplayOrderAsc();
        int attachedCount = 0;
        for (GuideNodeEntity orphan : orphans) {
            if (!"root".equals(orphan.getNodeId())) {
                orphan.setParent(root);
                guideNodeRepository.save(orphan);
                attachedCount++;
                log.info("✅ Nœud orphelin '{}' attaché au nœud racine", orphan.getLabel());
            }
        }
        
        if (attachedCount > 0) {
            log.info("✅ {} nœud(s) orphelin(s) attaché(s) au nœud racine", attachedCount);
        }
        
        log.info("✅ Structure des guides par défaut initialisée");
    }

    /**
     * Crée un nœud enfant
     */
    private GuideNodeEntity createChildNode(GuideNodeEntity parent, String nodeId, String label, Integer displayOrder) {
        GuideNodeEntity node = new GuideNodeEntity();
        node.setNodeId(nodeId);
        node.setLabel(label);
        node.setParent(parent);
        node.setDisplayOrder(displayOrder);
        return guideNodeRepository.save(node);
    }
}
