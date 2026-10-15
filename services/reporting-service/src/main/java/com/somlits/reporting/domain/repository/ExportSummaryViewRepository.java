package com.somlits.reporting.domain.repository;

import com.somlits.reporting.domain.model.ExportSummaryView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExportSummaryViewRepository extends JpaRepository<ExportSummaryView, UUID> {

    long countByStatus(String status);

    long countByDestinationCountry(String destinationCountry);

    @Query("SELECT e.destinationCountry, COUNT(e) FROM ExportSummaryView e GROUP BY e.destinationCountry")
    List<Object[]> countGroupByDestinationCountry();

    @Query("SELECT e.status, COUNT(e) FROM ExportSummaryView e GROUP BY e.status")
    List<Object[]> countGroupByStatus();
}
