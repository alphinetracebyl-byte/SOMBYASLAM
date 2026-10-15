package com.somlits.vethealth.application.command;

import java.time.Instant;
import java.util.UUID;

public record ImposeMovementRestrictionCommand(
        UUID animalId,
        UUID premisesId,
        String reason,
        String diseaseSuspected,
        UUID imposedBy,
        Instant expiresAt
) {}
