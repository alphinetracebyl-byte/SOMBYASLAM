package com.somlits.reporting.domain.repository;

import com.somlits.reporting.domain.model.DiseaseCaseSummaryView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface DiseaseCaseSummaryViewRepository extends JpaRepository<DiseaseCaseSummaryView, UUID> {

    long countByStatus(String status);

    long countByDisease(String disease);
}
