package com.somlits.reporting.api.v1.dto.response;

import java.util.List;
import java.util.Map;

public record MovementsSummaryResponse(
        long totalMovements,
        Map<String, Long> byStatus,
        List<RouteCount> byRoute
) {
    public record RouteCount(String origin, String destination, long count) {}
}
