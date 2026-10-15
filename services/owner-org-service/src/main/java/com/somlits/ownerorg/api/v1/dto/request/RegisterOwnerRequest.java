package com.somlits.ownerorg.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public class RegisterOwnerRequest {

    @NotNull(message = "ownerType is required")
    private String ownerType;

    @NotBlank(message = "fullName is required")
    @Size(max = 200, message = "fullName must not exceed 200 characters")
    private String fullName;

    @Size(max = 200, message = "tradingName must not exceed 200 characters")
    private String tradingName;

    @NotNull(message = "nationalIdType is required")
    private String nationalIdType;

    @NotBlank(message = "nationalIdNumber is required")
    @Size(max = 50, message = "nationalIdNumber must not exceed 50 characters")
    private String nationalIdNumber;

    @NotBlank(message = "primaryPhone is required")
    @Size(max = 30, message = "primaryPhone must not exceed 30 characters")
    private String primaryPhone;

    @Size(max = 30, message = "alternativePhone must not exceed 30 characters")
    private String alternativePhone;

    @Size(max = 150, message = "emailAddress must not exceed 150 characters")
    private String emailAddress;

    @NotBlank(message = "regionCode is required")
    @Size(max = 50, message = "regionCode must not exceed 50 characters")
    private String regionCode;

    @NotBlank(message = "districtCode is required")
    @Size(max = 50, message = "districtCode must not exceed 50 characters")
    private String districtCode;

    @Size(max = 200, message = "villageOrSettlement must not exceed 200 characters")
    private String villageOrSettlement;

    private BigDecimal gpsLatitude;

    private BigDecimal gpsLongitude;

    public String getOwnerType() { return ownerType; }
    public void setOwnerType(String ownerType) { this.ownerType = ownerType; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getTradingName() { return tradingName; }
    public void setTradingName(String tradingName) { this.tradingName = tradingName; }

    public String getNationalIdType() { return nationalIdType; }
    public void setNationalIdType(String nationalIdType) { this.nationalIdType = nationalIdType; }

    public String getNationalIdNumber() { return nationalIdNumber; }
    public void setNationalIdNumber(String nationalIdNumber) { this.nationalIdNumber = nationalIdNumber; }

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
