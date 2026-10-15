package com.somlits.reporting.api.v1.dto.response;

import java.util.List;

public record VaccinationCoverageResponse(
        List<RegionEventCount> coverage
) {
    public record RegionEventCount(String region, String eventType, long count) {}
}
