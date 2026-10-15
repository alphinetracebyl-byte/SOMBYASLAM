package com.somlits.animalregistry.domain.repository;

import com.somlits.animalregistry.domain.model.PremisesAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PremisesAssignmentRepository extends JpaRepository<PremisesAssignment, UUID> {
    Optional<PremisesAssignment> findByAnimalIdAndEndedAtIsNull(UUID animalId);
    List<PremisesAssignment> findByAnimalIdOrderByStartedAtDesc(UUID animalId);
}
