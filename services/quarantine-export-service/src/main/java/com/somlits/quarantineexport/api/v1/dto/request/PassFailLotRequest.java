package com.somlits.quarantineexport.api.v1.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class PassFailLotRequest {

    @NotNull(message = "endDate is required")
    private LocalDate endDate;

    private String reason;

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
