package com.somlits.ownerorg.application.command;

import java.util.UUID;

public record ReactivateOwnerCommand(UUID ownerId, UUID callerUserId) {}
