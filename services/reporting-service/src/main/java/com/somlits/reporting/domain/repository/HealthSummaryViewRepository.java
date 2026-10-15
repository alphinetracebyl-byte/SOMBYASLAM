package com.somlits.reporting.domain.repository;

import com.somlits.reporting.domain.model.HealthSummaryView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface HealthSummaryViewRepository extends JpaRepository<HealthSummaryView, UUID> {

    long countByEventType(String eventType);

    @Query("SELECT h.regionCode, h.eventType, COUNT(h) FROM HealthSummaryView h GROUP BY h.regionCode, h.eventType")
    List<Object[]> countByRegionCodeGroupByEventType();
}
