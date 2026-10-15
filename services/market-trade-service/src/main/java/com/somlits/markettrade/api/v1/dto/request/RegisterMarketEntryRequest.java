package com.somlits.markettrade.api.v1.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class RegisterMarketEntryRequest {

    @NotNull
    private UUID animalId;

    @NotNull
    private String animalCode;

    @NotNull
    private UUID ownerId;

    @NotNull
    private String ownerCode;

    private UUID movementId;
    private String holdingPen;

    public UUID getAnimalId() { return animalId; }
    public String getAnimalCode() { return animalCode; }
    public UUID getOwnerId() { return ownerId; }
    public String getOwnerCode() { return ownerCode; }
    public UUID getMovementId() { return movementId; }
    public String getHoldingPen() { return holdingPen; }
}
