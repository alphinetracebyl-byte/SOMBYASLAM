package com.somlits.traceability.api.v1.controller;

import com.somlits.traceability.api.v1.dto.request.RecordAuditEventRequest;
import com.somlits.traceability.api.v1.dto.response.AuditEventResponse;
import com.somlits.traceability.application.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Internal service-to-service endpoint for recording audit events.
 * This endpoint is excluded from JWT authentication — it is secured at the
 * network perimeter (VNet / API Management internal policy) and must not be
 * exposed on the public internet.
 */
@RestController
@RequestMapping("/internal/v1/audit/internal")
@Tag(name = "Internal Audit", description = "Service-to-service audit event ingestion (no auth — network-perimeter secured)")
public class InternalAuditController {

    private final AuditService auditService;

    public InternalAuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @PostMapping("/events")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Record an audit event", description = "Called by other SOMLITS microservices to persist a domain event in the immutable audit log")
    public AuditEventResponse recordAuditEvent(@Valid @RequestBody RecordAuditEventRequest request) {
        return auditService.saveAuditEvent(request);
    }
}
