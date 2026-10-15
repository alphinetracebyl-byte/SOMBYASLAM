package com.somlits.markettrade.api.v1.dto.response;

import com.somlits.markettrade.domain.enums.MarketSessionStatus;
import com.somlits.markettrade.domain.model.MarketSession;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record MarketSessionResponse(
        UUID id,
        String sessionCode,
        UUID marketPremisesId,
        String marketPremisesCode,
        MarketSessionStatus status,
        LocalDate sessionDate,
        Instant openedAt,
        UUID openedBy,
        Instant closedAt,
        UUID closedBy,
        UUID supervisingVetId,
        String notes,
        UUID createdBy,
        Instant createdAt,
        Instant updatedAt,
        Long version
) {
    public static MarketSessionResponse from(MarketSession s) {
        return new MarketSessionResponse(
                s.getId(),
                s.getSessionCode(),
                s.getMarketPremisesId(),
                s.getMarketPremisesCode(),
                s.getStatus(),
                s.getSessionDate(),
                s.getOpenedAt(),
                s.getOpenedBy(),
                s.getClosedAt(),
                s.getClosedBy(),
                s.getSupervisingVetId(),
                s.getNotes(),
                s.getCreatedBy(),
                s.getCreatedAt(),
                s.getUpdatedAt(),
                s.getVersion()
        );
    }
}
