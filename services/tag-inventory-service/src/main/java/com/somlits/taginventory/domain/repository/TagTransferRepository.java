package com.somlits.taginventory.domain.repository;

import com.somlits.taginventory.domain.entity.TagTransfer;
import com.somlits.taginventory.domain.enums.TagTransferStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TagTransferRepository extends JpaRepository<TagTransfer, UUID> {

    Page<TagTransfer> findByFromCustodianIdOrToCustodianId(UUID fromId, UUID toId, Pageable pageable);

    Page<TagTransfer> findByStatus(TagTransferStatus status, Pageable pageable);
}
