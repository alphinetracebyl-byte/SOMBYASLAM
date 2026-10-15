package com.somlits.taginventory.domain.repository;

import com.somlits.taginventory.domain.entity.TagRecord;
import com.somlits.taginventory.domain.enums.TagStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TagRecordRepository extends JpaRepository<TagRecord, UUID> {

    Optional<TagRecord> findBySerialNumber(String serialNumber);

    boolean existsBySerialNumber(String serialNumber);

    Page<TagRecord> findByCurrentCustodianId(UUID custodianId, Pageable pageable);

    List<TagRecord> findByBagId(UUID bagId);

    Page<TagRecord> findByStatus(TagStatus status, Pageable pageable);

    List<TagRecord> findByReservedForRequestId(UUID requestId);

    List<TagRecord> findByBatchId(UUID batchId);

    long countByCurrentCustodianIdAndStatus(UUID custodianId, TagStatus status);

    long countByStatus(TagStatus status);
}
