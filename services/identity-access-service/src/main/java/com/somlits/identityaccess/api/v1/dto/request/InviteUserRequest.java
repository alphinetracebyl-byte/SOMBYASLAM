package com.somlits.identityaccess.api.v1.dto.request;

import com.somlits.identityaccess.domain.enums.RoleCode;
import com.somlits.identityaccess.domain.enums.TerritoryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record InviteUserRequest(
        @NotNull
        RoleCode roleCode,

        @NotNull
        TerritoryType territoryType,

        String regionCode,

        String districtCode,

        java.util.UUID ownerId,

        @NotBlank @Pattern(regexp = "^\\+[1-9]\\d{7,14}$")
        String phoneE164
) {}
