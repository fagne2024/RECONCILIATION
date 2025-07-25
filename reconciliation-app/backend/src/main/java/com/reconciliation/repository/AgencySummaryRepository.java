package com.reconciliation.repository;

import com.reconciliation.entity.AgencySummaryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface AgencySummaryRepository extends JpaRepository<AgencySummaryEntity, Long> {
    @Query("SELECT a FROM AgencySummaryEntity a WHERE a.date = :date AND a.agency = :agency AND a.service = :service AND a.recordCount = :recordCount AND ABS(a.totalVolume - :totalVolume) < 0.01")
    List<AgencySummaryEntity> findDuplicates(
        @Param("date") String date,
        @Param("agency") String agency,
        @Param("service") String service,
        @Param("totalVolume") double totalVolume,
        @Param("recordCount") int recordCount
    );
    
    @Query("SELECT a FROM AgencySummaryEntity a WHERE a.service = :service AND a.date = :date")
    List<AgencySummaryEntity> findByServiceAndDate(
        @Param("service") String service,
        @Param("date") String date
    );

    @Query("SELECT COALESCE(SUM(a.totalVolume), 0) FROM AgencySummaryEntity a WHERE (:agencies IS NULL OR a.agency IN :agencies) AND (:services IS NULL OR a.service IN :services) AND (:countries IS NULL OR a.country IN :countries) AND (:startDate IS NULL OR a.date >= :startDate) AND (:endDate IS NULL OR a.date <= :endDate)")
    Double calculateTotalVolumeWithDateRange(
        @Param("agencies") List<String> agencies,
        @Param("services") List<String> services,
        @Param("countries") List<String> countries,
        @Param("startDate") String startDate,
        @Param("endDate") String endDate
    );

    @Query("SELECT COALESCE(SUM(a.recordCount), 0) FROM AgencySummaryEntity a WHERE (:agencies IS NULL OR a.agency IN :agencies) AND (:services IS NULL OR a.service IN :services) AND (:countries IS NULL OR a.country IN :countries) AND (:startDate IS NULL OR a.date >= :startDate) AND (:endDate IS NULL OR a.date <= :endDate)")
    long countTransactionsWithDateRange(
        @Param("agencies") List<String> agencies,
        @Param("services") List<String> services,
        @Param("countries") List<String> countries,
        @Param("startDate") String startDate,
        @Param("endDate") String endDate
    );

    @Query("SELECT COUNT(DISTINCT a.agency) FROM AgencySummaryEntity a WHERE (:agencies IS NULL OR a.agency IN :agencies) AND (:services IS NULL OR a.service IN :services) AND (:countries IS NULL OR a.country IN :countries) AND (:startDate IS NULL OR a.date >= :startDate) AND (:endDate IS NULL OR a.date <= :endDate)")
    long countDistinctAgencyWithDateRange(
        @Param("agencies") List<String> agencies,
        @Param("services") List<String> services,
        @Param("countries") List<String> countries,
        @Param("startDate") String startDate,
        @Param("endDate") String endDate
    );

    @Query("SELECT a.service as operationType, COUNT(a) as transactionCount, COALESCE(SUM(a.totalVolume), 0) as totalVolume, COALESCE(AVG(a.totalVolume), 0) as averageVolume FROM AgencySummaryEntity a WHERE (:agencies IS NULL OR a.agency IN :agencies) AND (:services IS NULL OR a.service IN :services) AND (:countries IS NULL OR a.country IN :countries) AND (:startDate IS NULL OR a.date >= :startDate) AND (:endDate IS NULL OR a.date <= :endDate) GROUP BY a.service")
    List<Object[]> getOperationTypeStatisticsWithDateRange(
        @Param("agencies") List<String> agencies,
        @Param("services") List<String> services,
        @Param("countries") List<String> countries,
        @Param("startDate") String startDate,
        @Param("endDate") String endDate
    );

    @Query("SELECT a.service as operationType, COUNT(a) as frequency FROM AgencySummaryEntity a WHERE (:agencies IS NULL OR a.agency IN :agencies) AND (:services IS NULL OR a.service IN :services) AND (:countries IS NULL OR a.country IN :countries) AND (:startDate IS NULL OR a.date >= :startDate) AND (:endDate IS NULL OR a.date <= :endDate) GROUP BY a.service ORDER BY frequency DESC")
    List<Object[]> getOperationFrequencyWithDateRange(
        @Param("agencies") List<String> agencies,
        @Param("services") List<String> services,
        @Param("countries") List<String> countries,
        @Param("startDate") String startDate,
        @Param("endDate") String endDate
    );

    @Query("SELECT COALESCE(MAX(a.date), NULL) FROM AgencySummaryEntity a")
    String findMaxDate();

    @Query("SELECT COUNT(DISTINCT a.agency) FROM AgencySummaryEntity a")
    long countDistinctAgency();

    @Query("SELECT COUNT(a) FROM AgencySummaryEntity a WHERE a.date = :date")
    long countByDate(@Param("date") String date);

    @Query("SELECT a FROM AgencySummaryEntity a WHERE a.date = :date AND a.agency = :agency AND a.service = :service")
    List<AgencySummaryEntity> findByDateAndAgencyAndService(
        @Param("date") String date,
        @Param("agency") String agency,
        @Param("service") String service
    );

    @Modifying
    @Transactional
    @Query("DELETE FROM AgencySummaryEntity a WHERE a.date = :date AND a.agency = :agency AND a.service = :service")
    void deleteByDateAndAgencyAndService(
        @Param("date") String date,
        @Param("agency") String agency,
        @Param("service") String service
    );

    @Query("SELECT COALESCE(MIN(a.date), NULL) FROM AgencySummaryEntity a")
    String findMinDate();

    @Query("SELECT a FROM AgencySummaryEntity a WHERE a.agency = :agency AND a.service = :service ORDER BY a.date DESC")
    List<AgencySummaryEntity> findByAgencyAndServiceOrderByDateDesc(
        @Param("agency") String agency,
        @Param("service") String service
    );

    @Query("SELECT a FROM AgencySummaryEntity a WHERE a.date = :date AND a.agency = :agency")
    List<AgencySummaryEntity> findByDateAndAgency(
        @Param("date") String date,
        @Param("agency") String agency
    );
} 