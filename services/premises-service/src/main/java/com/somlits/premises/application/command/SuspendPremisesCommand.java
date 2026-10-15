package com.somlits.premises.application.command;

import java.util.UUID;

public record SuspendPremisesCommand(UUID premisesId, String reason, UUID callerUserId) {}
