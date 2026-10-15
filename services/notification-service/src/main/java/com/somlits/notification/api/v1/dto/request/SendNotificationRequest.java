package com.somlits.notification.api.v1.dto.request;

import com.somlits.notification.domain.enums.EventCategory;
import com.somlits.notification.domain.enums.NotificationChannel;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SendNotificationRequest(
        @NotNull UUID recipientId,
        String recipientPhone,
        String recipientEmail,
        @NotNull NotificationChannel channel,
        @NotNull EventCategory eventCategory,
        String templateCode,
        String subject,
        String body
) {}
