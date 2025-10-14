package com.reconciliation.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "releve_bancaire")
public class ReleveBancaireEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_compte")
    private String numeroCompte;

    @Column(name = "date_comptable")
    private LocalDate dateComptable;

    @Column(name = "date_valeur")
    private LocalDate dateValeur;

    @Column(name = "libelle", length = 2000)
    private String libelle;

    @Column(name = "debit")
    private Double debit;

    @Column(name = "credit")
    private Double credit;

    @Column(name = "montant")
    private Double montant;

    @Column(name = "numero_cheque")
    private String numeroCheque;

    @Column(name = "devise")
    private String devise;

    @Column(name = "solde_courant")
    private Double soldeCourant;

    @Column(name = "solde_disponible_cloture")
    private Double soldeDisponibleCloture;

    @Column(name = "solde_disponible_ouverture")
    private Double soldeDisponibleOuverture;

    @Column(name = "source_filename")
    private String sourceFilename;

    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt;

    @Column(name = "batch_id")
    private String batchId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNumeroCompte() { return numeroCompte; }
    public void setNumeroCompte(String numeroCompte) { this.numeroCompte = numeroCompte; }
    public LocalDate getDateComptable() { return dateComptable; }
    public void setDateComptable(LocalDate dateComptable) { this.dateComptable = dateComptable; }
    public LocalDate getDateValeur() { return dateValeur; }
    public void setDateValeur(LocalDate dateValeur) { this.dateValeur = dateValeur; }
    public String getLibelle() { return libelle; }
    public void setLibelle(String libelle) { this.libelle = libelle; }
    public Double getDebit() { return debit; }
    public void setDebit(Double debit) { this.debit = debit; }
    public Double getCredit() { return credit; }
    public void setCredit(Double credit) { this.credit = credit; }
    public Double getMontant() { return montant; }
    public void setMontant(Double montant) { this.montant = montant; }
    public String getNumeroCheque() { return numeroCheque; }
    public void setNumeroCheque(String numeroCheque) { this.numeroCheque = numeroCheque; }
    public String getDevise() { return devise; }
    public void setDevise(String devise) { this.devise = devise; }
    public Double getSoldeCourant() { return soldeCourant; }
    public void setSoldeCourant(Double soldeCourant) { this.soldeCourant = soldeCourant; }
    public Double getSoldeDisponibleCloture() { return soldeDisponibleCloture; }
    public void setSoldeDisponibleCloture(Double soldeDisponibleCloture) { this.soldeDisponibleCloture = soldeDisponibleCloture; }
    public Double getSoldeDisponibleOuverture() { return soldeDisponibleOuverture; }
    public void setSoldeDisponibleOuverture(Double soldeDisponibleOuverture) { this.soldeDisponibleOuverture = soldeDisponibleOuverture; }
    public String getSourceFilename() { return sourceFilename; }
    public void setSourceFilename(String sourceFilename) { this.sourceFilename = sourceFilename; }
    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
    public String getBatchId() { return batchId; }
    public void setBatchId(String batchId) { this.batchId = batchId; }
}


