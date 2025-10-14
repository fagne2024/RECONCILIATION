package com.reconciliation.repository;

import com.reconciliation.entity.ReleveBancaireEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReleveBancaireRepository extends JpaRepository<ReleveBancaireEntity, Long> {
}


