package com.somlits.quarantineexport.application.command;

import java.util.UUID;

public record RegisterConsignmentCommand(
        UUID exporterOwnerId,
        String exporterOwnerCode,
        String destinationCountry,
        UUID createdBy
) {}
