package com.somlits.traceability.application.service;

import com.somlits.traceability.api.v1.dto.response.TraceBackResponse;
import com.somlits.traceability.infrastructure.config.ServiceUrlProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TraceabilityService {

    private static final Logger log = LoggerFactory.getLogger(TraceabilityService.class);

    private final RestTemplate restTemplate;
    private final ServiceUrlProperties serviceUrls;

    public TraceabilityService(RestTemplate restTemplate, ServiceUrlProperties serviceUrls) {
        this.restTemplate = restTemplate;
        this.serviceUrls = serviceUrls;
    }

    /**
     * Aggregates trace-back data for a single animal from all upstream services.
     * Errors from individual services are logged and result in empty data for that section
     * so that a single unavailable service does not block the entire trace response.
     */
    public TraceBackResponse traceBack(UUID animalId) {
        log.info("Building trace-back for animalId={}", animalId);

        Map<String, Object> animalRecord = fetchAnimalRecord(animalId);

        String animalCode = animalRecord != null
                ? (String) animalRecord.getOrDefault("animalCode", animalId.toString())
                : animalId.toString();

        List<Map<String, Object>> ownershipHistory  = fetchList(
                serviceUrls.getAnimalRegistry() + "/internal/v1/animals/" + animalId + "/ownership-history");
        List<Map<String, Object>> movementHistory   = fetchList(
                serviceUrls.getMovementTracking() + "/internal/v1/movements?animalId=" + animalId);
        List<Map<String, Object>> healthEvents      = fetchList(
                serviceUrls.getVetHealth() + "/internal/v1/health-events?animalId=" + animalId);
        List<Map<String, Object>> marketRecords     = fetchList(
                serviceUrls.getMarketTrade() + "/internal/v1/market-records?animalId=" + animalId);
        List<Map<String, Object>> quarantineRecords = fetchList(
                serviceUrls.getQuarantineExport() + "/internal/v1/quarantine?animalId=" + animalId);
        List<Map<String, Object>> slaughterRecords  = fetchList(
                serviceUrls.getAbattoir() + "/internal/v1/slaughter?animalId=" + animalId);

        return new TraceBackResponse(
                animalId,
                animalCode,
                animalRecord,
                ownershipHistory,
                movementHistory,
                healthEvents,
                marketRecords,
                quarantineRecords,
                slaughterRecords
        );
    }

    /**
     * Returns a list of animals that were co-located with or moved alongside the specified animal
     * (trace-forward). This is a simplified implementation that returns movement contact animals.
     */
    public List<Map<String, Object>> traceForward(UUID animalId) {
        log.info("Building trace-forward for animalId={}", animalId);
        return fetchList(
                serviceUrls.getMovementTracking() + "/internal/v1/movements/contact-animals?animalId=" + animalId);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchAnimalRecord(UUID animalId) {
        String url = serviceUrls.getAnimalRegistry() + "/internal/v1/animals/" + animalId;
        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.GET, null,
                    new ParameterizedTypeReference<Map<String, Object>>() {});
            return response.getBody();
        } catch (RestClientException ex) {
            log.warn("Failed to fetch animal record from {} — {}", url, ex.getMessage());
            return Collections.emptyMap();
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchList(String url) {
        try {
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    url, HttpMethod.GET, null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {});
            return response.getBody() != null ? response.getBody() : Collections.emptyList();
        } catch (RestClientException ex) {
            log.warn("Failed to fetch list from {} — {}", url, ex.getMessage());
            return Collections.emptyList();
        }
    }
}
