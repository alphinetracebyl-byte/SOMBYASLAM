package com.somlits.markettrade.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.markettrade.api.v1.dto.request.CreateMarketSessionRequest;
import com.somlits.markettrade.domain.enums.MarketSessionStatus;
import com.somlits.markettrade.domain.exception.DomainNotFoundException;
import com.somlits.markettrade.domain.model.MarketSession;
import com.somlits.markettrade.domain.repository.MarketSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Service
public class MarketSessionService {

    private static final Logger log = LoggerFactory.getLogger(MarketSessionService.class);

    private final MarketSessionRepository sessionRepo;
    private final CodeGenerator codeGenerator;
    private final OutboxService outbox;
    private final ObjectMapper objectMapper;

    public MarketSessionService(MarketSessionRepository sessionRepo, CodeGenerator codeGenerator,
                                 OutboxService outbox, ObjectMapper objectMapper) {
        this.sessionRepo = sessionRepo;
        this.codeGenerator = codeGenerator;
        this.outbox = outbox;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public MarketSession createSession(CreateMarketSessionRequest req, UUID callerId) {
        String code = codeGenerator.nextSessionCode();
        MarketSession session = MarketSession.create(
                code, req.getMarketPremisesId(), req.getMarketPremisesCode(),
                req.getSessionDate(), req.getSupervisingVetId(), req.getNotes(), callerId);
        sessionRepo.save(session);
        publishEvent("MarketSessionCreatedEvent", session.getId(), Map.of(
                "sessionCode", code,
                "marketPremisesId", req.getMarketPremisesId(),
                "sessionDate", req.getSessionDate().toString()
        ));
        log.info("Market session created: code={}", code);
        return session;
    }

    @Transactional
    public MarketSession openSession(UUID sessionId, UUID callerId) {
        MarketSession session = requireSession(sessionId);
        session.open(callerId);
        sessionRepo.save(session);
        publishEvent("MarketSessionOpenedEvent", session.getId(), Map.of(
                "sessionCode", session.getSessionCode(),
                "openedBy", callerId.toString()
        ));
        log.info("Market session opened: code={}", session.getSessionCode());
        return session;
    }

    @Transactional
    public MarketSession closeSession(UUID sessionId, UUID callerId) {
        MarketSession session = requireSession(sessionId);
        session.close(callerId);
        sessionRepo.save(session);
        publishEvent("MarketSessionClosedEvent", session.getId(), Map.of(
                "sessionCode", session.getSessionCode(),
                "closedBy", callerId.toString()
        ));
        log.info("Market session closed: code={}", session.getSessionCode());
        return session;
    }

    @Transactional
    public MarketSession cancelSession(UUID sessionId, UUID callerId) {
        MarketSession session = requireSession(sessionId);
        session.cancel();
        sessionRepo.save(session);
        publishEvent("MarketSessionCancelledEvent", session.getId(), Map.of(
                "sessionCode", session.getSessionCode(),
                "cancelledBy", callerId.toString()
        ));
        log.info("Market session cancelled: code={}", session.getSessionCode());
        return session;
    }

    @Transactional(readOnly = true)
    public MarketSession getSession(UUID sessionId) {
        return requireSession(sessionId);
    }

    @Transactional(readOnly = true)
    public Page<MarketSession> listSessions(UUID premisesId, String status, LocalDate sessionDate, Pageable pageable) {
        if (premisesId != null && status != null) {
            return sessionRepo.findByMarketPremisesIdAndStatus(
                    premisesId, MarketSessionStatus.valueOf(status.toUpperCase()), pageable);
        }
        if (premisesId != null) {
            return sessionRepo.findByMarketPremisesId(premisesId, pageable);
        }
        if (status != null) {
            return sessionRepo.findByStatus(MarketSessionStatus.valueOf(status.toUpperCase()), pageable);
        }
        if (sessionDate != null) {
            return sessionRepo.findBySessionDate(sessionDate, pageable);
        }
        return sessionRepo.findAll(pageable);
    }

    private MarketSession requireSession(UUID sessionId) {
        return sessionRepo.findById(sessionId)
                .orElseThrow(() -> new DomainNotFoundException("MarketSession not found: " + sessionId));
    }

    private void publishEvent(String type, UUID aggId, Map<String, Object> payload) {
        try {
            outbox.publish(type, "MarketSession", aggId, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.error("Failed to serialize outbox event {}: {}", type, e.getMessage());
        }
    }
}
