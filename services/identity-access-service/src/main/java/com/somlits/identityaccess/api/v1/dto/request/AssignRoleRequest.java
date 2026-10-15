package com.somlits.identityaccess.api.v1.dto.request;

import com.somlits.identityaccess.domain.enums.RoleCode;
import com.somlits.identityaccess.domain.enums.TerritoryType;
import jakarta.validation.constraints.NotNull;

public record AssignRoleRequest(
        @NotNull RoleCode roleCode,
        @NotNull TerritoryType territoryType,
        String regionCode,
        String districtCode,
        java.util.UUID ownerId,
        java.time.Instant validUntil
) {}
