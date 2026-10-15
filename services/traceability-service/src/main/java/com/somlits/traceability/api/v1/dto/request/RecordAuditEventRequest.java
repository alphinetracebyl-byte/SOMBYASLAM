package com.somlits.traceability.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record RecordAuditEventRequest(

        UUID correlationId,

        @NotBlank
        String serviceSource,

        @NotBlank
        String eventType,

        @NotBlank
        String aggregateType,

        @NotNull
        UUID aggregateId,

        String aggregateCode,

        UUID performedBy,

        @NotBlank
        String payload,

        String ipAddress,

        String userAgent
) {}
