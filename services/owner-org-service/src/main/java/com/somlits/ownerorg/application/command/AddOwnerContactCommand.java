package com.somlits.ownerorg.application.command;

import java.util.UUID;

public record AddOwnerContactCommand(
        UUID ownerId,
        UUID callerUserId,
        String contactName,
        String contactPhone,
        String contactRole
) {}
