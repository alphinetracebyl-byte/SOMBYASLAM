package com.somlits.premises.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.premises.domain.entity.AnimalBatch;
import com.somlits.premises.domain.entity.BatchOperationLog;
import com.somlits.premises.domain.enums.BatchOperationType;
import com.somlits.premises.domain.enums.BatchStatus;
import com.somlits.premises.domain.enums.PremisesStatus;
import com.somlits.premises.domain.exception.BusinessRuleViolationException;
import com.somlits.premises.domain.exception.DomainNotFoundException;
import com.somlits.premises.domain.repository.AnimalBatchRepository;
import com.somlits.premises.domain.repository.BatchOperationLogRepository;
import com.somlits.premises.domain.repository.PremisesRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;
import java.util.Map;
import java.util.UUID;

@Service
public class BatchService {

    private static final Logger log = LoggerFactory.getLogger(BatchService.class);

    private final AnimalBatchRepository batchRepo;
    private final BatchOperationLogRepository logRepo;
    private final PremisesRepository premisesRepo;
    private final OutboxService outbox;
    private final ObjectMapper objectMapper;

    public BatchService(AnimalBatchRepository batchRepo,
                        BatchOperationLogRepository logRepo,
                        PremisesRepository premisesRepo,
                        OutboxService outbox,
                        ObjectMapper objectMapper) {
        this.batchRepo = batchRepo;
        this.logRepo = logRepo;
        this.premisesRepo = premisesRepo;
        this.outbox = outbox;
        this.objectMapper = objectMapper;
    }

    // ── Commands ──────────────────────────────────────────────────────────────

    @Transactional
    public AnimalBatch openBatch(UUID premisesId, String species, String notes, UUID createdBy) {
        var premises = premisesRepo.findById(premisesId)
                .orElseThrow(() -> new DomainNotFoundException("Premises not found: " + premisesId));

        if (premises.getStatus() != PremisesStatus.APPROVED) {
            throw new BusinessRuleViolationException("ERR-BAT-010",
                    "Batches can only be created on APPROVED premises (current: " + premises.getStatus() + ")");
        }

        int year = Year.now().getValue();
        long seq = batchRepo.countByPremisesIdAndRegistrationYear(premisesId, year) + 1;
        String batchCode = String.format("BAT-%s-%d-%04d", premises.getPremisesCode(), year, seq);

        AnimalBatch batch = AnimalBatch.open(premisesId, batchCode, year, species, createdBy, notes);
        batchRepo.save(batch);

        publishEvent("BatchCreatedEvent", batch.getId(), Map.of(
                "batchId", batch.getId(),
                "batchCode", batchCode,
                "premisesId", premisesId,
                "premisesCode", premises.getPremisesCode()));

        log.info("Batch opened: code={} premises={}", batchCode, premises.getPremisesCode());
        return batch;
    }

    @Transactional
    public AnimalBatch closeBatch(UUID batchId, UUID callerUserId) {
        AnimalBatch batch = findBatchOrThrow(batchId);
        batch.close(callerUserId);
        batchRepo.save(batch);

        publishEvent("BatchClosedEvent", batch.getId(), Map.of(
                "batchId", batch.getId(),
                "batchCode", batch.getBatchCode(),
                "premisesId", batch.getPremisesId(),
                "animalCount", batch.getAnimalCount()));

        log.info("Batch closed: code={} animals={}", batch.getBatchCode(), batch.getAnimalCount());
        return batch;
    }

    @Transactional
    public BatchOperationLog recordOperation(UUID batchId, BatchOperationType operationType,
                                             int affectedCount, String details,
                                             String notes, UUID performedBy) {
        AnimalBatch batch = findBatchOrThrow(batchId);

        if (batch.getStatus() == BatchStatus.ARCHIVED) {
            throw new BusinessRuleViolationException("ERR-BAT-011",
                    "Cannot apply operations to ARCHIVED batches");
        }

        BatchOperationLog opLog = BatchOperationLog.of(
                batchId, operationType, performedBy, affectedCount, details, notes);
        logRepo.save(opLog);

        publishEvent("BatchOperationAppliedEvent", batchId, Map.of(
                "batchId", batchId,
                "batchCode", batch.getBatchCode(),
                "operationType", operationType.name(),
                "affectedCount", affectedCount));

        log.info("Batch operation recorded: type={} batch={} affected={}",
                operationType, batch.getBatchCode(), affectedCount);
        return opLog;
    }

    @Transactional
    public void incrementAnimalCount(UUID batchId) {
        AnimalBatch batch = findBatchOrThrow(batchId);
        if (!batch.isOpen()) {
            throw new BusinessRuleViolationException("ERR-BAT-012",
                    "Cannot add animals to a " + batch.getStatus() + " batch");
        }
        batch.incrementAnimalCount();
        batchRepo.save(batch);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AnimalBatch getByCode(String batchCode) {
        return batchRepo.findByBatchCode(batchCode)
                .orElseThrow(() -> new DomainNotFoundException("Batch not found: " + batchCode));
    }

    @Transactional(readOnly = true)
    public AnimalBatch getById(UUID batchId) {
        return findBatchOrThrow(batchId);
    }

    @Transactional(readOnly = true)
    public Page<AnimalBatch> listByPremises(UUID premisesId, String status, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        if (status != null) {
            BatchStatus statusEnum;
            try {
                statusEnum = BatchStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BusinessRuleViolationException("ERR-BAT-020", "Invalid batch status: " + status);
            }
            return batchRepo.findByPremisesIdAndStatus(premisesId, statusEnum, pageable);
        }
        return batchRepo.findByPremisesId(premisesId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<BatchOperationLog> listOperations(UUID batchId, int page, int size) {
        findBatchOrThrow(batchId);
        PageRequest pageable = PageRequest.of(page, size, Sort.by("performedAt").descending());
        return logRepo.findByBatchId(batchId, pageable);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private AnimalBatch findBatchOrThrow(UUID batchId) {
        return batchRepo.findById(batchId)
                .orElseThrow(() -> new DomainNotFoundException("Batch not found: " + batchId));
    }

    private void publishEvent(String type, UUID aggregateId, Map<String, Object> payload) {
        try {
            outbox.publish(type, "AnimalBatch", aggregateId, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.error("Failed to serialize outbox event {}: {}", type, e.getMessage());
        }
    }
}
