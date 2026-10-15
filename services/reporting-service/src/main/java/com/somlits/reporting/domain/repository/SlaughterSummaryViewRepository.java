package com.somlits.reporting.domain.repository;

import com.somlits.reporting.domain.model.SlaughterSummaryView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SlaughterSummaryViewRepository extends JpaRepository<SlaughterSummaryView, UUID> {

    long countByOutcome(String outcome);

    long countByRegionCode(String regionCode);

    @Query("SELECT s.outcome, COUNT(s) FROM SlaughterSummaryView s GROUP BY s.outcome")
    List<Object[]> countGroupByOutcome();

    @Query("SELECT s.regionCode, COUNT(s) FROM SlaughterSummaryView s GROUP BY s.regionCode")
    List<Object[]> countGroupByRegionCode();
}
