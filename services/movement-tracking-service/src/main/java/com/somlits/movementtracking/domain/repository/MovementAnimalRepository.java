package com.somlits.movementtracking.domain.repository;

import com.somlits.movementtracking.domain.enums.MovementAnimalStatus;
import com.somlits.movementtracking.domain.model.MovementAnimal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MovementAnimalRepository extends JpaRepository<MovementAnimal, UUID> {

    List<MovementAnimal> findByMovementId(UUID movementId);

    List<MovementAnimal> findByMovementIdAndStatus(UUID movementId, MovementAnimalStatus status);

    Optional<MovementAnimal> findByMovementIdAndAnimalId(UUID movementId, UUID animalId);

    List<MovementAnimal> findByAnimalId(UUID animalId);

    boolean existsByMovementIdAndAnimalId(UUID movementId, UUID animalId);

    long countByMovementIdAndStatus(UUID movementId, MovementAnimalStatus status);
}
