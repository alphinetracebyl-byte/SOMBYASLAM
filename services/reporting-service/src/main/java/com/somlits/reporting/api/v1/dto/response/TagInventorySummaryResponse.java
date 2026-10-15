package com.somlits.reporting.api.v1.dto.response;

/**
 * Placeholder response for tag inventory summary.
 * Tag inventory data will be populated once the tag management service
 * publishes events to the reporting read model.
 */
public record TagInventorySummaryResponse(
        String message
) {
    public TagInventorySummaryResponse() {
        this("Tag inventory data not yet available. Awaiting integration with tag management service.");
    }
}
