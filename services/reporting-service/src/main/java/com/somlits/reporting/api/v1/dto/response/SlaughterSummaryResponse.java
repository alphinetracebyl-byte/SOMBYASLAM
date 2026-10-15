package com.somlits.reporting.api.v1.dto.response;

import java.util.Map;

public record SlaughterSummaryResponse(
        Map<String, Long> byOutcome,
        Map<String, Long> byRegion
) {}
