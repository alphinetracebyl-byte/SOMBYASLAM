package com.somlits.movementtracking.domain.repository;

import com.somlits.movementtracking.domain.model.MovementCheckpoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MovementCheckpointRepository extends JpaRepository<MovementCheckpoint, UUID> {

    List<MovementCheckpoint> findByMovementIdOrderByRecordedAtAsc(UUID movementId);

    long countByMovementId(UUID movementId);
}
