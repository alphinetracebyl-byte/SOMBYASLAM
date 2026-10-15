package com.somlits.abattoir.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record OpenSessionRequest(
        @NotNull(message = "abattoirPremisesId is required")
        UUID abattoirPremisesId,

        @NotBlank(message = "abattoirPremisesCode is required")
        String abattoirPremisesCode,

        @NotNull(message = "sessionDate is required")
        LocalDate sessionDate,

        UUID supervisingVetId
) {}
