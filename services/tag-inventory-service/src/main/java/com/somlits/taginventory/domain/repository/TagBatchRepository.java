package com.somlits.taginventory.domain.repository;

import com.somlits.taginventory.domain.entity.TagBatch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TagBatchRepository extends JpaRepository<TagBatch, UUID> {

    Optional<TagBatch> findByBatchCode(String batchCode);

    boolean existsByBatchCode(String batchCode);
}
