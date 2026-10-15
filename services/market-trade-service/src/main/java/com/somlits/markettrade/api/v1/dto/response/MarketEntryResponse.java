package com.somlits.markettrade.api.v1.dto.response;

import com.somlits.markettrade.domain.enums.MarketEntryStatus;
import com.somlits.markettrade.domain.enums.VetInspectionStatus;
import com.somlits.markettrade.domain.model.MarketEntry;

import java.time.Instant;
import java.util.UUID;

public record MarketEntryResponse(
        UUID id,
        String entryCode,
        UUID sessionId,
        UUID animalId,
        String animalCode,
        UUID ownerId,
        String ownerCode,
        UUID movementId,
        String holdingPen,
        Instant enteredAt,
        UUID enteredBy,
        VetInspectionStatus vetInspectionStatus,
        UUID inspectedBy,
        Instant inspectedAt,
        String inspectionNotes,
        MarketEntryStatus status,
        Instant exitedAt,
        Long version
) {
    public static MarketEntryResponse from(MarketEntry e) {
        return new MarketEntryResponse(
                e.getId(),
                e.getEntryCode(),
                e.getSessionId(),
                e.getAnimalId(),
                e.getAnimalCode(),
                e.getOwnerId(),
                e.getOwnerCode(),
                e.getMovementId(),
                e.getHoldingPen(),
                e.getEnteredAt(),
                e.getEnteredBy(),
                e.getVetInspectionStatus(),
                e.getInspectedBy(),
                e.getInspectedAt(),
                e.getInspectionNotes(),
                e.getStatus(),
                e.getExitedAt(),
                e.getVersion()
        );
    }
}
