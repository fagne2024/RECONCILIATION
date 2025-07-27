package com.reconciliation.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import java.util.Set;
import com.reconciliation.entity.ProfilPermissionEntity;

@Entity
@Table(name = "module")
public class ModuleEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nom;

    @OneToMany(mappedBy = "module")
    @JsonIgnore
    private Set<ProfilPermissionEntity> permissions;

    // Getters et setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public Set<ProfilPermissionEntity> getPermissions() { return permissions; }
    public void setPermissions(Set<ProfilPermissionEntity> permissions) { this.permissions = permissions; }
} 