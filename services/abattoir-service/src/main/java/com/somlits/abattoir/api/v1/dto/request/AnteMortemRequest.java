package com.somlits.abattoir.api.v1.dto.request;

import com.somlits.abattoir.domain.enums.AnteMortemDecision;
import jakarta.validation.constraints.NotNull;

public record AnteMortemRequest(
        @NotNull(message = "decision is required")
        AnteMortemDecision decision,

        String notes,

        String holdReason
) {}
