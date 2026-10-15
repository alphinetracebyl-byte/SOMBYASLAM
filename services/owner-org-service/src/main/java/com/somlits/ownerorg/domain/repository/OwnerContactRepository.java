package com.somlits.ownerorg.domain.repository;

import com.somlits.ownerorg.domain.entity.OwnerContact;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OwnerContactRepository extends JpaRepository<OwnerContact, UUID> {

    List<OwnerContact> findByOwnerIdAndIsActiveTrueOrderByAddedAtAsc(UUID ownerId);

    List<OwnerContact> findByOwnerIdOrderByAddedAtAsc(UUID ownerId);
}
