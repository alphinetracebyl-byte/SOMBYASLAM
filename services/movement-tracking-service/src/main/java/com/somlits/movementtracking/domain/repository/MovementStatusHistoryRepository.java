package com.somlits.movementtracking.domain.repository;

import com.somlits.movementtracking.domain.model.MovementStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MovementStatusHistoryRepository extends JpaRepository<MovementStatusHistory, UUID> {

    List<MovementStatusHistory> findByMovementIdOrderByOccurredAtAsc(UUID movementId);
}
