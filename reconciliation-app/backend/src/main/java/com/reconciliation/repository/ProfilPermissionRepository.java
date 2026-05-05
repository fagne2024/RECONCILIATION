package com.reconciliation.repository;

import com.reconciliation.entity.ProfilPermissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProfilPermissionRepository extends JpaRepository<ProfilPermissionEntity, Long> {
    List<ProfilPermissionEntity> findByProfilId(Long profilId);
    List<ProfilPermissionEntity> findByModuleId(Long moduleId);
    List<ProfilPermissionEntity> findByPermissionId(Long permissionId);
    List<ProfilPermissionEntity> findByProfilIdAndModuleId(Long profilId, Long moduleId);
    Optional<ProfilPermissionEntity> findByProfilIdAndModuleIdAndPermissionId(Long profilId, Long moduleId, Long permissionId);
} 