package com.reconciliation.repository;

import com.reconciliation.entity.Result8RecEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface Result8RecRepository extends JpaRepository<Result8RecEntity, Long> {
    boolean existsByDateAndAgencyAndServiceAndCountry(String date, String agency, String service, String country);

    Result8RecEntity findFirstByDateAndAgencyAndServiceAndCountryOrderByIdDesc(String date, String agency, String service, String country);
}


