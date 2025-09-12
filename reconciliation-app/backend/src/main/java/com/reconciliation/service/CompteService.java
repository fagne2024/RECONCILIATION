package com.reconciliation.service;

import com.reconciliation.entity.CompteEntity;
import com.reconciliation.entity.OperationEntity;
import com.reconciliation.model.Compte;
import com.reconciliation.repository.CompteRepository;
import com.reconciliation.repository.OperationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CompteService {
    
    private static final Logger logger = LoggerFactory.getLogger(CompteService.class);
    
    @Autowired
    private CompteRepository compteRepository;
    
    @Autowired
    private OperationRepository operationRepository;
    
    public List<Compte> getAllComptes() {
        return compteRepository.findAll().stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public Optional<Compte> getCompteById(Long id) {
        return compteRepository.findById(id)
                .map(this::convertToModel);
    }
    
    public Optional<Compte> getCompteByNumero(String numeroCompte) {
        return compteRepository.findByNumeroCompte(numeroCompte)
                .map(this::convertToModel);
    }
    
    /**
     * Récupère un compte par agence et service
     * Le numéro de compte est construit comme "agence_service"
     */
    public Optional<Compte> getCompteByAgencyAndService(String agency, String service) {
        String numeroCompte = agency + "_" + service;
        return compteRepository.findByNumeroCompte(numeroCompte)
                .map(this::convertToModel);
    }
    
    /**
     * Crée ou récupère un compte pour une combinaison agence+service
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public Compte getOrCreateCompteByAgencyAndService(String agency, String service, String pays) {
        String numeroCompte = agency + "_" + service;
        return compteRepository.findByNumeroCompte(numeroCompte)
                .map(this::convertToModel)
                .orElseGet(() -> {
                    // Créer un nouveau compte
                    Compte newCompte = new Compte();
                    newCompte.setNumeroCompte(numeroCompte);
                    newCompte.setCodeProprietaire(numeroCompte);
                    newCompte.setPays(pays != null ? pays : "SN");
                    newCompte.setSolde(0.0);
                    newCompte.setDateDerniereMaj(LocalDateTime.now());
                    return saveCompte(newCompte);
                });
    }
    
    /**
     * Récupère un compte par service
     * Toutes les agences d'un même service impactent le même compte
     */
    public Optional<Compte> getCompteByService(String service) {
        return compteRepository.findByNumeroCompte(service)
                .map(this::convertToModel);
    }
    
    /**
     * Crée ou récupère un compte pour un service
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public Compte getOrCreateCompteByService(String service, String pays) {
        return compteRepository.findByNumeroCompte(service)
                .map(this::convertToModel)
                .orElseGet(() -> {
                    // Créer un nouveau compte
                    Compte newCompte = new Compte();
                    newCompte.setNumeroCompte(service);
                    newCompte.setCodeProprietaire(service);
                    newCompte.setPays(pays != null ? pays : "SN");
                    newCompte.setSolde(0.0);
                    newCompte.setDateDerniereMaj(LocalDateTime.now());
                    return saveCompte(newCompte);
                });
    }
    
    public List<Compte> getComptesByPays(String pays) {
        return compteRepository.findByPays(pays).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<Compte> getComptesByCodeProprietaire(String codeProprietaire) {
        return compteRepository.findByCodeProprietaire(codeProprietaire).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<Compte> getComptesBySoldeSuperieurA(Double soldeMin) {
        return compteRepository.findBySoldeSuperieurA(soldeMin).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public Compte saveCompte(Compte compte) {
        CompteEntity entity = convertToEntity(compte);
        if (entity.getDateDerniereMaj() == null) {
            entity.setDateDerniereMaj(LocalDateTime.now());
        }
        CompteEntity savedEntity = compteRepository.save(entity);
        return convertToModel(savedEntity);
    }
    
    @Transactional
    public boolean deleteCompte(Long id) {
        try {
            if (compteRepository.existsById(id)) {
                // Vérifier s'il y a des opérations liées à ce compte
                List<OperationEntity> operationsLiees = operationRepository.findByCompteId(id);
                if (!operationsLiees.isEmpty()) {
                    logger.warn("Impossible de supprimer le compte ID {} : {} opérations liées trouvées", id, operationsLiees.size());
                    return false;
                }
                
                compteRepository.deleteById(id);
                logger.info("Compte ID {} supprimé avec succès", id);
                return true;
            }
            return false;
        } catch (Exception e) {
            logger.error("Erreur lors de la suppression du compte ID {} : {}", id, e.getMessage(), e);
            return false;
        }
    }
    
    @Transactional
    public boolean updateSolde(Long id, Double nouveauSolde) {
        Optional<CompteEntity> optionalCompte = compteRepository.findById(id);
        if (optionalCompte.isPresent()) {
            CompteEntity compte = optionalCompte.get();
            compte.setSolde(nouveauSolde);
            compte.setDateDerniereMaj(LocalDateTime.now());
            compteRepository.save(compte);
            return true;
        }
        return false;
    }
    
    /**
     * Met à jour le solde d'un compte en ajoutant ou soustrayant un montant
     */
    @Transactional
    public boolean updateSoldeByMontant(Long id, Double montant, boolean isCredit) {
        Optional<CompteEntity> optionalCompte = compteRepository.findById(id);
        if (optionalCompte.isPresent()) {
            CompteEntity compte = optionalCompte.get();
            double soldeActuel = compte.getSolde();
            double nouveauSolde;
            
            if (isCredit) {
                nouveauSolde = soldeActuel + montant;
            } else {
                nouveauSolde = soldeActuel - montant;
            }
            
            compte.setSolde(nouveauSolde);
            compte.setDateDerniereMaj(LocalDateTime.now());
            compteRepository.save(compte);
            return true;
        }
        return false;
    }
    
    /**
     * Récupère le solde actuel d'un compte
     */
    public Double getSoldeCompte(Long id) {
        Optional<CompteEntity> optionalCompte = compteRepository.findById(id);
        return optionalCompte.map(CompteEntity::getSolde).orElse(null);
    }
    
    /**
     * Vérifie si un compte a un solde suffisant pour une opération
     */
    public boolean hasSoldeSuffisant(Long id, Double montant) {
        Double solde = getSoldeCompte(id);
        return solde != null && solde >= montant;
    }
    
    public boolean compteExists(String numeroCompte) {
        return compteRepository.existsByNumeroCompte(numeroCompte);
    }
    
    public List<String> getDistinctPays() {
        return compteRepository.findDistinctPays();
    }
    
    public List<String> getDistinctCodeProprietaire() {
        return compteRepository.findDistinctCodeProprietaire();
    }
    
    public List<Compte> filterComptes(List<String> pays, Double soldeMin, String dateDebut, String dateFin, List<String> codeProprietaire, List<String> categorie) {
        System.out.println("Service: Filtrage des comptes");
        System.out.println("Service: Pays = " + pays);
        System.out.println("Service: SoldeMin = " + soldeMin);
        System.out.println("Service: CodeProprietaire = " + codeProprietaire);
        System.out.println("Service: Categorie = " + categorie);
        System.out.println("Service: DateDebut = " + dateDebut);
        System.out.println("Service: DateFin = " + dateFin);
        
        List<CompteEntity> entities = compteRepository.findAll();
        System.out.println("Service: Total entités trouvées = " + entities.size());
        
        List<Compte> result = entities.stream()
                .filter(entity -> pays == null || pays.isEmpty() || pays.contains(entity.getPays()))
                .filter(entity -> soldeMin == null || entity.getSolde() >= soldeMin)
                .filter(entity -> codeProprietaire == null || codeProprietaire.isEmpty() || codeProprietaire.contains(entity.getCodeProprietaire()))
                .filter(entity -> categorie == null || categorie.isEmpty() || categorie.contains(entity.getCategorie()))
                .filter(entity -> {
                    if ((dateDebut == null || dateDebut.isEmpty()) && (dateFin == null || dateFin.isEmpty())) {
                        return true;
                    }
                    if (entity.getDateDerniereMaj() == null) {
                        return false;
                    }
                    String dateMaj = entity.getDateDerniereMaj().toString();
                    boolean afterDebut = (dateDebut == null || dateDebut.isEmpty()) || dateMaj.compareTo(dateDebut) >= 0;
                    boolean beforeFin = (dateFin == null || dateFin.isEmpty()) || dateMaj.compareTo(dateFin) <= 0;
                    return afterDebut && beforeFin;
                })
                .map(this::convertToModel)
                .collect(Collectors.toList());
        
        System.out.println("Service: Résultats après filtrage = " + result.size());
        return result;
    }
    
    /**
     * Récupère tous les comptes d'une agence
     */
    public List<Compte> getComptesByAgency(String agency) {
        return compteRepository.findByAgency(agency).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    /**
     * Récupère tous les comptes d'un service
     */
    public List<Compte> getComptesByService(String service) {
        return compteRepository.findByService(service).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    /**
     * Récupère la liste des agences uniques
     */
    public List<String> getDistinctAgencies() {
        return compteRepository.findDistinctCodeProprietaire().stream()
                .map(code -> code.split("_")[0])
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }
    
    /**
     * Récupère la liste des services uniques
     */
    public List<String> getDistinctServices() {
        return compteRepository.findDistinctCodeProprietaire().stream()
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }
    
    private Compte convertToModel(CompteEntity entity) {
        Compte compte = new Compte(
                entity.getId(),
                entity.getNumeroCompte(),
                entity.getSolde(),
                entity.getDateDerniereMaj(),
                entity.getPays(),
                entity.getCodeProprietaire()
        );
        compte.setAgence(entity.getAgence());
        compte.setType(entity.getType()); // Ajout
        compte.setCategorie(entity.getCategorie()); // Ajout
        return compte;
    }
    
    private CompteEntity convertToEntity(Compte model) {
        CompteEntity entity = new CompteEntity();
        entity.setId(model.getId());
        entity.setNumeroCompte(model.getNumeroCompte());
        entity.setSolde(model.getSolde());
        entity.setDateDerniereMaj(model.getDateDerniereMaj());
        entity.setPays(model.getPays());
        entity.setCodeProprietaire(model.getCodeProprietaire());
        entity.setAgence(model.getAgence());
        entity.setType(model.getType()); // Ajout
        entity.setCategorie(model.getCategorie()); // Ajout
        return entity;
    }
} 