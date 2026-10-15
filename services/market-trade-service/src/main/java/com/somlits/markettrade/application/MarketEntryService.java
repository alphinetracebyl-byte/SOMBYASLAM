package com.somlits.markettrade.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.markettrade.api.v1.dto.request.RegisterMarketEntryRequest;
import com.somlits.markettrade.api.v1.dto.request.VetInspectionRequest;
import com.somlits.markettrade.domain.enums.MarketSessionStatus;
import com.somlits.markettrade.domain.exception.BusinessRuleViolationException;
import com.somlits.markettrade.domain.exception.DomainConflictException;
import com.somlits.markettrade.domain.exception.DomainNotFoundException;
import com.somlits.markettrade.domain.model.MarketEntry;
import com.somlits.markettrade.domain.model.MarketSession;
import com.somlits.markettrade.domain.repository.MarketEntryRepository;
import com.somlits.markettrade.domain.repository.MarketSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
public class MarketEntryService {

    private static final Logger log = LoggerFactory.getLogger(MarketEntryService.class);

    private final MarketEntryRepository entryRepo;
    private final MarketSessionRepository sessionRepo;
    private final CodeGenerator codeGenerator;
    private final OutboxService outbox;
    private final ObjectMapper objectMapper;

    public MarketEntryService(MarketEntryRepository entryRepo,
                               MarketSessionRepository sessionRepo,
                               CodeGenerator codeGenerator,
                               OutboxService outbox,
                               ObjectMapper objectMapper) {
        this.entryRepo = entryRepo;
        this.sessionRepo = sessionRepo;
        this.codeGenerator = codeGenerator;
        this.outbox = outbox;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public MarketEntry registerEntry(UUID sessionId, RegisterMarketEntryRequest req, UUID enteredBy) {
        MarketSession session = requireSession(sessionId);
        if (session.getStatus() != MarketSessionStatus.OPEN) {
            throw new BusinessRuleViolationException("ERR-MKT-020",
                    "Market session must be OPEN to register entries. Current: " + session.getStatus());
        }
        entryRepo.findByAnimalIdAndSessionId(req.getAnimalId(), sessionId).ifPresent(existing -> {
            throw new DomainConflictException("ERR-MKT-021",
                    "Animal " + req.getAnimalCode() + " is already registered in this session");
        });

        String entryCode = codeGenerator.nextEntryCode();
        MarketEntry entry = MarketEntry.create(
                entryCode, sessionId,
                req.getAnimalId(), req.getAnimalCode(),
                req.getOwnerId(), req.getOwnerCode(),
                req.getMovementId(), req.getHoldingPen(),
                enteredBy);
        entryRepo.save(entry);

        publishEvent("MarketEntryRegisteredEvent", "MarketEntry", entry.getId(), Map.of(
                "entryCode", entryCode,
                "sessionId", sessionId.toString(),
                "animalId", req.getAnimalId().toString(),
                "animalCode", req.getAnimalCode(),
                "ownerId", req.getOwnerId().toString(),
                "ownerCode", req.getOwnerCode()
        ));
        log.info("Market entry registered: code={} sessionId={}", entryCode, sessionId);
        return entry;
    }

    @Transactional
    public MarketEntry performVetInspection(UUID entryId, VetInspectionRequest req, UUID inspectedBy) {
        MarketEntry entry = requireEntry(entryId);
        entry.vetInspect(req.getInspectionStatus(), inspectedBy, req.getNotes());
        entryRepo.save(entry);

        publishEvent("MarketEntryVetInspectedEvent", "MarketEntry", entry.getId(), Map.of(
                "entryId", entryId.toString(),
                "entryCode", entry.getEntryCode(),
                "animalId", entry.getAnimalId().toString(),
                "inspectionStatus", req.getInspectionStatus().name(),
                "inspectedBy", inspectedBy.toString()
        ));
        log.info("Vet inspection recorded: entryId={} status={}", entryId, req.getInspectionStatus());
        return entry;
    }

    @Transactional
    public MarketEntry withdraw(UUID entryId, UUID withdrawnBy) {
        MarketEntry entry = requireEntry(entryId);
        entry.withdraw();
        entryRepo.save(entry);

        publishEvent("MarketEntryWithdrawnEvent", "MarketEntry", entry.getId(), Map.of(
                "entryId", entryId.toString(),
                "entryCode", entry.getEntryCode(),
                "animalId", entry.getAnimalId().toString(),
                "withdrawnBy", withdrawnBy.toString()
        ));
        log.info("Market entry withdrawn: entryId={}", entryId);
        return entry;
    }

    @Transactional(readOnly = true)
    public Page<MarketEntry> listBySession(UUID sessionId, Pageable pageable) {
        requireSession(sessionId);
        return entryRepo.findBySessionId(sessionId, pageable);
    }

    @Transactional(readOnly = true)
    public MarketEntry getById(UUID id) {
        return requireEntry(id);
    }

    private MarketSession requireSession(UUID sessionId) {
        return sessionRepo.findById(sessionId)
                .orElseThrow(() -> new DomainNotFoundException("MarketSession not found: " + sessionId));
    }

    private MarketEntry requireEntry(UUID entryId) {
        return entryRepo.findById(entryId)
                .orElseThrow(() -> new DomainNotFoundException("MarketEntry not found: " + entryId));
    }

    private void publishEvent(String type, String aggregateType, UUID aggId, Map<String, Object> payload) {
        try {
            outbox.publish(type, aggregateType, aggId, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.error("Failed to serialize outbox event {}: {}", type, e.getMessage());
        }
    }
}
