package com.somlits.notification.domain.model;

import com.somlits.notification.domain.enums.EventCategory;
import com.somlits.notification.domain.enums.NotificationChannel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notification_template")
public class NotificationTemplate {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "template_code", nullable = false, unique = true, length = 100)
    private String templateCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_category", nullable = false, length = 50)
    private EventCategory eventCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 20)
    private NotificationChannel channel;

    @Column(name = "language", nullable = false, length = 10)
    private String language = "en";

    @Column(name = "subject", length = 250)
    private String subject;

    @Column(name = "body_template", nullable = false, columnDefinition = "TEXT")
    private String bodyTemplate;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static NotificationTemplate create(String templateCode, EventCategory eventCategory,
                                               NotificationChannel channel, String language,
                                               String subject, String bodyTemplate, UUID createdBy) {
        var t = new NotificationTemplate();
        t.id = UUID.randomUUID();
        t.templateCode = templateCode;
        t.eventCategory = eventCategory;
        t.channel = channel;
        t.language = language != null ? language : "en";
        t.subject = subject;
        t.bodyTemplate = bodyTemplate;
        t.isActive = true;
        t.createdBy = createdBy;
        t.createdAt = Instant.now();
        return t;
    }

    public UUID getId() { return id; }
    public String getTemplateCode() { return templateCode; }
    public EventCategory getEventCategory() { return eventCategory; }
    public NotificationChannel getChannel() { return channel; }
    public String getLanguage() { return language; }
    public String getSubject() { return subject; }
    public String getBodyTemplate() { return bodyTemplate; }
    public Boolean getIsActive() { return isActive; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }

    public void deactivate() { this.isActive = false; }
    public void activate() { this.isActive = true; }
}
