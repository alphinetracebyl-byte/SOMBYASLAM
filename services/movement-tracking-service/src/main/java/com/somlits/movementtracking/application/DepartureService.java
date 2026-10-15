package com.somlits.movementtracking.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.movementtracking.domain.enums.MovementStatus;
import com.somlits.movementtracking.domain.exception.DomainNotFoundException;
import com.somlits.movementtracking.domain.model.Movement;
import com.somlits.movementtracking.domain.model.MovementStatusHistory;
import com.somlits.movementtracking.domain.repository.MovementAnimalRepository;
import com.somlits.movementtracking.domain.repository.MovementRepository;
import com.somlits.movementtracking.domain.repository.MovementStatusHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class DepartureService {

    private static final Logger log = LoggerFactory.getLogger(DepartureService.class);

    private final MovementRepository movementRepo;
    private final MovementAnimalRepository animalRepo;
    private final MovementStatusHistoryRepository historyRepo;
    private final OutboxService outbox;
    private final ObjectMapper mapper;

    public DepartureService(MovementRepository movementRepo,
                             MovementAnimalRepository animalRepo,
                             MovementStatusHistoryRepository historyRepo,
                             OutboxService outbox,
                             ObjectMapper mapper) {
        this.movementRepo = movementRepo;
        this.animalRepo = animalRepo;
        this.historyRepo = historyRepo;
        this.outbox = outbox;
        this.mapper = mapper;
    }

    @Transactional
    public Movement confirmDeparture(UUID movementId, UUID actorId, String actorRole,
                                      Instant actualDepartureAt, String vehicleRegistration,
                                      String transporterName, boolean offline) {
        var movement = requireMovement(movementId);
        movement.confirmDeparture(actualDepartureAt, vehicleRegistration, transporterName, offline);

        animalRepo.findByMovementId(movementId).forEach(ma -> ma.markDeparted());

        historyRepo.save(MovementStatusHistory.of(movementId, MovementStatus.PERMIT_ISSUED,
                MovementStatus.DEPARTURE_CONFIRMED, actorId, actorRole,
                offline ? "Departure confirmed (offline)" : "Departure confirmed", offline));

        outbox.publish("DepartureConfirmed", "Movement", movementId,
                toJson(Map.of("movementCode", movement.getMovementCode(),
                        "animalCount", movement.getAnimalCount(),
                        "offline", offline)));

        log.info("Departure confirmed for movement {} by {} — offline={}",
                movement.getMovementCode(), actorId, offline);
        return movement;
    }

    private Movement requireMovement(UUID id) {
        return movementRepo.findById(id)
                .orElseThrow(() -> new DomainNotFoundException("Movement " + id + " not found."));
    }

    private String toJson(Object obj) {
        try { return mapper.writeValueAsString(obj); } catch (JsonProcessingException e) { return "{}"; }
    }
}
