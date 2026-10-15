package com.somlits.quarantineexport.application.command;

import java.util.UUID;

public record ConfirmExportCommand(
        UUID consignmentId,
        UUID confirmedBy
) {}
