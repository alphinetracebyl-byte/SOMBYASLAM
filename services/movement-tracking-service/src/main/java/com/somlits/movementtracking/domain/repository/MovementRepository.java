package com.somlits.movementtracking.domain.repository;

import com.somlits.movementtracking.domain.enums.MovementStatus;
import com.somlits.movementtracking.domain.model.Movement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MovementRepository extends JpaRepository<Movement, UUID> {

    Optional<Movement> findByMovementCode(String movementCode);

    Optional<Movement> findByIdempotencyKey(String idempotencyKey);

    Optional<Movement> findByPermitNumber(String permitNumber);

    Page<Movement> findByInitiatorId(UUID initiatorId, Pageable pageable);

    Page<Movement> findByOriginPremisesId(UUID originPremisesId, Pageable pageable);

    Page<Movement> findByDestinationPremisesId(UUID destinationPremisesId, Pageable pageable);

    Page<Movement> findByStatus(MovementStatus status, Pageable pageable);

    Page<Movement> findByStatusIn(List<MovementStatus> statuses, Pageable pageable);

    @Query("SELECT m FROM Movement m WHERE m.status IN ('PERMIT_ISSUED', 'APPROVED') AND m.permitValidUntil < :now")
    List<Movement> findExpiredPermits(@Param("now") Instant now);

    @Query("SELECT m FROM Movement m JOIN MovementAnimal ma ON ma.movementId = m.id WHERE ma.animalId = :animalId ORDER BY m.createdAt DESC")
    Page<Movement> findByAnimalId(@Param("animalId") UUID animalId, Pageable pageable);

    boolean existsByIdempotencyKey(String idempotencyKey);
}
