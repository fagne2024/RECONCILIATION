package com.reconciliation.repository;

import com.reconciliation.entity.SuiviEcartEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SuiviEcartRepository extends JpaRepository<SuiviEcartEntity, Long> {
    
    @Query("SELECT s FROM SuiviEcartEntity s ORDER BY s.date DESC")
    List<SuiviEcartEntity> findAllOrderByDateDesc();
}

