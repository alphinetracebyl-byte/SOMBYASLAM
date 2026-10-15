package com.somlits.ownerorg.application.command;

import java.util.UUID;

public record RejectOwnerCommand(UUID ownerId, UUID reviewedBy, String reason) {}
