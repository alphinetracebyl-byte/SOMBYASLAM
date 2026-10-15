package com.somlits.identityaccess.api.v1.dto.request;

import com.somlits.identityaccess.domain.enums.DelegateScope;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public record GrantDelegationRequest(
        @NotNull UUID granteeUserId,
        @NotNull UUID ownerId,
        @NotNull DelegateScope scope,
        @NotNull @Future Instant validUntil
) {}
