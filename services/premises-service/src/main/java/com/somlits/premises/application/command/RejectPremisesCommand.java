package com.somlits.premises.application.command;

import java.util.UUID;

public record RejectPremisesCommand(UUID premisesId, String reason, UUID callerUserId) {}
