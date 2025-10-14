package com.reconciliation.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "operation_bancaire")
public class OperationBancaireEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "pays", nullable = false)
    private String pays;
    
    @Column(name = "code_pays")
    private String codePays;
    
    @Column(name = "mois")
    private String mois;
    
    @Column(name = "date_operation", nullable = false)
    private LocalDateTime dateOperation;
    
    @Column(name = "agence", nullable = false)
    private String agence;
    
    @Column(name = "type_operation", nullable = false)
    private String typeOperation;
    
    @Column(name = "nom_beneficiaire")
    private String nomBeneficiaire;
    
    @Column(name = "compte_a_debiter")
    private String compteADebiter;
    
    @Column(name = "montant", nullable = false)
    private Double montant;
    
    @Column(name = "mode_paiement")
    private String modePaiement;
    
    @Column(name = "reference")
    private String reference;
    
    @Column(name = "id_glpi")
    private String idGlpi;
    
    @Column(name = "bo")
    private String bo;
    
    @Column(name = "statut", nullable = false)
    private String statut;
    
    @Column(name = "operation_id")
    private Long operationId;
    
    // Constructeurs
    public OperationBancaireEntity() {}
    
    public OperationBancaireEntity(String pays, String codePays, String mois, LocalDateTime dateOperation,
                                   String agence, String typeOperation, String nomBeneficiaire,
                                   String compteADebiter, Double montant, String modePaiement,
                                   String reference, String idGlpi, String bo, String statut, Long operationId) {
        this.pays = pays;
        this.codePays = codePays;
        this.mois = mois;
        this.dateOperation = dateOperation;
        this.agence = agence;
        this.typeOperation = typeOperation;
        this.nomBeneficiaire = nomBeneficiaire;
        this.compteADebiter = compteADebiter;
        this.montant = montant;
        this.modePaiement = modePaiement;
        this.reference = reference;
        this.idGlpi = idGlpi;
        this.bo = bo;
        this.statut = statut;
        this.operationId = operationId;
    }
    
    // Getters et Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getPays() {
        return pays;
    }
    
    public void setPays(String pays) {
        this.pays = pays;
    }
    
    public String getCodePays() {
        return codePays;
    }
    
    public void setCodePays(String codePays) {
        this.codePays = codePays;
    }
    
    public String getMois() {
        return mois;
    }
    
    public void setMois(String mois) {
        this.mois = mois;
    }
    
    public LocalDateTime getDateOperation() {
        return dateOperation;
    }
    
    public void setDateOperation(LocalDateTime dateOperation) {
        this.dateOperation = dateOperation;
    }
    
    public String getAgence() {
        return agence;
    }
    
    public void setAgence(String agence) {
        this.agence = agence;
    }
    
    public String getTypeOperation() {
        return typeOperation;
    }
    
    public void setTypeOperation(String typeOperation) {
        this.typeOperation = typeOperation;
    }
    
    public String getNomBeneficiaire() {
        return nomBeneficiaire;
    }
    
    public void setNomBeneficiaire(String nomBeneficiaire) {
        this.nomBeneficiaire = nomBeneficiaire;
    }
    
    public String getCompteADebiter() {
        return compteADebiter;
    }
    
    public void setCompteADebiter(String compteADebiter) {
        this.compteADebiter = compteADebiter;
    }
    
    public Double getMontant() {
        return montant;
    }
    
    public void setMontant(Double montant) {
        this.montant = montant;
    }
    
    public String getModePaiement() {
        return modePaiement;
    }
    
    public void setModePaiement(String modePaiement) {
        this.modePaiement = modePaiement;
    }
    
    public String getReference() {
        return reference;
    }
    
    public void setReference(String reference) {
        this.reference = reference;
    }
    
    public String getIdGlpi() {
        return idGlpi;
    }
    
    public void setIdGlpi(String idGlpi) {
        this.idGlpi = idGlpi;
    }
    
    public String getBo() {
        return bo;
    }
    
    public void setBo(String bo) {
        this.bo = bo;
    }
    
    public String getStatut() {
        return statut;
    }
    
    public void setStatut(String statut) {
        this.statut = statut;
    }
    
    public Long getOperationId() {
        return operationId;
    }
    
    public void setOperationId(Long operationId) {
        this.operationId = operationId;
    }
}

