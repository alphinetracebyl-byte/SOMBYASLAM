package com.somlits.notification.api.v1.dto.response;

import com.somlits.notification.domain.enums.EventCategory;
import com.somlits.notification.domain.enums.NotificationChannel;
import com.somlits.notification.domain.enums.NotificationStatus;
import com.somlits.notification.domain.model.Notification;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        String notificationCode,
        UUID recipientId,
        String recipientPhone,
        String recipientEmail,
        NotificationChannel channel,
        EventCategory eventCategory,
        UUID templateId,
        String subject,
        String body,
        NotificationStatus status,
        Instant scheduledAt,
        Instant sentAt,
        Instant deliveredAt,
        Instant readAt,
        String failureReason,
        Integer retryCount,
        String sourceAggregateType,
        UUID sourceAggregateId,
        Instant createdAt
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getNotificationCode(),
                n.getRecipientId(),
                n.getRecipientPhone(),
                n.getRecipientEmail(),
                n.getChannel(),
                n.getEventCategory(),
                n.getTemplateId(),
                n.getSubject(),
                n.getBody(),
                n.getStatus(),
                n.getScheduledAt(),
                n.getSentAt(),
                n.getDeliveredAt(),
                n.getReadAt(),
                n.getFailureReason(),
                n.getRetryCount(),
                n.getSourceAggregateType(),
                n.getSourceAggregateId(),
                n.getCreatedAt()
        );
    }
}
