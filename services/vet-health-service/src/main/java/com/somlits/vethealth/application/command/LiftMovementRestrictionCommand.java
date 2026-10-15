package com.somlits.vethealth.application.command;

import java.util.UUID;

public record LiftMovementRestrictionCommand(
        UUID restrictionId,
        UUID liftedBy,
        String liftReason
) {}
