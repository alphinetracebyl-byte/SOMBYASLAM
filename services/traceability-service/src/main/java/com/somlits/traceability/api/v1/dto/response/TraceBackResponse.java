package com.somlits.traceability.api.v1.dto.response;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Aggregated trace-back data for an individual animal gathered from all upstream services.
 * Fields sourced from services that were unreachable at query time will contain an empty list
 * or null rather than causing the entire response to fail.
 */
public record TraceBackResponse(
        UUID animalId,
        String animalCode,
        Map<String, Object> animalRecord,
        List<Map<String, Object>> ownershipHistory,
        List<Map<String, Object>> movementHistory,
        List<Map<String, Object>> healthEvents,
        List<Map<String, Object>> marketRecords,
        List<Map<String, Object>> quarantineRecords,
        List<Map<String, Object>> slaughterRecords
) {}
