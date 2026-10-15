package com.somlits.quarantineexport.api.v1.controller;

import com.somlits.quarantineexport.api.v1.dto.request.IssueExportClearanceRequest;
import com.somlits.quarantineexport.api.v1.dto.request.RevokeClearanceRequest;
import com.somlits.quarantineexport.api.v1.dto.response.ExportClearanceResponse;
import com.somlits.quarantineexport.application.command.IssueExportClearanceCommand;
import com.somlits.quarantineexport.application.service.ConsignmentService;
import com.somlits.quarantineexport.domain.model.ExportClearance;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@Tag(name = "Export Clearances", description = "Issue and manage export clearance documents")
@RestController
@RequestMapping("/internal/v1/export-clearances")
public class ExportClearanceController {

    private final ConsignmentService service;

    public ExportClearanceController(ConsignmentService service) {
        this.service = service;
    }

    @Operation(summary = "Issue an export clearance document")
    @PostMapping
    public ResponseEntity<ExportClearanceResponse> issue(
            @Valid @RequestBody IssueExportClearanceRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        ExportClearance ec = service.issueExportClearance(new IssueExportClearanceCommand(
                req.getConsignmentId(), req.getAnimalId(),
                req.getClearanceDate(), req.getValidUntil(), callerId));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(ec.getId()).toUri();
        return ResponseEntity.created(location).body(ExportClearanceResponse.from(ec));
    }

    @Operation(summary = "Revoke an export clearance")
    @PostMapping("/{clearanceId}/revoke")
    public ResponseEntity<Void> revoke(
            @PathVariable UUID clearanceId,
            @Valid @RequestBody RevokeClearanceRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        service.revokeClearance(clearanceId, callerId);
        return ResponseEntity.accepted().build();
    }

    @Operation(summary = "Get an export clearance by ID")
    @GetMapping("/{clearanceId}")
    public ResponseEntity<ExportClearanceResponse> getById(@PathVariable UUID clearanceId) {
        return ResponseEntity.ok(ExportClearanceResponse.from(service.getClearance(clearanceId)));
    }

    @Operation(summary = "List export clearances for a consignment")
    @GetMapping("/by-consignment/{consignmentId}")
    public ResponseEntity<List<ExportClearanceResponse>> byConsignment(@PathVariable UUID consignmentId) {
        List<ExportClearanceResponse> clearances = service.listClearancesByConsignment(consignmentId).stream()
                .map(ExportClearanceResponse::from)
                .toList();
        return ResponseEntity.ok(clearances);
    }
}
