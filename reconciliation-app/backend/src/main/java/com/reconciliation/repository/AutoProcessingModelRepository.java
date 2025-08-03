package com.reconciliation.repository;

import com.reconciliation.entity.AutoProcessingModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AutoProcessingModelRepository extends JpaRepository<AutoProcessingModel, Long> {
    
    Optional<AutoProcessingModel> findByModelId(String modelId);
    
    Optional<AutoProcessingModel> findByName(String name);
    
    boolean existsByModelId(String modelId);
    
    boolean existsByName(String name);
} 