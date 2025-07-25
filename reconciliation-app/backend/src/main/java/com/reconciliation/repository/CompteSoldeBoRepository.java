package com.reconciliation.repository;

import com.reconciliation.entity.CompteSoldeBoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;

public interface CompteSoldeBoRepository extends JpaRepository<CompteSoldeBoEntity, Long> {
    Optional<CompteSoldeBoEntity> findByNumeroCompteAndDateSolde(String numeroCompte, LocalDate dateSolde);
} 