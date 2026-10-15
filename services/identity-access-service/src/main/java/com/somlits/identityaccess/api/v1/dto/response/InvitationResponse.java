package com.somlits.identityaccess.api.v1.dto.response;

import com.somlits.identityaccess.domain.enums.InvitationStatus;
import com.somlits.identityaccess.domain.enums.RoleCode;
import com.somlits.identityaccess.domain.model.Invitation;
import java.time.Instant;
import java.util.UUID;

public record InvitationResponse(
        UUID invitationId,
        RoleCode intendedRoleCode,
        InvitationStatus status,
        Instant expiresAt,
        Instant createdAt
) {
    public static InvitationResponse from(Invitation inv) {
        return new InvitationResponse(
                inv.getId(), inv.getIntendedRoleCode(),
                inv.getStatus(), inv.getExpiresAt(), inv.getCreatedAt()
        );
    }
}
