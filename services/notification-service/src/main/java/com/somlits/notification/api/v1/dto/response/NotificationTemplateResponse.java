package com.somlits.notification.api.v1.dto.response;

import com.somlits.notification.domain.enums.EventCategory;
import com.somlits.notification.domain.enums.NotificationChannel;
import com.somlits.notification.domain.model.NotificationTemplate;

import java.time.Instant;
import java.util.UUID;

public record NotificationTemplateResponse(
        UUID id,
        String templateCode,
        EventCategory eventCategory,
        NotificationChannel channel,
        String language,
        String subject,
        String bodyTemplate,
        Boolean isActive,
        UUID createdBy,
        Instant createdAt
) {
    public static NotificationTemplateResponse from(NotificationTemplate t) {
        return new NotificationTemplateResponse(
                t.getId(),
                t.getTemplateCode(),
                t.getEventCategory(),
                t.getChannel(),
                t.getLanguage(),
                t.getSubject(),
                t.getBodyTemplate(),
                t.getIsActive(),
                t.getCreatedBy(),
                t.getCreatedAt()
        );
    }
}
