package com.reconciliation.service;

import com.reconciliation.entity.FraisTransactionEntity;
import com.reconciliation.repository.FraisTransactionRepository;
import com.reconciliation.dto.FraisTransactionRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FraisTransactionService {
    
    @Autowired
    private FraisTransactionRepository fraisTransactionRepository;
    
    // Cache pour éviter les requêtes répétitives
    private final Map<String, FraisTransactionEntity> fraisCache = new ConcurrentHashMap<>();
    private volatile long lastCacheRefresh = 0;
    private static final long CACHE_TTL = 300000; // 5 minutes en millisecondes
    
    /**
     * Créer un nouveau frais de transaction
     */
    @Transactional
    public FraisTransactionEntity createFraisTransaction(FraisTransactionRequest request) {
        // Vérifier s'il existe déjà un frais pour ce service et cette agence
        Optional<FraisTransactionEntity> existingFrais = fraisTransactionRepository.findFraisApplicable(request.getService(), request.getAgence());
        if (existingFrais.isPresent()) {
            throw new IllegalArgumentException("Un frais de transaction existe déjà pour le service '" + request.getService() + "' et l'agence '" + request.getAgence() + "'");
        }
        
        FraisTransactionEntity frais = new FraisTransactionEntity();
        frais.setService(request.getService());
        frais.setAgence(request.getAgence());
        frais.setMontantFrais(request.getMontantFrais());
        frais.setTypeCalcul(request.getTypeCalcul() != null ? request.getTypeCalcul() : "NOMINAL");
        frais.setPourcentage(request.getPourcentage());
        frais.setDescription(request.getDescription());
        frais.setActif(request.getActif() != null ? request.getActif() : true);
        frais.setDateCreation(LocalDateTime.now());
        frais.setDateModification(LocalDateTime.now());
        
        FraisTransactionEntity savedFrais = fraisTransactionRepository.save(frais);
        invalidateCache(); // Invalider le cache après création
        return savedFrais;
    }
    
    /**
     * Mettre à jour un frais de transaction existant
     */
    @Transactional
    public FraisTransactionEntity updateFraisTransaction(Long id, FraisTransactionRequest request) {
        FraisTransactionEntity frais = fraisTransactionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Frais de transaction non trouvé avec ID: " + id));
        
        // Vérifier s'il existe déjà un autre frais pour ce service et cette agence (excluant celui en cours de modification)
        Optional<FraisTransactionEntity> existingFrais = fraisTransactionRepository.findFraisApplicable(request.getService(), request.getAgence());
        if (existingFrais.isPresent() && !existingFrais.get().getId().equals(id)) {
            throw new IllegalArgumentException("Un frais de transaction existe déjà pour le service '" + request.getService() + "' et l'agence '" + request.getAgence() + "'");
        }
        
        frais.setService(request.getService());
        frais.setAgence(request.getAgence());
        frais.setMontantFrais(request.getMontantFrais());
        frais.setTypeCalcul(request.getTypeCalcul() != null ? request.getTypeCalcul() : "NOMINAL");
        frais.setPourcentage(request.getPourcentage());
        frais.setDescription(request.getDescription());
        if (request.getActif() != null) {
            frais.setActif(request.getActif());
        }
        frais.setDateModification(LocalDateTime.now());
        
        FraisTransactionEntity savedFrais = fraisTransactionRepository.save(frais);
        invalidateCache(); // Invalider le cache après modification
        return savedFrais;
    }
    
    /**
     * Récupérer un frais de transaction par ID
     */
    public Optional<FraisTransactionEntity> getFraisTransactionById(Long id) {
        return fraisTransactionRepository.findById(id);
    }
    
    /**
     * Récupérer tous les frais de transaction actifs
     */
    public List<FraisTransactionEntity> getAllFraisTransactionsActifs() {
        return fraisTransactionRepository.findByActifTrueOrderByDateModificationDesc();
    }
    
    /**
     * Récupérer tous les frais de transaction
     */
    public List<FraisTransactionEntity> getAllFraisTransactions() {
        return fraisTransactionRepository.findAllOrderByDateModificationDesc();
    }
    
    /**
     * Récupérer les frais de transaction par service
     */
    public List<FraisTransactionEntity> getFraisTransactionsByService(String service) {
        return fraisTransactionRepository.findByServiceAndActifTrueOrderByDateModificationDesc(service);
    }
    
    /**
     * Récupérer les frais de transaction par agence
     */
    public List<FraisTransactionEntity> getFraisTransactionsByAgence(String agence) {
        return fraisTransactionRepository.findByAgenceAndActifTrueOrderByDateModificationDesc(agence);
    }
    
    /**
     * Trouver le frais applicable pour un service et une agence donnés
     * OPTIMISATION : Utilisation d'un cache pour éviter les requêtes répétitives
     */
    public Optional<FraisTransactionEntity> getFraisApplicable(String service, String agence) {
        // Vérifier si le cache doit être rafraîchi
        refreshCacheIfNeeded();
        
        // Clé du cache : service + "|" + agence
        String cacheKey = service + "|" + agence;
        
        // Vérifier d'abord dans le cache
        if (fraisCache.containsKey(cacheKey)) {
            System.out.println("DEBUG: Configuration frais trouvée dans le cache pour " + service + "/" + agence);
            return Optional.of(fraisCache.get(cacheKey));
        }
        
        // Si pas dans le cache, faire la requête
        Optional<FraisTransactionEntity> fraisOpt = fraisTransactionRepository.findFraisApplicable(service, agence);
        
        // Mettre en cache si trouvé
        if (fraisOpt.isPresent()) {
            fraisCache.put(cacheKey, fraisOpt.get());
            System.out.println("DEBUG: Configuration frais mise en cache pour " + service + "/" + agence);
        }
        
        return fraisOpt;
    }
    
    /**
     * Rafraîchir le cache si nécessaire (TTL expiré)
     */
    private synchronized void refreshCacheIfNeeded() {
        long currentTime = System.currentTimeMillis();
        if (currentTime - lastCacheRefresh > CACHE_TTL) {
            System.out.println("DEBUG: Rafraîchissement du cache des frais de transaction");
            fraisCache.clear();
            
            // Recharger tous les frais actifs
            List<FraisTransactionEntity> allFrais = fraisTransactionRepository.findByActifTrue();
            for (FraisTransactionEntity frais : allFrais) {
                String cacheKey = frais.getService() + "|" + frais.getAgence();
                fraisCache.put(cacheKey, frais);
            }
            
            lastCacheRefresh = currentTime;
            System.out.println("DEBUG: Cache rafraîchi avec " + fraisCache.size() + " entrées");
        }
    }
    
    /**
     * Invalider le cache (appelé lors des modifications)
     */
    private void invalidateCache() {
        System.out.println("DEBUG: Invalidation du cache des frais de transaction");
        fraisCache.clear();
        lastCacheRefresh = 0;
    }
    
    /**
     * Récupérer tous les services uniques
     */
    public List<String> getAllServices() {
        return fraisTransactionRepository.findDistinctServices();
    }
    
    /**
     * Récupérer toutes les agences uniques
     */
    public List<String> getAllAgences() {
        return fraisTransactionRepository.findDistinctAgences();
    }

    public List<FraisTransactionEntity> filterFraisTransactions(Map<String, Object> filters) {
        List<FraisTransactionEntity> all = fraisTransactionRepository.findAllOrderByDateModificationDesc();
        List<String> services = (List<String>) filters.getOrDefault("services", null);
        List<String> agences = (List<String>) filters.getOrDefault("agences", null);
        String actifStr = filters.get("actif") != null ? filters.get("actif").toString() : null;
        Boolean actif = (actifStr == null || actifStr.isEmpty()) ? null : Boolean.valueOf(actifStr);
        String dateDebut = filters.get("dateDebut") != null ? filters.get("dateDebut").toString() : null;
        String dateFin = filters.get("dateFin") != null ? filters.get("dateFin").toString() : null;
        return all.stream()
            .filter(f -> (services == null || services.isEmpty() || services.contains(f.getService())))
            .filter(f -> (agences == null || agences.isEmpty() || agences.contains(f.getAgence())))
            .filter(f -> (actif == null || f.getActif().equals(actif)))
            .filter(f -> (dateDebut == null || dateDebut.isEmpty() || (f.getDateCreation() != null && !f.getDateCreation().toLocalDate().isBefore(java.time.LocalDate.parse(dateDebut)))))
            .filter(f -> (dateFin == null || dateFin.isEmpty() || (f.getDateCreation() != null && !f.getDateCreation().toLocalDate().isAfter(java.time.LocalDate.parse(dateFin)))))
            .toList();
    }
    
    /**
     * Supprimer un frais de transaction (suppression physique de la base de données)
     */
    @Transactional
    public boolean deleteFraisTransaction(Long id) {
        Optional<FraisTransactionEntity> frais = fraisTransactionRepository.findById(id);
        if (frais.isPresent()) {
            fraisTransactionRepository.deleteById(id);
            invalidateCache(); // Invalider le cache après suppression
            return true;
        }
        return false;
    }
    
    /**
     * Activer/désactiver un frais de transaction
     */
    @Transactional
    public boolean toggleFraisTransaction(Long id) {
        Optional<FraisTransactionEntity> frais = fraisTransactionRepository.findById(id);
        if (frais.isPresent()) {
            FraisTransactionEntity entity = frais.get();
            entity.setActif(!entity.getActif());
            entity.setDateModification(LocalDateTime.now());
            fraisTransactionRepository.save(entity);
            invalidateCache(); // Invalider le cache après changement de statut
            return true;
        }
        return false;
    }
} 