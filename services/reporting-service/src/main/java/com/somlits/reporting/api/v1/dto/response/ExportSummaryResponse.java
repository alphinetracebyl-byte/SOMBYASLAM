package com.somlits.reporting.api.v1.dto.response;

import java.util.Map;

public record ExportSummaryResponse(
        Map<String, Long> byDestination,
        Map<String, Long> byStatus
) {}
