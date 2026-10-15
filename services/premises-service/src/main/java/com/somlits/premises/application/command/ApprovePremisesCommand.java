package com.somlits.premises.application.command;

import java.util.UUID;

public record ApprovePremisesCommand(UUID premisesId, UUID callerUserId) {}
