package com.somlits.movementtracking.api.v1.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class CreateMovementRuleRequest {

    @NotBlank
    private String ruleCode;

    @NotBlank
    private String originPremisesType;

    @NotBlank
    private String destinationType;

    @NotBlank
    private String movementPurpose;

    private boolean permitted = true;
    private boolean requiresVetReview;

    @Min(1)
    private int permitValidityHours = 72;

    private boolean mixedSpeciesAllowed;
    private boolean crossBorder;

    public String getRuleCode() { return ruleCode; }
    public void setRuleCode(String v) { this.ruleCode = v; }
    public String getOriginPremisesType() { return originPremisesType; }
    public void setOriginPremisesType(String v) { this.originPremisesType = v; }
    public String getDestinationType() { return destinationType; }
    public void setDestinationType(String v) { this.destinationType = v; }
    public String getMovementPurpose() { return movementPurpose; }
    public void setMovementPurpose(String v) { this.movementPurpose = v; }
    public boolean isPermitted() { return permitted; }
    public void setPermitted(boolean v) { this.permitted = v; }
    public boolean isRequiresVetReview() { return requiresVetReview; }
    public void setRequiresVetReview(boolean v) { this.requiresVetReview = v; }
    public int getPermitValidityHours() { return permitValidityHours; }
    public void setPermitValidityHours(int v) { this.permitValidityHours = v; }
    public boolean isMixedSpeciesAllowed() { return mixedSpeciesAllowed; }
    public void setMixedSpeciesAllowed(boolean v) { this.mixedSpeciesAllowed = v; }
    public boolean isCrossBorder() { return crossBorder; }
    public void setCrossBorder(boolean v) { this.crossBorder = v; }
}
