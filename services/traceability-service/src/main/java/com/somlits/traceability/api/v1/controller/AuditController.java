package com.somlits.traceability.api.v1.controller;

import com.somlits.traceability.api.v1.dto.response.AuditEventResponse;
import com.somlits.traceability.application.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/internal/v1/audit")
@Tag(name = "Audit", description = "Immutable audit event query endpoints")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN','REGIONAL_ADMIN','AUDITOR')")
    @Operation(summary = "Search audit events", description = "Returns paginated audit events optionally filtered by eventType, aggregateType, or performedBy")
    public Page<AuditEventResponse> searchAuditEvents(
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String aggregateType,
            @RequestParam(required = false) UUID performedBy,
            @PageableDefault(size = 20, sort = "performedAt") Pageable pageable) {
        return auditService.searchEvents(eventType, aggregateType, performedBy, pageable);
    }

    @GetMapping("/{auditId}")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN','REGIONAL_ADMIN','AUDITOR')")
    @Operation(summary = "Get audit event by ID")
    public AuditEventResponse getAuditEvent(@PathVariable UUID auditId) {
        return auditService.getEventById(auditId);
    }

    @GetMapping("/by-animal/{animalId}")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN','REGIONAL_ADMIN','DISTRICT_ADMIN','AUDITOR','VETERINARY_OFFICER','FIELD_INSPECTOR')")
    @Operation(summary = "Get audit events for a specific animal aggregate ID")
    public List<AuditEventResponse> getByAnimal(@PathVariable UUID animalId) {
        return auditService.getEventsByAggregateId(animalId);
    }

    @GetMapping("/by-correlation/{correlationId}")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN','REGIONAL_ADMIN','AUDITOR')")
    @Operation(summary = "Get audit events by correlation ID (traces a single request chain)")
    public List<AuditEventResponse> getByCorrelation(@PathVariable UUID correlationId) {
        return auditService.getEventsByCorrelation(correlationId);
    }
}
