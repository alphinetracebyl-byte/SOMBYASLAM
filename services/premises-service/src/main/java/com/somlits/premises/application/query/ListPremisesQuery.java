package com.somlits.premises.application.query;

import java.util.UUID;

public record ListPremisesQuery(
        UUID ownerId,
        String regionCode,
        String districtCode,
        String premisesType,
        String status,
        int page,
        int size
) {}
