package com.somlits.animalregistry.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;

public class RejectRegistrationRequest {
    @NotBlank
    private String rejectionReason;
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String v) { this.rejectionReason = v; }
}
