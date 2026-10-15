package com.somlits.vethealth.domain.repository;

import com.somlits.vethealth.domain.entity.MovementRestriction;
import com.somlits.vethealth.domain.enums.MovementRestrictionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface MovementRestrictionRepository extends JpaRepository<MovementRestriction, UUID> {
    List<MovementRestriction> findByAnimalIdAndStatus(UUID animalId, MovementRestrictionStatus status);
    List<MovementRestriction> findByPremisesIdAndStatus(UUID premisesId, MovementRestrictionStatus status);

    @Query("SELECT r FROM MovementRestriction r WHERE r.animalId = :animalId AND r.status = 'ACTIVE'")
    List<MovementRestriction> findActiveByAnimalId(@Param("animalId") UUID animalId);
}
