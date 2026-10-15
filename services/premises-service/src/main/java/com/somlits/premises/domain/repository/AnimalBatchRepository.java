package com.somlits.premises.domain.repository;

import com.somlits.premises.domain.entity.AnimalBatch;
import com.somlits.premises.domain.enums.BatchStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AnimalBatchRepository extends JpaRepository<AnimalBatch, UUID> {

    Optional<AnimalBatch> findByBatchCode(String batchCode);

    Page<AnimalBatch> findByPremisesId(UUID premisesId, Pageable pageable);

    Page<AnimalBatch> findByPremisesIdAndStatus(UUID premisesId, BatchStatus status, Pageable pageable);

    List<AnimalBatch> findByPremisesIdAndStatus(UUID premisesId, BatchStatus status);

    boolean existsByBatchCode(String batchCode);

    long countByPremisesIdAndRegistrationYear(UUID premisesId, int year);
}
