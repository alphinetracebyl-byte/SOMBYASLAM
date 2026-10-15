package com.somlits.traceability.application.service;

import com.somlits.traceability.api.v1.dto.request.RecordAuditEventRequest;
import com.somlits.traceability.api.v1.dto.response.AuditEventResponse;
import com.somlits.traceability.domain.exception.DomainNotFoundException;
import com.somlits.traceability.domain.model.AuditEvent;
import com.somlits.traceability.domain.repository.AuditEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditEventRepository auditEventRepository;

    public AuditService(AuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    public AuditEventResponse saveAuditEvent(RecordAuditEventRequest cmd) {
        String eventCode = generateEventCode(cmd.serviceSource(), cmd.eventType());

        AuditEvent event = AuditEvent.create(
                eventCode,
                cmd.correlationId(),
                cmd.serviceSource(),
                cmd.eventType(),
                cmd.aggregateType(),
                cmd.aggregateId(),
                cmd.aggregateCode(),
                cmd.performedBy(),
                Instant.now(),
                cmd.payload(),
                cmd.ipAddress(),
                cmd.userAgent()
        );

        AuditEvent saved = auditEventRepository.save(event);
        log.info("Saved audit event code={} type={} aggregate={}/{}",
                saved.getEventCode(), saved.getEventType(),
                saved.getAggregateType(), saved.getAggregateId());
        return AuditEventResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public AuditEventResponse getEventById(UUID auditId) {
        return auditEventRepository.findById(auditId)
                .map(AuditEventResponse::from)
                .orElseThrow(() -> new DomainNotFoundException("AuditEvent", auditId));
    }

    @Transactional(readOnly = true)
    public Page<AuditEventResponse> searchEvents(String eventType, String aggregateType,
                                                  UUID performedBy, Pageable pageable) {
        if (eventType != null) {
            return auditEventRepository.findByEventType(eventType, pageable)
                    .map(AuditEventResponse::from);
        }
        if (aggregateType != null) {
            return auditEventRepository.findByAggregateType(aggregateType, pageable)
                    .map(AuditEventResponse::from);
        }
        if (performedBy != null) {
            return auditEventRepository.findByPerformedBy(performedBy, pageable)
                    .map(AuditEventResponse::from);
        }
        return auditEventRepository.findAll(pageable)
                .map(AuditEventResponse::from);
    }

    @Transactional(readOnly = true)
    public List<AuditEventResponse> getEventsByAggregateId(UUID aggregateId) {
        return auditEventRepository.findByAggregateId(aggregateId)
                .stream()
                .map(AuditEventResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AuditEventResponse> getEventsByCorrelation(UUID correlationId) {
        return auditEventRepository.findByCorrelationId(correlationId)
                .stream()
                .map(AuditEventResponse::from)
                .toList();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private String generateEventCode(String serviceSource, String eventType) {
        // Format: SVC-TYPE-<timestamp-millis-hex>
        String svcPart = serviceSource != null && !serviceSource.isBlank()
                ? serviceSource.replaceAll("[^A-Z0-9]", "").toUpperCase()
                : "SVC";
        String typePart = eventType != null && !eventType.isBlank()
                ? eventType.replaceAll("[^A-Z0-9_]", "").toUpperCase()
                : "EVT";
        String timePart = Long.toHexString(System.currentTimeMillis()).toUpperCase();
        String raw = svcPart + "-" + typePart + "-" + timePart;
        // Trim to max 30 chars
        return raw.length() <= 30 ? raw : raw.substring(0, 30);
    }
}
