package com.reconciliation.repository;

import com.reconciliation.entity.EcartBoSummaryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EcartBoSummaryRepository extends JpaRepository<EcartBoSummaryEntity, Long> {
    
    List<EcartBoSummaryEntity> findByAgence(String agence);
    
    List<EcartBoSummaryEntity> findByService(String service);
    
    List<EcartBoSummaryEntity> findByPays(String pays);
    
    List<EcartBoSummaryEntity> findByStatut(String statut);
    
    List<EcartBoSummaryEntity> findByAgenceAndServiceAndPays(String agence, String service, String pays);
    
    List<EcartBoSummaryEntity> findByDateTransactionBetween(LocalDateTime dateDebut, LocalDateTime dateFin);
    
    @Query("SELECT DISTINCT e.agence FROM EcartBoSummaryEntity e WHERE e.agence IS NOT NULL ORDER BY e.agence")
    List<String> findDistinctAgence();
    
    @Query("SELECT DISTINCT e.service FROM EcartBoSummaryEntity e WHERE e.service IS NOT NULL ORDER BY e.service")
    List<String> findDistinctService();
    
    @Query("SELECT DISTINCT e.pays FROM EcartBoSummaryEntity e WHERE e.pays IS NOT NULL ORDER BY e.pays")
    List<String> findDistinctPays();
    
    @Query("SELECT e FROM EcartBoSummaryEntity e ORDER BY e.dateImport DESC")
    List<EcartBoSummaryEntity> findAllOrderByDateImportDesc();

    List<EcartBoSummaryEntity> findByToken(String token);
}
