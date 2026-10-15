package com.somlits.ownerorg.application.command;

import java.math.BigDecimal;
import java.util.UUID;

public record UpdateOwnerProfileCommand(
        UUID ownerId,
        UUID callerUserId,
        String fullName,
        String tradingName,
        String primaryPhone,
        String alternativePhone,
        String emailAddress,
        String regionCode,
        String districtCode,
        String villageOrSettlement,
        BigDecimal gpsLatitude,
        BigDecimal gpsLongitude
) {}
