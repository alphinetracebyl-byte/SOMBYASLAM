package com.somlits.premises.domain.repository;

import com.somlits.premises.domain.entity.BatchOperationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BatchOperationLogRepository extends JpaRepository<BatchOperationLog, UUID> {

    Page<BatchOperationLog> findByBatchId(UUID batchId, Pageable pageable);
}
