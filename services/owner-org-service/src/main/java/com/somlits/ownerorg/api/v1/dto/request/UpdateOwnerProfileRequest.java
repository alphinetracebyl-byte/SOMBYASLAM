package com.somlits.ownerorg.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public class UpdateOwnerProfileRequest {

    @NotBlank(message = "fullName is required")
    @Size(max = 200)
    private String fullName;

    @Size(max = 200)
    private String tradingName;

    @NotBlank(message = "primaryPhone is required")
    @Size(max = 30)
    private String primaryPhone;

    @Size(max = 30)
    private String alternativePhone;

    @Size(max = 150)
    private String emailAddress;

    @NotBlank(message = "regionCode is required")
    @Size(max = 50)
    private String regionCode;

    @NotBlank(message = "districtCode is required")
    @Size(max = 50)
    private String districtCode;

    @Size(max = 200)
    private String villageOrSettlement;

    private BigDecimal gpsLatitude;
    private BigDecimal gpsLongitude;

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getTradingName() { return tradingName; }
    public void setTradingName(String tradingName) { this.tradingName = tradingName; }

    public String getPrimaryPhone() { return primaryPhone; }
    public void setPrimaryPhone(String primaryPhone) { this.primaryPhone = primaryPhone; }

    public String getAlternativePhone() { return alternativePhone; }
    public void setAlternativePhone(String alternativePhone) { this.alternativePhone = alternativePhone; }

    public String getEmailAddress() { return emailAddress; }
    public void setEmailAddress(String emailAddress) { this.emailAddress = emailAddress; }

    public String getRegionCode() { return regionCode; }
    public void setRegionCode(String regionCode) { this.regionCode = regionCode; }

    public String getDistrictCode() { return districtCode; }
    public void setDistrictCode(String districtCode) { this.districtCode = districtCode; }

    public String getVillageOrSettlement() { return villageOrSettlement; }
    public void setVillageOrSettlement(String villageOrSettlement) { this.villageOrSettlement = villageOrSettlement; }

    public BigDecimal getGpsLatitude() { return gpsLatitude; }
    public void setGpsLatitude(BigDecimal gpsLatitude) { this.gpsLatitude = gpsLatitude; }

    public BigDecimal getGpsLongitude() { return gpsLongitude; }
    public void setGpsLongitude(BigDecimal gpsLongitude) { this.gpsLongitude = gpsLongitude; }
}
