package com.somlits.identityaccess.domain.model;

import com.somlits.identityaccess.domain.enums.LoginEventType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "login_event")
public class LoginEvent {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 30)
    private LoginEventType eventType;

    @Column(name = "failure_reason", length = 100)
    private String failureReason;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "device_type", length = 50)
    private String deviceType;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    public static LoginEvent of(UUID userId, LoginEventType eventType, String ipAddress) {
        var event = new LoginEvent();
        event.id = UUID.randomUUID();
        event.userId = userId;
        event.eventType = eventType;
        event.ipAddress = ipAddress;
        event.occurredAt = Instant.now();
        return event;
    }

    public static LoginEvent failure(UUID userId, String reason, String ipAddress) {
        var event = of(userId, LoginEventType.LOGIN_FAILED, ipAddress);
        event.failureReason = reason;
        return event;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public LoginEventType getEventType() { return eventType; }
    public String getFailureReason() { return failureReason; }
    public String getIpAddress() { return ipAddress; }
    public String getDeviceType() { return deviceType; }
    public void setDeviceType(String deviceType) { this.deviceType = deviceType; }
    public Instant getOccurredAt() { return occurredAt; }
}
