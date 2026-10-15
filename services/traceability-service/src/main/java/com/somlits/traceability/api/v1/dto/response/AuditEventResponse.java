package com.somlits.traceability.api.v1.dto.response;

import com.somlits.traceability.domain.model.AuditEvent;

import java.time.Instant;
import java.util.UUID;

public record AuditEventResponse(
        UUID id,
        String eventCode,
        UUID correlationId,
        String serviceSource,
        String eventType,
        String aggregateType,
        UUID aggregateId,
        String aggregateCode,
        UUID performedBy,
        Instant performedAt,
        String payload,
        String ipAddress,
        String userAgent
) {
    public static AuditEventResponse from(AuditEvent event) {
        return new AuditEventResponse(
                event.getId(),
                event.getEventCode(),
                event.getCorrelationId(),
                event.getServiceSource(),
                event.getEventType(),
                event.getAggregateType(),
                event.getAggregateId(),
                event.getAggregateCode(),
                event.getPerformedBy(),
                event.getPerformedAt(),
                event.getPayload(),
                event.getIpAddress(),
                event.getUserAgent()
        );
    }
}
