package com.somlits.identityaccess.api.v1.dto.response;

import com.somlits.identityaccess.domain.enums.RoleCode;
import com.somlits.identityaccess.domain.enums.TerritoryType;
import com.somlits.identityaccess.domain.model.UserRoleAssignment;
import java.time.Instant;
import java.util.UUID;

public record RoleAssignmentResponse(
        UUID assignmentId,
        RoleCode roleCode,
        TerritoryType territoryType,
        String regionCode,
        String districtCode,
        UUID ownerId,
        Instant validFrom,
        Instant validUntil
) {
    public static RoleAssignmentResponse from(UserRoleAssignment a) {
        return new RoleAssignmentResponse(
                a.getId(), a.getRoleCode(), a.getTerritoryType(),
                a.getRegionCode(), a.getDistrictCode(), a.getOwnerId(),
                a.getValidFrom(), a.getValidUntil()
        );
    }
}
