package com.somlits.premises.application.command;

import java.util.UUID;

public record ReactivatePremisesCommand(UUID premisesId, UUID callerUserId) {}
