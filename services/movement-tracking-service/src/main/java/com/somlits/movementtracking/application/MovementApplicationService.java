package com.somlits.movementtracking.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.movementtracking.domain.enums.DestinationType;
import com.somlits.movementtracking.domain.enums.MovementInitiatorRole;
import com.somlits.movementtracking.domain.enums.MovementPurpose;
import com.somlits.movementtracking.domain.enums.MovementStatus;
import com.somlits.movementtracking.domain.exception.DomainConflictException;
import com.somlits.movementtracking.domain.exception.DomainNotFoundException;
import com.somlits.movementtracking.domain.model.Movement;
import com.somlits.movementtracking.domain.model.MovementAnimal;
import com.somlits.movementtracking.domain.model.MovementStatusHistory;
import com.somlits.movementtracking.domain.repository.MovementAnimalRepository;
import com.somlits.movementtracking.domain.repository.MovementRepository;
import com.somlits.movementtracking.domain.repository.MovementStatusHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class MovementApplicationService {

    private static final Logger log = LoggerFactory.getLogger(MovementApplicationService.class);

    private final MovementRepository movementRepo;
    private final MovementAnimalRepository animalRepo;
    private final MovementStatusHistoryRepository historyRepo;
    private final MovementRuleService ruleService;
    private final MovementCodeGenerator codeGen;
    private final OutboxService outbox;
    private final ObjectMapper mapper;

    public MovementApplicationService(MovementRepository movementRepo,
                                       MovementAnimalRepository animalRepo,
                                       MovementStatusHistoryRepository historyRepo,
                                       MovementRuleService ruleService,
                                       MovementCodeGenerator codeGen,
                                       OutboxService outbox,
                                       ObjectMapper mapper) {
        this.movementRepo = movementRepo;
        this.animalRepo = animalRepo;
        this.historyRepo = historyRepo;
        this.ruleService = ruleService;
        this.codeGen = codeGen;
        this.outbox = outbox;
        this.mapper = mapper;
    }

    @Transactional
    public Movement createDraft(String idempotencyKey, MovementInitiatorRole initiatorRole,
                                 UUID initiatorId, UUID onBehalfOfOwnerId,
                                 UUID originPremisesId, String originPremisesType,
                                 UUID destinationPremisesId, DestinationType destinationType,
                                 String destinationName, String destinationRegion,
                                 String destinationDistrict, String destinationCountry,
                                 MovementPurpose purpose, List<AnimalRef> animals,
                                 String vehicleRegistration, String transporterName,
                                 String transporterLicence, Instant plannedDepartureAt,
                                 Instant plannedArrivalAt, String routeDescription,
                                 boolean isEmergency, String emergencyReason,
                                 boolean isCrossBorder) {

        if (movementRepo.existsByIdempotencyKey(idempotencyKey)) {
            return movementRepo.findByIdempotencyKey(idempotencyKey).orElseThrow();
        }

        var rule = ruleService.resolveRule(originPremisesType, destinationType, purpose);
        rule.assertPermitted();

        if (!rule.isMixedSpeciesAllowed()) {
            long distinctSpecies = animals.stream().map(AnimalRef::species).distinct().count();
            if (distinctSpecies > 1) {
                throw new com.somlits.movementtracking.domain.exception.BusinessRuleViolationException(
                        "ERR-MT-011", "This movement rule does not permit mixed-species groups.");
            }
        }

        String movementCode = codeGen.next();
        var movement = Movement.create(movementCode, idempotencyKey, initiatorRole, initiatorId,
                onBehalfOfOwnerId, originPremisesId, originPremisesType, destinationPremisesId,
                destinationType, destinationName, destinationRegion, destinationDistrict,
                destinationCountry, purpose, rule.getId(), animals.size(),
                vehicleRegistration, transporterName, transporterLicence,
                plannedDepartureAt, plannedArrivalAt, routeDescription,
                isEmergency, emergencyReason, isCrossBorder);
        movementRepo.save(movement);

        animals.forEach(ref -> animalRepo.save(
                MovementAnimal.of(movement.getId(), ref.animalId(), ref.animalCode(),
                        ref.tagSerial(), ref.species())));

        historyRepo.save(MovementStatusHistory.of(movement.getId(), null,
                MovementStatus.DRAFT, initiatorId, initiatorRole.name(), "Draft created", false));

        log.info("Movement draft {} created for {} animals from {} to {}",
                movementCode, animals.size(), originPremisesId, destinationType);
        return movement;
    }

    @Transactional
    public Movement submit(UUID movementId, UUID actorId, String actorRole) {
        var movement = requireMovement(movementId);
        var prevStatus = movement.getStatus();
        movement.submit();

        var rule = ruleService.getById(movement.getMovementRuleId());
        if (rule.isRequiresVetReview()) {
            movement.routeForVetReview();
        } else {
            movement.approve(actorId, "Auto-approved — no vet review required by rule.");
            issuePermitInternal(movement, rule.getPermitValidityHours(), actorId);
        }

        historyRepo.save(MovementStatusHistory.of(movementId, prevStatus,
                movement.getStatus(), actorId, actorRole, "Submitted", false));

        outbox.publish("MovementSubmitted", "Movement", movementId,
                toJson(Map.of("movementCode", movement.getMovementCode(),
                        "status", movement.getStatus().name())));
        log.info("Movement {} submitted — status now {}", movement.getMovementCode(), movement.getStatus());
        return movement;
    }

    @Transactional
    public Movement vetApprove(UUID movementId, UUID vetId, String vetNotes) {
        var movement = requireMovement(movementId);
        var prevStatus = movement.getStatus();
        movement.approve(vetId, vetNotes);
        var rule = ruleService.getById(movement.getMovementRuleId());
        issuePermitInternal(movement, rule.getPermitValidityHours(), vetId);
        historyRepo.save(MovementStatusHistory.of(movementId, prevStatus,
                movement.getStatus(), vetId, "VETERINARY_OFFICER", vetNotes, false));
        outbox.publish("MovementApproved", "Movement", movementId,
                toJson(Map.of("movementCode", movement.getMovementCode(),
                        "permitNumber", movement.getPermitNumber())));
        log.info("Movement {} approved by vet {}", movement.getMovementCode(), vetId);
        return movement;
    }

    @Transactional
    public Movement vetReject(UUID movementId, UUID vetId, String reason) {
        var movement = requireMovement(movementId);
        var prevStatus = movement.getStatus();
        movement.reject(vetId, reason);
        historyRepo.save(MovementStatusHistory.of(movementId, prevStatus,
                MovementStatus.REJECTED, vetId, "VETERINARY_OFFICER", reason, false));
        outbox.publish("MovementRejected", "Movement", movementId,
                toJson(Map.of("movementCode", movement.getMovementCode(), "reason", reason)));
        log.info("Movement {} rejected by vet {}: {}", movement.getMovementCode(), vetId, reason);
        return movement;
    }

    @Transactional
    public Movement cancel(UUID movementId, UUID actorId, String actorRole, String reason) {
        var movement = requireMovement(movementId);
        var prevStatus = movement.getStatus();
        movement.cancel(reason);
        historyRepo.save(MovementStatusHistory.of(movementId, prevStatus,
                MovementStatus.CANCELLED, actorId, actorRole, reason, false));
        outbox.publish("MovementCancelled", "Movement", movementId,
                toJson(Map.of("movementCode", movement.getMovementCode(), "reason", reason)));
        log.info("Movement {} cancelled by {}", movement.getMovementCode(), actorId);
        return movement;
    }

    @Transactional
    public Movement recordIllegalMovement(UUID movementId, String notes, UUID officerId) {
        var movement = requireMovement(movementId);
        movement.setIllegalMovement(true, notes);
        historyRepo.save(MovementStatusHistory.of(movementId, movement.getStatus(),
                movement.getStatus(), officerId, "MINISTRY_OFFICER",
                "Flagged as illegal movement: " + notes, false));
        outbox.publish("IllegalMovementRecorded", "Movement", movementId,
                toJson(Map.of("movementCode", movement.getMovementCode())));
        log.warn("Movement {} flagged as illegal by officer {}", movement.getMovementCode(), officerId);
        return movement;
    }

    @Transactional(readOnly = true)
    public Movement getById(UUID movementId) {
        return requireMovement(movementId);
    }

    @Transactional(readOnly = true)
    public Movement getByCode(String code) {
        return movementRepo.findByMovementCode(code)
                .orElseThrow(() -> new DomainNotFoundException("Movement " + code + " not found."));
    }

    @Transactional(readOnly = true)
    public Page<Movement> listByStatus(MovementStatus status, Pageable pageable) {
        return movementRepo.findByStatus(status, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Movement> listByInitiator(UUID initiatorId, Pageable pageable) {
        return movementRepo.findByInitiatorId(initiatorId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Movement> listByAnimal(UUID animalId, Pageable pageable) {
        return movementRepo.findByAnimalId(animalId, pageable);
    }

    private void issuePermitInternal(Movement movement, int validityHours, UUID actorId) {
        String permitNumber = codeGen.nextPermitNumber();
        movement.issuePermit(permitNumber, validityHours);
        historyRepo.save(MovementStatusHistory.of(movement.getId(), MovementStatus.APPROVED,
                MovementStatus.PERMIT_ISSUED, actorId, "SYSTEM",
                "Permit " + permitNumber + " issued, valid for " + validityHours + " hours.", false));
        outbox.publish("MovementPermitIssued", "Movement", movement.getId(),
                toJson(Map.of("movementCode", movement.getMovementCode(),
                        "permitNumber", permitNumber)));
    }

    private Movement requireMovement(UUID id) {
        return movementRepo.findById(id)
                .orElseThrow(() -> new DomainNotFoundException("Movement " + id + " not found."));
    }

    private String toJson(Object obj) {
        try {
            return mapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    public record AnimalRef(UUID animalId, String animalCode, String tagSerial, String species) {}
}
