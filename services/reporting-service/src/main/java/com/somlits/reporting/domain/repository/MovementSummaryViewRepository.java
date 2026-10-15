package com.somlits.reporting.domain.repository;

import com.somlits.reporting.domain.model.MovementSummaryView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MovementSummaryViewRepository extends JpaRepository<MovementSummaryView, UUID> {

    long countByStatus(String status);

    long countByOriginRegion(String originRegion);

    @Query("SELECT m.status, COUNT(m) FROM MovementSummaryView m GROUP BY m.status")
    List<Object[]> countGroupByStatus();

    @Query("SELECT m.originRegion, m.destinationRegion, COUNT(m) FROM MovementSummaryView m GROUP BY m.originRegion, m.destinationRegion")
    List<Object[]> countGroupByRoute();
}
