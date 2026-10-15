package com.somlits.traceability.domain.repository;

import com.somlits.traceability.domain.model.TraceabilitySnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TraceabilitySnapshotRepository extends JpaRepository<TraceabilitySnapshot, UUID> {

    Optional<TraceabilitySnapshot> findByAnimalId(UUID animalId);
}
