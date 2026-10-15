package com.somlits.traceability.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_event")
public class AuditEvent {

    @Id
    private UUID id;

    @Column(name = "event_code", nullable = false, unique = true, updatable = false, length = 30)
    private String eventCode;

    @Column(name = "correlation_id")
    private UUID correlationId;

    @Column(name = "service_source", nullable = false, updatable = false, length = 50)
    private String serviceSource;

    @Column(name = "event_type", nullable = false, updatable = false, length = 100)
    private String eventType;

    @Column(name = "aggregate_type", nullable = false, updatable = false, length = 50)
    private String aggregateType;

    @Column(name = "aggregate_id", nullable = false, updatable = false)
    private UUID aggregateId;

    @Column(name = "aggregate_code", updatable = false, length = 50)
    private String aggregateCode;

    @Column(name = "performed_by", updatable = false)
    private UUID performedBy;

    @Column(name = "performed_at", nullable = false, updatable = false)
    private Instant performedAt;

    @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
    private String payload;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 200)
    private String userAgent;

    protected AuditEvent() {}

    public static AuditEvent create(String eventCode, UUID correlationId, String serviceSource,
                                    String eventType, String aggregateType, UUID aggregateId,
                                    String aggregateCode, UUID performedBy, Instant performedAt,
                                    String payload, String ipAddress, String userAgent) {
        AuditEvent e = new AuditEvent();
        e.id = UUID.randomUUID();
        e.eventCode = eventCode;
        e.correlationId = correlationId;
        e.serviceSource = serviceSource;
        e.eventType = eventType;
        e.aggregateType = aggregateType;
        e.aggregateId = aggregateId;
        e.aggregateCode = aggregateCode;
        e.performedBy = performedBy;
        e.performedAt = performedAt;
        e.payload = payload;
        e.ipAddress = ipAddress;
        e.userAgent = userAgent;
        return e;
    }

    public UUID getId() { return id; }
    public String getEventCode() { return eventCode; }
    public UUID getCorrelationId() { return correlationId; }
    public String getServiceSource() { return serviceSource; }
    public String getEventType() { return eventType; }
    public String getAggregateType() { return aggregateType; }
    public UUID getAggregateId() { return aggregateId; }
    public String getAggregateCode() { return aggregateCode; }
    public UUID getPerformedBy() { return performedBy; }
    public Instant getPerformedAt() { return performedAt; }
    public String getPayload() { return payload; }
    public String getIpAddress() { return ipAddress; }
    public String getUserAgent() { return userAgent; }
}
