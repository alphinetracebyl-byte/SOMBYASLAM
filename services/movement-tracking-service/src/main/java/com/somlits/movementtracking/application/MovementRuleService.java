package com.somlits.movementtracking.application;

import com.somlits.movementtracking.domain.enums.DestinationType;
import com.somlits.movementtracking.domain.enums.MovementPurpose;
import com.somlits.movementtracking.domain.exception.BusinessRuleViolationException;
import com.somlits.movementtracking.domain.exception.DomainConflictException;
import com.somlits.movementtracking.domain.exception.DomainNotFoundException;
import com.somlits.movementtracking.domain.model.MovementRule;
import com.somlits.movementtracking.domain.repository.MovementRuleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class MovementRuleService {

    private static final Logger log = LoggerFactory.getLogger(MovementRuleService.class);

    private final MovementRuleRepository ruleRepo;
    private final OutboxService outbox;

    public MovementRuleService(MovementRuleRepository ruleRepo, OutboxService outbox) {
        this.ruleRepo = ruleRepo;
        this.outbox = outbox;
    }

    @Transactional
    public MovementRule create(String ruleCode, String originPremisesType,
                                DestinationType destinationType, MovementPurpose purpose,
                                boolean permitted, boolean requiresVetReview,
                                int permitValidityHours, boolean mixedSpeciesAllowed,
                                boolean crossBorder, String notes, UUID createdBy) {
        if (ruleRepo.existsByRuleCode(ruleCode)) {
            throw new DomainConflictException("ERR-MT-020",
                    "Movement rule with code " + ruleCode + " already exists.");
        }
        var rule = MovementRule.create(ruleCode, originPremisesType, destinationType, purpose,
                permitted, requiresVetReview, permitValidityHours, mixedSpeciesAllowed,
                crossBorder, notes, createdBy);
        ruleRepo.save(rule);
        outbox.publish("MovementRuleCreated", "MovementRule", rule.getId(),
                "{\"ruleCode\":\"" + ruleCode + "\"}");
        log.info("Movement rule {} created by {}", ruleCode, createdBy);
        return rule;
    }

    @Transactional
    public MovementRule update(UUID ruleId, boolean permitted, boolean requiresVetReview,
                                int permitValidityHours, boolean mixedSpeciesAllowed,
                                String notes, UUID actorId) {
        var rule = requireRule(ruleId);
        rule.update(permitted, requiresVetReview, permitValidityHours, mixedSpeciesAllowed, notes);
        log.info("Movement rule {} updated by {}", rule.getRuleCode(), actorId);
        return rule;
    }

    @Transactional
    public void deactivate(UUID ruleId, UUID actorId) {
        var rule = requireRule(ruleId);
        rule.deactivate(actorId);
        outbox.publish("MovementRuleDeactivated", "MovementRule", ruleId,
                "{\"ruleCode\":\"" + rule.getRuleCode() + "\"}");
        log.info("Movement rule {} deactivated by {}", rule.getRuleCode(), actorId);
    }

    @Transactional(readOnly = true)
    public MovementRule resolveRule(String originPremisesType, DestinationType destinationType,
                                     MovementPurpose purpose) {
        return ruleRepo.findByOriginPremisesTypeAndDestinationTypeAndMovementPurposeAndActive(
                        originPremisesType, destinationType, purpose, true)
                .orElseThrow(() -> new BusinessRuleViolationException("ERR-MT-021",
                        "No active movement rule found for " + originPremisesType
                                + " → " + destinationType + " [" + purpose + "]"));
    }

    @Transactional(readOnly = true)
    public Page<MovementRule> listActive(Pageable pageable) {
        return ruleRepo.findByActive(true, pageable);
    }

    @Transactional(readOnly = true)
    public MovementRule getById(UUID ruleId) {
        return requireRule(ruleId);
    }

    private MovementRule requireRule(UUID ruleId) {
        return ruleRepo.findById(ruleId)
                .orElseThrow(() -> new DomainNotFoundException("Movement rule " + ruleId + " not found."));
    }
}
