package com.somlits.abattoir.application.service;

import com.somlits.abattoir.api.v1.dto.request.AnteMortemRequest;
import com.somlits.abattoir.api.v1.dto.request.PostMortemRequest;
import com.somlits.abattoir.api.v1.dto.request.RecordArrivalRequest;
import com.somlits.abattoir.domain.enums.AnteMortemDecision;
import com.somlits.abattoir.domain.enums.PostMortemDecision;
import com.somlits.abattoir.domain.enums.SlaughterSessionStatus;
import com.somlits.abattoir.domain.exception.BusinessRuleViolationException;
import com.somlits.abattoir.domain.exception.DomainConflictException;
import com.somlits.abattoir.domain.exception.DomainNotFoundException;
import com.somlits.abattoir.domain.model.OutboxEvent;
import com.somlits.abattoir.domain.model.SlaughterRecord;
import com.somlits.abattoir.domain.model.SlaughterSession;
import com.somlits.abattoir.domain.repository.OutboxEventRepository;
import com.somlits.abattoir.domain.repository.SlaughterRecordRepository;
import com.somlits.abattoir.domain.repository.SlaughterSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class SlaughterRecordService {

    private static final Logger log = LoggerFactory.getLogger(SlaughterRecordService.class);

    private final SlaughterRecordRepository recordRepository;
    private final SlaughterSessionRepository sessionRepository;
    private final OutboxEventRepository outboxEventRepository;

    public SlaughterRecordService(SlaughterRecordRepository recordRepository,
                                   SlaughterSessionRepository sessionRepository,
                                   OutboxEventRepository outboxEventRepository) {
        this.recordRepository = recordRepository;
        this.sessionRepository = sessionRepository;
        this.outboxEventRepository = outboxEventRepository;
    }

    public SlaughterRecord recordArrival(UUID sessionId, RecordArrivalRequest req, UUID arrivedBy) {
        log.info("Recording arrival for animalId={} in sessionId={}", req.animalId(), sessionId);

        SlaughterSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new DomainNotFoundException("SlaughterSession not found: " + sessionId));

        if (session.getStatus() != SlaughterSessionStatus.OPEN) {
            throw new BusinessRuleViolationException("ERR-AB-200",
                    "Cannot record arrival in a CLOSED session");
        }

        boolean alreadyPresent = recordRepository.existsByAnimalIdAndSessionId(req.animalId(), sessionId);
        if (alreadyPresent) {
            throw new DomainConflictException("ERR-AB-201",
                    "Animal " + req.animalId() + " is already registered in session " + sessionId);
        }

        long seq = recordRepository.countBySessionId(sessionId) + 1;
        String recordCode = "REC-" + session.getSessionCode() + "-" + String.format("%04d", seq);

        SlaughterRecord record = SlaughterRecord.create(
                sessionId,
                recordCode,
                req.animalId(),
                req.animalCode(),
                req.tagSerial(),
                req.ownerCode() != null ? req.ownerCode() : "",
                arrivedBy
        );

        if (req.movementPermitId() != null) {
            record.setMovementPermitId(req.movementPermitId());
        }

        record = recordRepository.save(record);

        session.incrementTotalAnimals();
        sessionRepository.save(session);

        publishEvent("SlaughterRecord", record.getId(), "AnimalArrivedAtAbattoir",
                buildRecordPayload(record), null);

        log.info("Animal arrival recorded: recordCode={} id={}", record.getRecordCode(), record.getId());
        return record;
    }

    public SlaughterRecord verifyTag(UUID recordId, UUID userId) {
        log.info("Verifying tag for recordId={}", recordId);
        SlaughterRecord record = findRecordById(recordId);
        record.verifyTag();
        record = recordRepository.save(record);
        log.info("Tag verified for recordCode={}", record.getRecordCode());
        return record;
    }

    public SlaughterRecord verifyPermit(UUID recordId, UUID userId) {
        log.info("Verifying permit for recordId={}", recordId);
        SlaughterRecord record = findRecordById(recordId);
        record.verifyPermit();
        record = recordRepository.save(record);
        log.info("Permit verified for recordCode={}", record.getRecordCode());
        return record;
    }

    public SlaughterRecord recordAnteMortem(UUID recordId, AnteMortemRequest req, UUID userId) {
        log.info("Recording ante-mortem for recordId={} decision={}", recordId, req.decision());

        SlaughterRecord record = findRecordById(recordId);
        record.recordAnteMortem(req.decision(), userId, req.notes());

        if (req.decision() == AnteMortemDecision.HELD) {
            record.hold(req.holdReason());
        } else if (req.decision() == AnteMortemDecision.REJECTED) {
            record.reject(req.holdReason());
        } else if (req.decision() == AnteMortemDecision.APPROVED) {
            record.approveForSlaughter();
        }

        record = recordRepository.save(record);

        publishEvent("SlaughterRecord", record.getId(), "AnteMortemInspectionCompleted",
                buildRecordPayload(record), null);

        log.info("Ante-mortem recorded: recordCode={} decision={}", record.getRecordCode(), req.decision());
        return record;
    }

    public SlaughterRecord recordSlaughter(UUID recordId, UUID userId) {
        log.info("Recording slaughter for recordId={}", recordId);

        SlaughterRecord record = findRecordById(recordId);
        record.recordSlaughter(userId);
        record = recordRepository.save(record);

        SlaughterSession session = sessionRepository.findById(record.getSessionId())
                .orElseThrow(() -> new DomainNotFoundException("SlaughterSession not found: " + record.getSessionId()));
        session.incrementSlaughteredCount();
        sessionRepository.save(session);

        publishEvent("SlaughterRecord", record.getId(), "AnimalSlaughtered",
                buildRecordPayload(record), null);

        log.info("Slaughter recorded: recordCode={}", record.getRecordCode());
        return record;
    }

    public SlaughterRecord recordPostMortem(UUID recordId, PostMortemRequest req, UUID userId) {
        log.info("Recording post-mortem for recordId={} decision={}", recordId, req.decision());

        SlaughterRecord record = findRecordById(recordId);
        record.recordPostMortem(req.decision(), userId, req.notes());

        if (req.decision() == PostMortemDecision.TOTALLY_CONDEMNED
                || req.decision() == PostMortemDecision.PARTIALLY_CONDEMNED) {
            record.condemn(req.condemnationReason());

            SlaughterSession session = sessionRepository.findById(record.getSessionId())
                    .orElseThrow(() -> new DomainNotFoundException(
                            "SlaughterSession not found: " + record.getSessionId()));
            session.incrementCondemnedCount();
            sessionRepository.save(session);
        }

        record = recordRepository.save(record);

        publishEvent("SlaughterRecord", record.getId(), "PostMortemInspectionCompleted",
                buildRecordPayload(record), null);

        log.info("Post-mortem recorded: recordCode={} decision={}", record.getRecordCode(), req.decision());
        return record;
    }

    public SlaughterRecord emergencySlaughter(UUID recordId, String reason, UUID userId) {
        log.info("Emergency slaughter for recordId={}", recordId);

        SlaughterRecord record = findRecordById(recordId);
        record.emergencySlaughter(reason);
        record = recordRepository.save(record);

        SlaughterSession session = sessionRepository.findById(record.getSessionId())
                .orElseThrow(() -> new DomainNotFoundException(
                        "SlaughterSession not found: " + record.getSessionId()));
        session.incrementSlaughteredCount();
        sessionRepository.save(session);

        publishEvent("SlaughterRecord", record.getId(), "EmergencySlaughterPerformed",
                buildRecordPayload(record), null);

        log.info("Emergency slaughter recorded: recordCode={}", record.getRecordCode());
        return record;
    }

    @Transactional(readOnly = true)
    public SlaughterRecord getByCode(String code) {
        return recordRepository.findByRecordCode(code)
                .orElseThrow(() -> new DomainNotFoundException("SlaughterRecord with code " + code + " not found"));
    }

    @Transactional(readOnly = true)
    public SlaughterRecord getById(UUID id) {
        return findRecordById(id);
    }

    @Transactional(readOnly = true)
    public Page<SlaughterRecord> getBySession(UUID sessionId, Pageable pageable) {
        return recordRepository.findBySessionId(sessionId, pageable);
    }

    @Transactional(readOnly = true)
    public List<SlaughterRecord> getByAnimal(UUID animalId) {
        return recordRepository.findByAnimalId(animalId);
    }

    private SlaughterRecord findRecordById(UUID id) {
        return recordRepository.findById(id)
                .orElseThrow(() -> new DomainNotFoundException("SlaughterRecord not found: " + id));
    }

    private void publishEvent(String aggregateType, UUID aggregateId, String eventType,
                               String payload, UUID correlationId) {
        OutboxEvent event = OutboxEvent.of(eventType, aggregateType, aggregateId, payload, correlationId);
        outboxEventRepository.save(event);
    }

    private String buildRecordPayload(SlaughterRecord r) {
        return String.format(
                "{\"recordId\":\"%s\",\"recordCode\":\"%s\",\"sessionId\":\"%s\","
                        + "\"animalId\":\"%s\",\"animalCode\":\"%s\",\"status\":\"%s\"}",
                r.getId(), r.getRecordCode(), r.getSessionId(),
                r.getAnimalId(), r.getAnimalCode(), r.getStatus());
    }
}
