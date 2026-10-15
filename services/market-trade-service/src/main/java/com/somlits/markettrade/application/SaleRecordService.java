package com.somlits.markettrade.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.markettrade.api.v1.dto.request.RecordSaleRequest;
import com.somlits.markettrade.domain.enums.MarketSessionStatus;
import com.somlits.markettrade.domain.exception.BusinessRuleViolationException;
import com.somlits.markettrade.domain.exception.DomainNotFoundException;
import com.somlits.markettrade.domain.model.MarketEntry;
import com.somlits.markettrade.domain.model.MarketSession;
import com.somlits.markettrade.domain.model.SaleRecord;
import com.somlits.markettrade.domain.repository.MarketEntryRepository;
import com.somlits.markettrade.domain.repository.MarketSessionRepository;
import com.somlits.markettrade.domain.repository.SaleRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
public class SaleRecordService {

    private static final Logger log = LoggerFactory.getLogger(SaleRecordService.class);

    private final SaleRecordRepository saleRepo;
    private final MarketEntryRepository entryRepo;
    private final MarketSessionRepository sessionRepo;
    private final CodeGenerator codeGenerator;
    private final OutboxService outbox;
    private final ObjectMapper objectMapper;

    public SaleRecordService(SaleRecordRepository saleRepo,
                             MarketEntryRepository entryRepo,
                             MarketSessionRepository sessionRepo,
                             CodeGenerator codeGenerator,
                             OutboxService outbox,
                             ObjectMapper objectMapper) {
        this.saleRepo = saleRepo;
        this.entryRepo = entryRepo;
        this.sessionRepo = sessionRepo;
        this.codeGenerator = codeGenerator;
        this.outbox = outbox;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SaleRecord recordSale(UUID sessionId, RecordSaleRequest req, UUID confirmedBy) {
        MarketSession session = requireSession(sessionId);
        if (session.getStatus() != MarketSessionStatus.OPEN) {
            throw new BusinessRuleViolationException("ERR-MKT-030",
                    "Market session must be OPEN to record sales. Current: " + session.getStatus());
        }

        MarketEntry entry = entryRepo.findById(req.getMarketEntryId())
                .orElseThrow(() -> new DomainNotFoundException("MarketEntry not found: " + req.getMarketEntryId()));

        if (!entry.getSessionId().equals(sessionId)) {
            throw new BusinessRuleViolationException("ERR-MKT-031",
                    "Market entry does not belong to session " + sessionId);
        }

        entry.markSold();
        entryRepo.save(entry);

        String saleCode = codeGenerator.nextSaleCode();
        SaleRecord sale = SaleRecord.create(
                saleCode, sessionId, entry.getId(),
                entry.getAnimalId(), entry.getAnimalCode(),
                entry.getOwnerId(), entry.getOwnerCode(),
                req.getBuyerOwnerId(), req.getBuyerOwnerCode(),
                req.getSalePrice(), req.getCurrency(), req.getPaymentReference(),
                confirmedBy);
        saleRepo.save(sale);

        publishEvent("AnimalSoldEvent", "SaleRecord", sale.getId(), Map.of(
                "saleCode", saleCode,
                "sessionId", sessionId.toString(),
                "animalId", entry.getAnimalId().toString(),
                "animalCode", entry.getAnimalCode(),
                "sellerOwnerCode", entry.getOwnerCode(),
                "buyerOwnerCode", req.getBuyerOwnerCode(),
                "salePrice", req.getSalePrice() != null ? req.getSalePrice().toString() : "0"
        ));
        log.info("Sale recorded: code={} animal={}", saleCode, entry.getAnimalCode());
        return sale;
    }

    @Transactional
    public SaleRecord markTransferred(UUID saleId) {
        SaleRecord sale = requireSale(saleId);
        sale.markTransferred();
        saleRepo.save(sale);

        publishEvent("OwnershipTransferredEvent", "SaleRecord", sale.getId(), Map.of(
                "saleCode", sale.getSaleCode(),
                "animalId", sale.getAnimalId().toString(),
                "animalCode", sale.getAnimalCode(),
                "newOwnerCode", sale.getBuyerOwnerCode()
        ));
        log.info("Ownership transferred: saleCode={}", sale.getSaleCode());
        return sale;
    }

    @Transactional(readOnly = true)
    public Page<SaleRecord> listBySession(UUID sessionId, Pageable pageable) {
        requireSession(sessionId);
        return saleRepo.findBySessionId(sessionId, pageable);
    }

    @Transactional(readOnly = true)
    public SaleRecord getById(UUID id) {
        return requireSale(id);
    }

    private MarketSession requireSession(UUID sessionId) {
        return sessionRepo.findById(sessionId)
                .orElseThrow(() -> new DomainNotFoundException("MarketSession not found: " + sessionId));
    }

    private SaleRecord requireSale(UUID saleId) {
        return saleRepo.findById(saleId)
                .orElseThrow(() -> new DomainNotFoundException("SaleRecord not found: " + saleId));
    }

    private void publishEvent(String type, String aggregateType, UUID aggId, Map<String, Object> payload) {
        try {
            outbox.publish(type, aggregateType, aggId, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.error("Failed to serialize outbox event {}: {}", type, e.getMessage());
        }
    }
}
