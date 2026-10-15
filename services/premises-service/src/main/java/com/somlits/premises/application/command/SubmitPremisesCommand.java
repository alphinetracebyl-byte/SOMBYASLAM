package com.somlits.premises.application.command;

import java.util.UUID;

public record SubmitPremisesCommand(UUID premisesId, UUID callerUserId) {}
