package com.reconciliation.repository;

import com.reconciliation.entity.Result8RecAuditEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface Result8RecAuditRepository extends JpaRepository<Result8RecAuditEntity, Long> {
    List<Result8RecAuditEntity> findByResult8recIdOrderByCreatedAtAsc(Long result8recId);
}
