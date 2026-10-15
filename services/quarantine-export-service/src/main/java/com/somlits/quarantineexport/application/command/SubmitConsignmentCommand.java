package com.somlits.quarantineexport.application.command;

import java.util.UUID;

public record SubmitConsignmentCommand(
        UUID consignmentId,
        UUID operatedBy
) {}
