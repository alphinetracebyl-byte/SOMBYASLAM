package com.somlits.abattoir.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record RecordArrivalRequest(
        @NotNull(message = "animalId is required")
        UUID animalId,

        @NotBlank(message = "animalCode is required")
        String animalCode,

        String tagSerial,

        String ownerCode,

        UUID movementPermitId
) {}
