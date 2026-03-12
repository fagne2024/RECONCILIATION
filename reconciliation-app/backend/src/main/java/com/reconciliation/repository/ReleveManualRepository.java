package com.reconciliation.repository;

import com.reconciliation.entity.ReleveManualEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface ReleveManualRepository extends JpaRepository<ReleveManualEntity, Long> {

    Optional<ReleveManualEntity> findByDateAndServiceAndCountry(LocalDate date, String service, String country);
}

