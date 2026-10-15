package com.somlits.movementtracking.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.movementtracking.domain.enums.MovementAnimalStatus;
import com.somlits.movementtracking.domain.enums.MovementExceptionType;
import com.somlits.movementtracking.domain.enums.MovementStatus;
import com.somlits.movementtracking.domain.exception.DomainNotFoundException;
import com.somlits.movementtracking.domain.model.Movement;
import com.somlits.movementtracking.domain.model.MovementException;
import com.somlits.movementtracking.domain.model.MovementStatusHistory;
import com.somlits.movementtracking.domain.repository.MovementAnimalRepository;
import com.somlits.movementtracking.domain.repository.MovementExceptionRepository;
import com.somlits.movementtracking.domain.repository.MovementRepository;
import com.somlits.movementtracking.domain.repository.MovementStatusHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ArrivalService {

    private static final Logger log = LoggerFactory.getLogger(ArrivalService.class);

    private final MovementRepository movementRepo;
    private final MovementAnimalRepository animalRepo;
    private final MovementExceptionRepository exceptionRepo;
    private final MovementStatusHistoryRepository historyRepo;
    private final OutboxService outbox;
    private final ObjectMapper mapper;

    public ArrivalService(MovementRepository movementRepo,
                           MovementAnimalRepository animalRepo,
                           MovementExceptionRepository exceptionRepo,
                           MovementStatusHistoryRepository historyRepo,
                           OutboxService outbox,
                           ObjectMapper mapper) {
        this.movementRepo = movementRepo;
        this.animalRepo = animalRepo;
        this.exceptionRepo = exceptionRepo;
        this.historyRepo = historyRepo;
        this.outbox = outbox;
        this.mapper = mapper;
    }

    @Transactional
    public Movement confirmFullArrival(UUID movementId, UUID actorId, String actorRole,
                                        Instant actualArrivalAt, boolean offline) {
        var movement = requireMovement(movementId);
        var prevStatus = movement.getStatus();
        movement.confirmArrivalFull(actualArrivalAt, offline);

        animalRepo.findByMovementId(movementId)
                .forEach(ma -> ma.markArrived(ma.getTagSerial()));

        movement.complete();

        historyRepo.save(MovementStatusHistory.of(movementId, prevStatus,
                MovementStatus.COMPLETED, actorId, actorRole,
                offline ? "Full arrival confirmed (offline)" : "Full arrival confirmed", offline));

        publishArrivalEvents(movement, offline);

        log.info("Full arrival confirmed and movement {} completed — offline={}",
                movement.getMovementCode(), offline);
        return movement;
    }

    @Transactional
    public Movement confirmPartialArrival(UUID movementId, UUID actorId, String actorRole,
                                           Instant actualArrivalAt, List<ArrivedAnimal> arrivedAnimals,
                                           List<ExceptionReport> exceptions, boolean offline) {
        var movement = requireMovement(movementId);
        var prevStatus = movement.getStatus();

        arrivedAnimals.forEach(a -> animalRepo.findByMovementIdAndAnimalId(movementId, a.animalId())
                .ifPresent(ma -> ma.markArrived(a.arrivedTagSerial())));

        exceptions.forEach(ex -> {
            recordAnimalException(movementId, ex, actorId);
        });

        movement.confirmArrivalPartial(arrivedAnimals.size(), actualArrivalAt, offline);

        historyRepo.save(MovementStatusHistory.of(movementId, prevStatus,
                MovementStatus.ARRIVAL_PARTIALLY_CONFIRMED, actorId, actorRole,
                arrivedAnimals.size() + " of " + movement.getAnimalCount() + " arrived. "
                        + exceptions.size() + " exceptions recorded.", offline));

        outbox.publish("ArrivalPartiallyConfirmed", "Movement", movementId,
                toJson(Map.of("movementCode", movement.getMovementCode(),
                        "arrivedCount", arrivedAnimals.size(),
                        "exceptionCount", exceptions.size())));

        log.info("Partial arrival for movement {}: {}/{} arrived, {} exceptions",
                movement.getMovementCode(), arrivedAnimals.size(),
                movement.getAnimalCount(), exceptions.size());
        return movement;
    }

    @Transactional
    public MovementException resolveException(UUID exceptionId, UUID actorId, String resolutionNotes) {
        var exc = exceptionRepo.findById(exceptionId)
                .orElseThrow(() -> new DomainNotFoundException("Movement exception " + exceptionId + " not found."));
        exc.resolve(actorId, resolutionNotes);

        var movementId = exc.getMovementId();
        long openCount = exceptionRepo.countByMovementIdAndResolved(movementId, false);
        if (openCount == 0) {
            var movement = requireMovement(movementId);
            if (movement.getStatus() == MovementStatus.ARRIVAL_PARTIALLY_CONFIRMED
                    || movement.getStatus() == MovementStatus.INVESTIGATED) {
                movement.complete();
                historyRepo.save(MovementStatusHistory.of(movementId, movement.getStatus(),
                        MovementStatus.COMPLETED, actorId, "SYSTEM",
                        "All exceptions resolved — movement completed.", false));
                publishArrivalEvents(movement, false);
            }
        }
        return exc;
    }

    @Transactional
    public void openInvestigation(UUID movementId, UUID officerId) {
        var movement = requireMovement(movementId);
        var prevStatus = movement.getStatus();
        movement.openInvestigation();
        historyRepo.save(MovementStatusHistory.of(movementId, prevStatus,
                MovementStatus.INVESTIGATED, officerId, "MINISTRY_OFFICER",
                "Investigation opened for unresolved exceptions.", false));
        outbox.publish("MovementInvestigationOpened", "Movement", movementId,
                toJson(Map.of("movementCode", movement.getMovementCode())));
    }

    private void recordAnimalException(UUID movementId, ExceptionReport ex, UUID reportedBy) {
        var exc = MovementException.of(movementId, ex.type(), ex.animalId(),
                ex.animalCode(), ex.tagSerialFound(), ex.notes(), reportedBy);
        exceptionRepo.save(exc);

        if (ex.animalId() != null) {
            animalRepo.findByMovementIdAndAnimalId(movementId, ex.animalId()).ifPresent(ma -> {
                switch (ex.type()) {
                    case MISSING_ANIMAL -> ma.markMissing(ex.notes());
                    case DEAD_ON_ARRIVAL -> ma.markDeadInTransit(ex.notes());
                    case REJECTED_AT_DESTINATION -> ma.markRejectedAtDestination(ex.notes());
                    default -> { /* other exceptions don't change individual animal status */ }
                }
            });
        }
    }

    private void publishArrivalEvents(Movement movement, boolean offline) {
        outbox.publish("MovementCompleted", "Movement", movement.getId(),
                toJson(Map.of("movementCode", movement.getMovementCode(),
                        "destinationPremisesId", movement.getDestinationPremisesId() != null
                                ? movement.getDestinationPremisesId().toString() : "",
                        "arrivedCount", movement.getArrivedCount(),
                        "offline", offline)));

        outbox.publish("AnimalPremisesUpdateRequired", "Movement", movement.getId(),
                toJson(Map.of("movementId", movement.getId().toString(),
                        "destinationPremisesId", movement.getDestinationPremisesId() != null
                                ? movement.getDestinationPremisesId().toString() : "",
                        "destinationType", movement.getDestinationType().name())));
    }

    private Movement requireMovement(UUID id) {
        return movementRepo.findById(id)
                .orElseThrow(() -> new DomainNotFoundException("Movement " + id + " not found."));
    }

    private String toJson(Object obj) {
        try { return mapper.writeValueAsString(obj); } catch (JsonProcessingException e) { return "{}"; }
    }

    public record ArrivedAnimal(UUID animalId, String arrivedTagSerial) {}
    public record ExceptionReport(MovementExceptionType type, UUID animalId, String animalCode,
                                   String tagSerialFound, String notes) {}
}
