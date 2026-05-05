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

    /**
     * Agrégation KPI réconciliation par mois (YYYY-MM), basée sur les colonnes result8rec.
     * NB: r.date est stockée en String ; on s'appuie sur les 7 premiers caractères "YYYY-MM".
     */
    @Query("""
        SELECT substring(r.date, 1, 7) as ym,
               SUM(r.totalTransactions) as totalTransactions,
               SUM(r.totalVolume) as totalVolume,
               SUM(r.matches) as matches
        FROM Result8RecEntity r
        WHERE (r.date IS NOT NULL AND length(r.date) >= 7)
          AND (:startYm IS NULL OR substring(r.date, 1, 7) >= :startYm)
          AND (:endYm IS NULL OR substring(r.date, 1, 7) <= :endYm)
          AND (:service IS NULL OR r.service = :service)
          AND (:env IS NULL OR r.env = :env)
          AND (:country IS NULL OR LOWER(r.country) = LOWER(:country))
          AND (:countries IS NULL OR LOWER(r.country) IN :countries)
        GROUP BY substring(r.date, 1, 7)
        ORDER BY substring(r.date, 1, 7)
    """)
    List<Object[]> aggregateMonthlyKpis(
            @Param("startYm") String startYm,
            @Param("endYm") String endYm,
            @Param("service") String service,
            @Param("env") String env,
            @Param("country") String country,
            @Param("countries") List<String> countries
    );

    @Query("""
        SELECT COUNT(DISTINCT r.service)
        FROM Result8RecEntity r
        WHERE (r.date IS NOT NULL AND length(r.date) >= 7)
          AND (:startYm IS NULL OR substring(r.date, 1, 7) >= :startYm)
          AND (:endYm IS NULL OR substring(r.date, 1, 7) <= :endYm)
          AND (:service IS NULL OR r.service = :service)
          AND (:env IS NULL OR r.env = :env)
          AND (:country IS NULL OR LOWER(r.country) = LOWER(:country))
          AND (:countries IS NULL OR LOWER(r.country) IN :countries)
    """)
    Long countDistinctServices(
            @Param("startYm") String startYm,
            @Param("endYm") String endYm,
            @Param("service") String service,
            @Param("env") String env,
            @Param("country") String country,
            @Param("countries") List<String> countries
    );

    @Query("""
        SELECT COUNT(DISTINCT LOWER(r.country))
        FROM Result8RecEntity r
        WHERE (r.date IS NOT NULL AND length(r.date) >= 7)
          AND (:startYm IS NULL OR substring(r.date, 1, 7) >= :startYm)
          AND (:endYm IS NULL OR substring(r.date, 1, 7) <= :endYm)
          AND (:service IS NULL OR r.service = :service)
          AND (:env IS NULL OR r.env = :env)
          AND (:country IS NULL OR LOWER(r.country) = LOWER(:country))
          AND (:countries IS NULL OR LOWER(r.country) IN :countries)
    """)
    Long countDistinctCountries(
            @Param("startYm") String startYm,
            @Param("endYm") String endYm,
            @Param("service") String service,
            @Param("env") String env,
            @Param("country") String country,
            @Param("countries") List<String> countries
    );

    @Query("""
        SELECT COUNT(DISTINCT r.agency)
        FROM Result8RecEntity r
        WHERE (r.date IS NOT NULL AND length(r.date) >= 7)
          AND (:startYm IS NULL OR substring(r.date, 1, 7) >= :startYm)
          AND (:endYm IS NULL OR substring(r.date, 1, 7) <= :endYm)
          AND (:service IS NULL OR r.service = :service)
          AND (:env IS NULL OR r.env = :env)
          AND (:country IS NULL OR LOWER(r.country) = LOWER(:country))
          AND (:countries IS NULL OR LOWER(r.country) IN :countries)
    """)
    Long countDistinctAgencies(
            @Param("startYm") String startYm,
            @Param("endYm") String endYm,
            @Param("service") String service,
            @Param("env") String env,
            @Param("country") String country,
            @Param("countries") List<String> countries
    );
}


