package com.somlits.abattoir.api.v1.dto.response;

import com.somlits.abattoir.domain.enums.SlaughterSessionStatus;
import com.somlits.abattoir.domain.model.SlaughterSession;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record SlaughterSessionResponse(
        UUID id,
        String sessionCode,
        UUID abattoirPremisesId,
        String abattoirPremisesCode,
        LocalDate sessionDate,
        SlaughterSessionStatus status,
        UUID supervisingVetId,
        UUID openedBy,
        Instant openedAt,
        UUID closedBy,
        Instant closedAt,
        Integer totalAnimals,
        Integer slaughteredCount,
        Integer condemnedCount,
        Instant createdAt,
        Long version
) {
    public static SlaughterSessionResponse from(SlaughterSession s) {
        return new SlaughterSessionResponse(
                s.getId(),
                s.getSessionCode(),
                s.getAbattoirPremisesId(),
                s.getAbattoirPremisesCode(),
                s.getSessionDate(),
                s.getStatus(),
                s.getSupervisingVetId(),
                s.getOpenedBy(),
                s.getOpenedAt(),
                s.getClosedBy(),
                s.getClosedAt(),
                s.getTotalAnimals(),
                s.getSlaughteredCount(),
                s.getCondemnedCount(),
                s.getCreatedAt(),
                s.getVersion()
        );
    }
}
