package com.somlits.abattoir.api.v1.dto.response;

import com.somlits.abattoir.domain.enums.AnteMortemDecision;
import com.somlits.abattoir.domain.enums.PostMortemDecision;
import com.somlits.abattoir.domain.enums.SlaughterRecordStatus;
import com.somlits.abattoir.domain.model.SlaughterRecord;

import java.time.Instant;
import java.util.UUID;

public record SlaughterRecordResponse(
        UUID id,
        String recordCode,
        UUID sessionId,
        UUID animalId,
        String animalCode,
        String tagSerial,
        UUID movementPermitId,
        String ownerCode,
        SlaughterRecordStatus status,
        Instant arrivedAt,
        UUID arrivedBy,
        Boolean tagVerified,
        Boolean permitVerified,
        AnteMortemDecision anteMortemDecision,
        UUID anteMortemInspectedBy,
        Instant anteMortemAt,
        String anteMortemNotes,
        String holdReason,
        Instant slaughteredAt,
        UUID slaughteredBy,
        Integer lairageHours,
        PostMortemDecision postMortemDecision,
        UUID postMortemInspectedBy,
        Instant postMortemAt,
        String postMortemNotes,
        String condemnationReason,
        Boolean condemnedPartial,
        Long version,
        Instant updatedAt
) {
    public static SlaughterRecordResponse from(SlaughterRecord r) {
        return new SlaughterRecordResponse(
                r.getId(),
                r.getRecordCode(),
                r.getSessionId(),
                r.getAnimalId(),
                r.getAnimalCode(),
                r.getTagSerial(),
                r.getMovementPermitId(),
                r.getOwnerCode(),
                r.getStatus(),
                r.getArrivedAt(),
                r.getArrivedBy(),
                r.getTagVerified(),
                r.getPermitVerified(),
                r.getAnteMortemDecision(),
                r.getAnteMortemInspectedBy(),
                r.getAnteMortemAt(),
                r.getAnteMortemNotes(),
                r.getHoldReason(),
                r.getSlaughteredAt(),
                r.getSlaughteredBy(),
                r.getLairageHours(),
                r.getPostMortemDecision(),
                r.getPostMortemInspectedBy(),
                r.getPostMortemAt(),
                r.getPostMortemNotes(),
                r.getCondemnationReason(),
                r.getCondemnedPartial(),
                r.getVersion(),
                r.getUpdatedAt()
        );
    }
}
