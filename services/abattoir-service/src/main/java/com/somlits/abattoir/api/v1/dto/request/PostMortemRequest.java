package com.somlits.abattoir.api.v1.dto.request;

import com.somlits.abattoir.domain.enums.PostMortemDecision;
import jakarta.validation.constraints.NotNull;

public record PostMortemRequest(
        @NotNull(message = "decision is required")
        PostMortemDecision decision,

        String notes,

        String condemnationReason
) {}
