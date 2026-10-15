package com.somlits.quarantineexport.application.command;

import java.util.UUID;

public record IssueClearanceCommand(
        UUID consignmentId,
        UUID issuedBy
) {}
