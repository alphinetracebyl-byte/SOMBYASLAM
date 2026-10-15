package com.somlits.movementtracking.domain.repository;

import com.somlits.movementtracking.domain.enums.DestinationType;
import com.somlits.movementtracking.domain.enums.MovementPurpose;
import com.somlits.movementtracking.domain.model.MovementRule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MovementRuleRepository extends JpaRepository<MovementRule, UUID> {

    Optional<MovementRule> findByRuleCode(String ruleCode);

    Optional<MovementRule> findByOriginPremisesTypeAndDestinationTypeAndMovementPurposeAndActive(
            String originPremisesType, DestinationType destinationType,
            MovementPurpose movementPurpose, boolean active);

    List<MovementRule> findByActiveTrue();

    Page<MovementRule> findByActive(boolean active, Pageable pageable);

    boolean existsByRuleCode(String ruleCode);
}
