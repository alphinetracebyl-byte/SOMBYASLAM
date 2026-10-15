package com.somlits.notification.api.v1.dto.request;

import com.somlits.notification.domain.enums.EventCategory;
import com.somlits.notification.domain.enums.NotificationChannel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateTemplateRequest(
        @NotBlank String templateCode,
        @NotNull EventCategory eventCategory,
        @NotNull NotificationChannel channel,
        String language,
        String subject,
        @NotBlank String bodyTemplate
) {}
