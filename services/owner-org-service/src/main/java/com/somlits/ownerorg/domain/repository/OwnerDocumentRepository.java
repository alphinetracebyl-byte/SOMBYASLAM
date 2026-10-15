package com.somlits.ownerorg.domain.repository;

import com.somlits.ownerorg.domain.entity.OwnerDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OwnerDocumentRepository extends JpaRepository<OwnerDocument, UUID> {

    List<OwnerDocument> findByOwnerIdOrderByUploadedAtDesc(UUID ownerId);
}
