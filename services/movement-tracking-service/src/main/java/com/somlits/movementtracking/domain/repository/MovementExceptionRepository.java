package com.somlits.movementtracking.domain.repository;

import com.somlits.movementtracking.domain.model.MovementException;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MovementExceptionRepository extends JpaRepository<MovementException, UUID> {

    List<MovementException> findByMovementId(UUID movementId);

    List<MovementException> findByMovementIdAndResolved(UUID movementId, boolean resolved);

    long countByMovementIdAndResolved(UUID movementId, boolean resolved);
}
