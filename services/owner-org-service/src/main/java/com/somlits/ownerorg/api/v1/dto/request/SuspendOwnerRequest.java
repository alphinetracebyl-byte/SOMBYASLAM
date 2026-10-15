package com.somlits.ownerorg.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;

public class SuspendOwnerRequest {

    @NotBlank(message = "reason is required")
    private String reason;

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
