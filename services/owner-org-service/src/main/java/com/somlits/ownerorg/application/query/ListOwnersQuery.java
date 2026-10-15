package com.somlits.ownerorg.application.query;

import com.somlits.ownerorg.domain.enums.OwnerStatus;
import com.somlits.ownerorg.domain.enums.OwnerType;

public record ListOwnersQuery(
        OwnerStatus status,
        OwnerType ownerType,
        String regionCode,
        String districtCode,
        int page,
        int size
) {}
