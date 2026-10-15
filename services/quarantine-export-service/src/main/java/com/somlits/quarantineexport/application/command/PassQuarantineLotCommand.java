package com.somlits.quarantineexport.application.command;

import java.time.LocalDate;
import java.util.UUID;

public record PassQuarantineLotCommand(
        UUID lotId,
        LocalDate endDate,
        UUID verifiedBy
) {}
