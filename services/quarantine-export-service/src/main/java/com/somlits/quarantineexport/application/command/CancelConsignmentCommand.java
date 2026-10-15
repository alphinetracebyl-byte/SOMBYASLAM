package com.somlits.quarantineexport.application.command;

import java.util.UUID;

public record CancelConsignmentCommand(
        UUID consignmentId,
        String reason,
        UUID cancelledBy
) {}
