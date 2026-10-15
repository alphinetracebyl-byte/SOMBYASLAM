package com.somlits.quarantineexport.application.command;

import java.time.LocalDate;
import java.util.UUID;

public record FailQuarantineLotCommand(
        UUID lotId,
        LocalDate endDate,
        UUID verifiedBy,
        String reason
) {}
