package com.somlits.markettrade.api.v1.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public class CreateMarketSessionRequest {

    @NotNull
    private UUID marketPremisesId;

    @NotNull
    private String marketPremisesCode;

    @NotNull
    private LocalDate sessionDate;

    private UUID supervisingVetId;
    private String notes;

    public UUID getMarketPremisesId() { return marketPremisesId; }
    public String getMarketPremisesCode() { return marketPremisesCode; }
    public LocalDate getSessionDate() { return sessionDate; }
    public UUID getSupervisingVetId() { return supervisingVetId; }
    public String getNotes() { return notes; }
}
