package com.somlits.premises.application.command;

import java.util.UUID;

public record ClosePremisesCommand(UUID premisesId, UUID callerUserId) {}
