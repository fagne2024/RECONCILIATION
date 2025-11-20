package com.reconciliation.repository;

import com.reconciliation.entity.ServiceReferenceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ServiceReferenceRepository extends JpaRepository<ServiceReferenceEntity, Long> {
    List<ServiceReferenceEntity> findByPays(String pays);
    List<ServiceReferenceEntity> findByPaysIn(List<String> pays);
    Optional<ServiceReferenceEntity> findByCodeReco(String codeReco);
    Optional<ServiceReferenceEntity> findByCodeService(String codeService);
    Optional<ServiceReferenceEntity> findByPaysAndCodeReco(String pays, String codeReco);
}

