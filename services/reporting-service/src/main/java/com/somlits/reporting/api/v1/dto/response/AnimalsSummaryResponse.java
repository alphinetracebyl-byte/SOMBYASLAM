package com.somlits.reporting.api.v1.dto.response;

import java.util.Map;

public record AnimalsSummaryResponse(
        long totalAnimals,
        long activeAnimals,
        Map<String, Long> bySpecies,
        Map<String, Long> byStatus,
        Map<String, Long> byRegion
) {}
