package com.somlits.movementtracking.api.v1.dto.response;

import com.somlits.movementtracking.domain.model.MovementRule;

import java.time.Instant;
import java.util.UUID;

public class MovementRuleResponse {

    private UUID id;
    private String ruleCode;
    private String originPremisesType;
    private String destinationType;
    private String movementPurpose;
    private boolean permitted;
    private boolean requiresVetReview;
    private int permitValidityHours;
    private boolean mixedSpeciesAllowed;
    private boolean crossBorder;
    private boolean active;
    private Instant createdAt;
    private Instant updatedAt;

    public static MovementRuleResponse from(MovementRule r) {
        var dto = new MovementRuleResponse();
        dto.id = r.getId();
        dto.ruleCode = r.getRuleCode();
        dto.originPremisesType = r.getOriginPremisesType();
        dto.destinationType = r.getDestinationType().name();
        dto.movementPurpose = r.getMovementPurpose().name();
        dto.permitted = r.isPermitted();
        dto.requiresVetReview = r.isRequiresVetReview();
        dto.permitValidityHours = r.getPermitValidityHours();
        dto.mixedSpeciesAllowed = r.isMixedSpeciesAllowed();
        dto.crossBorder = r.isCrossBorder();
        dto.active = r.isActive();
        dto.createdAt = r.getCreatedAt();
        dto.updatedAt = r.getUpdatedAt();
        return dto;
    }

    public UUID getId() { return id; }
    public String getRuleCode() { return ruleCode; }
    public String getOriginPremisesType() { return originPremisesType; }
    public String getDestinationType() { return destinationType; }
    public String getMovementPurpose() { return movementPurpose; }
    public boolean isPermitted() { return permitted; }
    public boolean isRequiresVetReview() { return requiresVetReview; }
    public int getPermitValidityHours() { return permitValidityHours; }
    public boolean isMixedSpeciesAllowed() { return mixedSpeciesAllowed; }
    public boolean isCrossBorder() { return crossBorder; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
