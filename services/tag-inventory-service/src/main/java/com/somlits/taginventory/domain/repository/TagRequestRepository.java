package com.somlits.taginventory.domain.repository;

import com.somlits.taginventory.domain.entity.TagRequest;
import com.somlits.taginventory.domain.enums.TagRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TagRequestRepository extends JpaRepository<TagRequest, UUID> {

    Page<TagRequest> findByOwnerCode(String ownerCode, Pageable pageable);

    Page<TagRequest> findByStatus(TagRequestStatus status, Pageable pageable);

    Page<TagRequest> findByOwnerId(UUID ownerId, Pageable pageable);

    List<TagRequest> findByStatus(TagRequestStatus status);
}
