package com.somlits.quarantineexport.application.command;

import java.time.LocalDate;
import java.util.UUID;

public record IssueExportClearanceCommand(
        UUID consignmentId,
        UUID animalId,
        LocalDate clearanceDate,
        LocalDate validUntil,
        UUID issuedBy
) {}
