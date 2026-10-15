package com.somlits.vethealth.domain.repository;

import com.somlits.vethealth.domain.entity.DiseaseCase;
import com.somlits.vethealth.domain.enums.DiseaseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DiseaseCaseRepository extends JpaRepository<DiseaseCase, UUID> {
    Page<DiseaseCase> findByStatus(DiseaseStatus status, Pageable pageable);
    List<DiseaseCase> findBySuspectedPremisesId(UUID premisesId);
}
