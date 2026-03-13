package com.reconciliation.repository;

import com.reconciliation.entity.Result8RecEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface Result8RecRepository extends JpaRepository<Result8RecEntity, Long> {
    boolean existsByDateAndAgencyAndServiceAndCountry(String date, String agency, String service, String country);

    Result8RecEntity findFirstByDateAndAgencyAndServiceAndCountryOrderByIdDesc(String date, String agency, String service, String country);

    @Query("SELECT r FROM Result8RecEntity r WHERE LOWER(r.country) IN :countries")
    List<Result8RecEntity> findByCountryCodes(@Param("countries") List<String> countries);

    // Nombre total de relevés distincts (date + service + pays)
    @Query("SELECT COUNT(DISTINCT CONCAT(r.date, '|', r.service, '|', r.country)) FROM Result8RecEntity r")
    long countDistinctReconciliations();

    // Nombre de relevés distincts pour une date donnée (YYYY-MM-DD)
    @Query("SELECT COUNT(DISTINCT CONCAT(r.date, '|', r.service, '|', r.country)) FROM Result8RecEntity r WHERE r.date = :date")
    long countDistinctReconciliationsByDate(@Param("date") String date);

    // Dernière date de relevé dans result8rec
    @Query("SELECT COALESCE(MAX(r.date), NULL) FROM Result8RecEntity r")
    String findMaxResultDate();
}


