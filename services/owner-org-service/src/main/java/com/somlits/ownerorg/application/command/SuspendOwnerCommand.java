package com.somlits.ownerorg.application.command;

import java.util.UUID;

public record SuspendOwnerCommand(UUID ownerId, UUID callerUserId, String reason) {}
