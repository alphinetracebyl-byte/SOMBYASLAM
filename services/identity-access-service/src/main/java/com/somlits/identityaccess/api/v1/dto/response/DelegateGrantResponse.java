package com.somlits.identityaccess.api.v1.dto.response;

import com.somlits.identityaccess.domain.enums.DelegateScope;
import com.somlits.identityaccess.domain.model.DelegateGrant;
import java.time.Instant;
import java.util.UUID;

public record DelegateGrantResponse(
        UUID grantId,
        UUID grantorUserId,
        UUID granteeUserId,
        UUID ownerId,
        DelegateScope scope,
        Instant validFrom,
        Instant validUntil,
        String status
) {
    public static DelegateGrantResponse from(DelegateGrant g) {
        return new DelegateGrantResponse(
                g.getId(), g.getGrantorUserId(), g.getGranteeUserId(),
                g.getOwnerId(), g.getScope(), g.getValidFrom(),
                g.getValidUntil(), g.getStatus()
        );
    }
}
