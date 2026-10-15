package com.somlits.ownerorg.application.command;

import java.util.UUID;

public record SubmitOwnerCommand(UUID ownerId, UUID callerUserId) {}
