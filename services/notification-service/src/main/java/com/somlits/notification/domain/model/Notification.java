package com.somlits.notification.domain.model;

import com.somlits.notification.domain.enums.EventCategory;
import com.somlits.notification.domain.enums.NotificationChannel;
import com.somlits.notification.domain.enums.NotificationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notification")
public class Notification {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "notification_code", nullable = false, unique = true, length = 30, updatable = false)
    private String notificationCode;

    @Column(name = "recipient_id", nullable = false, updatable = false)
    private UUID recipientId;

    @Column(name = "recipient_phone", length = 20)
    private String recipientPhone;

    @Column(name = "recipient_email", length = 150)
    private String recipientEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 20)
    private NotificationChannel channel;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_category", nullable = false, length = 50)
    private EventCategory eventCategory;

    @Column(name = "template_id")
    private UUID templateId;

    @Column(name = "subject", length = 250)
    private String subject;

    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private NotificationStatus status;

    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "retry_count", nullable = false)
    private Integer retryCount = 0;

    @Column(name = "source_aggregate_type", length = 50)
    private String sourceAggregateType;

    @Column(name = "source_aggregate_id")
    private UUID sourceAggregateId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static Notification create(String notificationCode, UUID recipientId, String recipientPhone,
            String recipientEmail, NotificationChannel channel, EventCategory eventCategory,
            UUID templateId, String subject, String body) {
        var n = new Notification();
        n.id = UUID.randomUUID();
        n.notificationCode = notificationCode;
        n.recipientId = recipientId;
        n.recipientPhone = recipientPhone;
        n.recipientEmail = recipientEmail;
        n.channel = channel;
        n.eventCategory = eventCategory;
        n.templateId = templateId;
        n.subject = subject;
        n.body = body;
        n.status = NotificationStatus.PENDING;
        n.retryCount = 0;
        n.createdAt = Instant.now();
        return n;
    }

    public void markSent() {
        this.status = NotificationStatus.SENT;
        this.sentAt = Instant.now();
    }

    public void markFailed(String reason) {
        this.status = NotificationStatus.FAILED;
        this.failureReason = reason;
        this.retryCount++;
    }

    public void markRead() {
        if (this.status != NotificationStatus.READ) {
            this.status = NotificationStatus.READ;
            this.readAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public String getNotificationCode() { return notificationCode; }
    public UUID getRecipientId() { return recipientId; }
    public String getRecipientPhone() { return recipientPhone; }
    public String getRecipientEmail() { return recipientEmail; }
    public NotificationChannel getChannel() { return channel; }
    public EventCategory getEventCategory() { return eventCategory; }
    public UUID getTemplateId() { return templateId; }
    public String getSubject() { return subject; }
    public String getBody() { return body; }
    public NotificationStatus getStatus() { return status; }
    public Instant getScheduledAt() { return scheduledAt; }
    public Instant getSentAt() { return sentAt; }
    public Instant getDeliveredAt() { return deliveredAt; }
    public Instant getReadAt() { return readAt; }
    public String getFailureReason() { return failureReason; }
    public Integer getRetryCount() { return retryCount; }
    public String getSourceAggregateType() { return sourceAggregateType; }
    public UUID getSourceAggregateId() { return sourceAggregateId; }
    public Instant getCreatedAt() { return createdAt; }
    public void setSourceAggregateType(String t) { this.sourceAggregateType = t; }
    public void setSourceAggregateId(UUID id) { this.sourceAggregateId = id; }
    public void setScheduledAt(Instant t) { this.scheduledAt = t; }
}
