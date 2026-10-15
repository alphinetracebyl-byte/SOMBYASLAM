package com.somlits.animalregistry.domain.repository;

import com.somlits.animalregistry.domain.model.OwnershipRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OwnershipRecordRepository extends JpaRepository<OwnershipRecord, UUID> {
    Optional<OwnershipRecord> findByAnimalIdAndEndedAtIsNull(UUID animalId);
    List<OwnershipRecord> findByAnimalIdOrderByStartedAtDesc(UUID animalId);
}
