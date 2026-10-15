package com.somlits.ownerorg.application.command;

import com.somlits.ownerorg.domain.enums.NationalIdType;
import com.somlits.ownerorg.domain.enums.OwnerType;

import java.math.BigDecimal;
import java.util.UUID;

public record RegisterOwnerCommand(
        OwnerType ownerType,
        String fullName,
        String tradingName,
        NationalIdType nationalIdType,
        String nationalIdNumber,
        String primaryPhone,
        String alternativePhone,
        String emailAddress,
        String regionCode,
        String districtCode,
        String villageOrSettlement,
        BigDecimal gpsLatitude,
        BigDecimal gpsLongitude,
        UUID registeredBy
) {}
