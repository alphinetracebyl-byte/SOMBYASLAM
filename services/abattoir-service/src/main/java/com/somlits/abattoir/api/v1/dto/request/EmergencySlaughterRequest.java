package com.somlits.abattoir.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;

public record EmergencySlaughterRequest(
        @NotBlank(message = "reason is required")
        String reason
) {}
