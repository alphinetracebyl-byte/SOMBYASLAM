package com.somlits.movementtracking.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.movementtracking.domain.exception.DomainNotFoundException;
import com.somlits.movementtracking.domain.model.Movement;
import com.somlits.movementtracking.domain.model.MovementCheckpoint;
import com.somlits.movementtracking.domain.model.MovementStatusHistory;
import com.somlits.movementtracking.domain.repository.MovementCheckpointRepository;
import com.somlits.movementtracking.domain.repository.MovementRepository;
import com.somlits.movementtracking.domain.repository.MovementStatusHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CheckpointService {

    private static final Logger log = LoggerFactory.getLogger(CheckpointService.class);

    private final MovementRepository movementRepo;
    private final MovementCheckpointRepository checkpointRepo;
    private final MovementStatusHistoryRepository historyRepo;
    private final OutboxService outbox;
    private final ObjectMapper mapper;

    public CheckpointService(MovementRepository movementRepo,
                              MovementCheckpointRepository checkpointRepo,
                              MovementStatusHistoryRepository historyRepo,
                              OutboxService outbox,
                              ObjectMapper mapper) {
        this.movementRepo = movementRepo;
        this.checkpointRepo = checkpointRepo;
        this.historyRepo = historyRepo;
        this.outbox = outbox;
        this.mapper = mapper;
    }

    @Transactional
    public MovementCheckpoint record(UUID movementId, UUID officerId, String officerName,
                                      String checkpointName, String checkpointRegion,
                                      int animalsVerifiedCount, boolean permitVerified,
                                      boolean anomalyNoted, String anomalyNotes,
                                      boolean offline) {
        var movement = requireMovement(movementId);
        var prevStatus = movement.getStatus();
        movement.recordCheckpointPass();

        var checkpoint = MovementCheckpoint.of(movementId, checkpointName, checkpointRegion,
                officerId, officerName, animalsVerifiedCount, permitVerified,
                anomalyNoted, anomalyNotes, offline);
        checkpointRepo.save(checkpoint);

        historyRepo.save(MovementStatusHistory.of(movementId, prevStatus,
                movement.getStatus(), officerId, "CHECKPOINT_OFFICER",
                "Checkpoint " + checkpointName + " passed" + (anomalyNoted ? " — ANOMALY noted" : ""),
                offline));

        outbox.publish("CheckpointRecorded", "Movement", movementId,
                toJson(Map.of("movementCode", movement.getMovementCode(),
                        "checkpoint", checkpointName,
                        "anomaly", anomalyNoted)));

        log.info("Checkpoint {} recorded for movement {} by officer {}{}",
                checkpointName, movement.getMovementCode(), officerId,
                anomalyNoted ? " — ANOMALY" : "");
        return checkpoint;
    }

    @Transactional(readOnly = true)
    public List<MovementCheckpoint> listForMovement(UUID movementId) {
        return checkpointRepo.findByMovementIdOrderByRecordedAtAsc(movementId);
    }

    private Movement requireMovement(UUID id) {
        return movementRepo.findById(id)
                .orElseThrow(() -> new DomainNotFoundException("Movement " + id + " not found."));
    }

    private String toJson(Object obj) {
        try { return mapper.writeValueAsString(obj); } catch (JsonProcessingException e) { return "{}"; }
    }
}
