package com.somlits.premises.api.v1.dto.response;

import com.somlits.premises.domain.entity.Premises;

import java.math.BigDecimal;
import java.util.UUID;

public class PremisesSummaryResponse {

    private UUID id;
    private String premisesCode;
    private String premisesName;
    private String premisesType;
    private String status;
    private UUID ownerId;
    private String ownerCode;
    private String regionCode;
    private String districtCode;
    private BigDecimal gpsLatitude;
    private BigDecimal gpsLongitude;

    public static PremisesSummaryResponse from(Premises p) {
        var r = new PremisesSummaryResponse();
        r.id = p.getId();
        r.premisesCode = p.getPremisesCode();
        r.premisesName = p.getPremisesName();
        r.premisesType = p.getPremisesType().name();
        r.status = p.getStatus().name();
        r.ownerId = p.getOwnerId();
        r.ownerCode = p.getOwnerCode();
        r.regionCode = p.getRegionCode();
        r.districtCode = p.getDistrictCode();
        r.gpsLatitude = p.getGpsLatitude();
        r.gpsLongitude = p.getGpsLongitude();
        return r;
    }

    public UUID getId() { return id; }
    public String getPremisesCode() { return premisesCode; }
    public String getPremisesName() { return premisesName; }
    public String getPremisesType() { return premisesType; }
    public String getStatus() { return status; }
    public UUID getOwnerId() { return ownerId; }
    public String getOwnerCode() { return ownerCode; }
    public String getRegionCode() { return regionCode; }
    public String getDistrictCode() { return districtCode; }
    public BigDecimal getGpsLatitude() { return gpsLatitude; }
    public BigDecimal getGpsLongitude() { return gpsLongitude; }
}
