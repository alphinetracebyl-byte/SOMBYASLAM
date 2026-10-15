package com.somlits.quarantineexport.application.command;

import java.util.UUID;

public record StartQuarantineCommand(
        UUID consignmentId,
        UUID quarantinePremisesId,
        String quarantinePremisesCode,
        UUID operatedBy
) {}
