package com.somlits.animalregistry.domain.repository;

import com.somlits.animalregistry.domain.enums.TagAssignmentStatus;
import com.somlits.animalregistry.domain.model.TagAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TagAssignmentRepository extends JpaRepository<TagAssignment, UUID> {
    Optional<TagAssignment> findByAnimalIdAndStatus(UUID animalId, TagAssignmentStatus status);
    boolean existsByTagSerialAndStatus(String tagSerial, TagAssignmentStatus status);
    List<TagAssignment> findByAnimalIdOrderByAssignedAtDesc(UUID animalId);
}
