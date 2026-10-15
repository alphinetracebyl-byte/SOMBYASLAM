package com.somlits.ownerorg.domain.repository;

import com.somlits.ownerorg.domain.entity.OwnerStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OwnerStatusHistoryRepository extends JpaRepository<OwnerStatusHistory, UUID> {

    List<OwnerStatusHistory> findByOwnerIdOrderByChangedAtAsc(UUID ownerId);
}
