package com.somlits.taginventory.domain.repository;

import com.somlits.taginventory.domain.entity.TagBag;
import com.somlits.taginventory.domain.enums.BagStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TagBagRepository extends JpaRepository<TagBag, UUID> {

    Optional<TagBag> findByFirstSerialAndLastSerial(String firstSerial, String lastSerial);

    List<TagBag> findByCurrentCustodianId(UUID custodianId);

    Page<TagBag> findByCurrentCustodianId(UUID custodianId, Pageable pageable);

    List<TagBag> findByStatus(BagStatus status);

    List<TagBag> findByBatchId(UUID batchId);

    List<TagBag> findByCurrentCustodianIdAndStatus(UUID custodianId, BagStatus status);

    long countByCurrentCustodianIdAndStatus(UUID custodianId, BagStatus status);
}
