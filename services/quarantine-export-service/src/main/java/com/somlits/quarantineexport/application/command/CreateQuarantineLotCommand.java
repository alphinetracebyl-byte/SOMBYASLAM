package com.somlits.quarantineexport.application.command;

import java.time.LocalDate;
import java.util.UUID;

public record CreateQuarantineLotCommand(
        UUID consignmentId,
        LocalDate startDate,
        int requiredDays,
        UUID supervisingVetId,
        String testRequirements,
        UUID createdBy
) {}
