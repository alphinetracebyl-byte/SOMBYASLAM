package com.somlits.common.event;

import java.time.Instant;
import java.util.UUID;

public record DomainEvent(
        UUID eventId,
        String eventType,
        String aggregateType,
        UUID aggregateId,
        Instant occurredAt,
        UUID correlationId,
        Object payload
) {
    public static DomainEvent of(String eventType, String aggregateType, UUID aggregateId,
                                  UUID correlationId, Object payload) {
        return new DomainEvent(UUID.randomUUID(), eventType, aggregateType, aggregateId,
                Instant.now(), correlationId, payload);
    }
}
