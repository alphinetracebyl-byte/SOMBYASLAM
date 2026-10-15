package com.somlits.quarantineexport.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;

public class CancelConsignmentRequest {

    @NotBlank(message = "reason is required")
    private String reason;

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
