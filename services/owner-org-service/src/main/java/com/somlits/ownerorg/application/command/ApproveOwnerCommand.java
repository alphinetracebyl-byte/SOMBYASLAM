package com.somlits.ownerorg.application.command;

import java.util.UUID;

public record ApproveOwnerCommand(UUID ownerId, UUID reviewedBy, String officerNotes) {}
