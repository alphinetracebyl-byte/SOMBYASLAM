package com.somlits.traceability.api.v1.controller;

import com.somlits.traceability.api.v1.dto.response.TraceBackResponse;
import com.somlits.traceability.application.service.TraceabilityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/internal/v1/traceability")
@Tag(name = "Traceability", description = "Full animal trace-back and trace-forward endpoints")
public class TraceabilityController {

    private final TraceabilityService traceabilityService;

    public TraceabilityController(TraceabilityService traceabilityService) {
        this.traceabilityService = traceabilityService;
    }

    @GetMapping("/animals/{animalId}/trace-back")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN','REGIONAL_ADMIN','DISTRICT_ADMIN','AUDITOR','VETERINARY_OFFICER','FIELD_INSPECTOR')")
    @Operation(
            summary = "Trace back for an animal",
            description = "Aggregates the complete history of an animal across all services: " +
                          "registry, ownership, movements, health, markets, quarantine and slaughter. " +
                          "Data from unavailable services is returned as empty rather than failing the request."
    )
    public TraceBackResponse traceBack(@PathVariable UUID animalId) {
        return traceabilityService.traceBack(animalId);
    }

    @GetMapping("/animals/{animalId}/trace-forward")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN','REGIONAL_ADMIN','DISTRICT_ADMIN','AUDITOR','VETERINARY_OFFICER','FIELD_INSPECTOR')")
    @Operation(
            summary = "Trace forward from an animal",
            description = "Returns animals that were co-located with or moved alongside the specified animal, " +
                          "enabling disease contact tracing."
    )
    public List<Map<String, Object>> traceForward(@PathVariable UUID animalId) {
        return traceabilityService.traceForward(animalId);
    }
}
