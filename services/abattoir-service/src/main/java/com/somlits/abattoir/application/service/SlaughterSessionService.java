package com.somlits.abattoir.application.service;

import com.somlits.abattoir.api.v1.dto.request.OpenSessionRequest;
import com.somlits.abattoir.domain.enums.SlaughterSessionStatus;
import com.somlits.abattoir.domain.exception.DomainConflictException;
import com.somlits.abattoir.domain.exception.DomainNotFoundException;
import com.somlits.abattoir.domain.model.OutboxEvent;
import com.somlits.abattoir.domain.model.SlaughterSession;
import com.somlits.abattoir.domain.repository.OutboxEventRepository;
import com.somlits.abattoir.domain.repository.SlaughterSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Service
@Transactional
public class SlaughterSessionService {

    private static final Logger log = LoggerFactory.getLogger(SlaughterSessionService.class);

    private final SlaughterSessionRepository sessionRepository;
    private final OutboxEventRepository outboxEventRepository;

    public SlaughterSessionService(SlaughterSessionRepository sessionRepository,
                                   OutboxEventRepository outboxEventRepository) {
        this.sessionRepository = sessionRepository;
        this.outboxEventRepository = outboxEventRepository;
    }

    public SlaughterSession openSession(OpenSessionRequest req, UUID openedBy) {
        log.info("Opening slaughter session for premises={} date={}", req.abattoirPremisesId(), req.sessionDate());

        boolean openSessionExists = sessionRepository.existsByAbattoirPremisesIdAndSessionDateAndStatus(
                req.abattoirPremisesId(), req.sessionDate(), SlaughterSessionStatus.OPEN);
        if (openSessionExists) {
            throw new DomainConflictException("ERR-AB-100",
                    "An OPEN slaughter session already exists for premises " + req.abattoirPremisesId()
                            + " on date " + req.sessionDate());
        }

        String sessionCode = generateSessionCode(req.abattoirPremisesId());

        SlaughterSession session = SlaughterSession.create(
                sessionCode,
                req.abattoirPremisesId(),
                req.abattoirPremisesCode(),
                req.sessionDate(),
                req.supervisingVetId(),
                openedBy
        );

        session = sessionRepository.save(session);

        publishEvent("SlaughterSession", session.getId(), "SlaughterSessionOpened",
                buildSessionPayload(session), null);

        log.info("Slaughter session opened: sessionCode={} id={}", session.getSessionCode(), session.getId());
        return session;
    }

    public SlaughterSession closeSession(UUID sessionId, UUID closedBy) {
        log.info("Closing slaughter session id={}", sessionId);

        SlaughterSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new DomainNotFoundException("SlaughterSession not found: " + sessionId));

        session.close(closedBy);
        session = sessionRepository.save(session);

        publishEvent("SlaughterSession", session.getId(), "SlaughterSessionClosed",
                buildSessionPayload(session), null);

        log.info("Slaughter session closed: sessionCode={} id={}", session.getSessionCode(), session.getId());
        return session;
    }

    @Transactional(readOnly = true)
    public Page<SlaughterSession> search(UUID premisesId, SlaughterSessionStatus status,
                                         LocalDate date, Pageable pageable) {
        if (premisesId != null) {
            return sessionRepository.findByAbattoirPremisesId(premisesId, pageable);
        }
        if (status != null) {
            return sessionRepository.findByStatus(status, pageable);
        }
        if (date != null) {
            return sessionRepository.findBySessionDate(date, pageable);
        }
        return sessionRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public SlaughterSession getByCode(String code) {
        return sessionRepository.findBySessionCode(code)
                .orElseThrow(() -> new DomainNotFoundException("SlaughterSession with code " + code + " not found"));
    }

    @Transactional(readOnly = true)
    public SlaughterSession getById(UUID id) {
        return sessionRepository.findById(id)
                .orElseThrow(() -> new DomainNotFoundException("SlaughterSession not found: " + id));
    }

    private String generateSessionCode(UUID premisesId) {
        long count = sessionRepository.countByAbattoirPremisesId(premisesId);
        int year = LocalDate.now().getYear();
        return String.format("SES-%d-%06d", year, count + 1);
    }

    private void publishEvent(String aggregateType, UUID aggregateId, String eventType,
                               String payload, UUID correlationId) {
        OutboxEvent event = OutboxEvent.of(eventType, aggregateType, aggregateId, payload, correlationId);
        outboxEventRepository.save(event);
    }

    private String buildSessionPayload(SlaughterSession s) {
        return String.format(
                "{\"sessionId\":\"%s\",\"sessionCode\":\"%s\",\"abattoirPremisesId\":\"%s\","
                        + "\"sessionDate\":\"%s\",\"status\":\"%s\"}",
                s.getId(), s.getSessionCode(), s.getAbattoirPremisesId(),
                s.getSessionDate(), s.getStatus());
    }
}
