package com.somlits.certification.api.v1.controller;

import com.somlits.certification.api.v1.dto.request.CreateTemplateRequest;
import com.somlits.certification.api.v1.dto.response.CertificateTemplateResponse;
import com.somlits.certification.application.service.CertificationService;
import com.somlits.certification.domain.model.CertificateTemplate;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@Tag(name = "Certificate Templates", description = "Manage certificate templates")
@RestController
@RequestMapping("/internal/v1/certificate-templates")
public class CertificateTemplateController {

    private final CertificationService service;

    public CertificateTemplateController(CertificationService service) {
        this.service = service;
    }

    @Operation(summary = "Create a new certificate template")
    @PostMapping
    @PreAuthorize("hasRole('NATIONAL_ADMIN')")
    public ResponseEntity<CertificateTemplateResponse> create(
            @Valid @RequestBody CreateTemplateRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        CertificateTemplate t = service.createTemplate(
                req.getCertificateType(), req.getTemplateName(),
                req.getTemplateVersion(), req.getBodyTemplate(),
                req.getRequiredFields(), callerId);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(t.getId()).toUri();
        return ResponseEntity.created(location).body(CertificateTemplateResponse.from(t));
    }

    @Operation(summary = "Get template by ID")
    @GetMapping("/{id}")
    public ResponseEntity<CertificateTemplateResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(CertificateTemplateResponse.from(service.getTemplate(id)));
    }

    @Operation(summary = "List templates, optionally filtered")
    @GetMapping
    public ResponseEntity<List<CertificateTemplateResponse>> list(
            @RequestParam(required = false) Boolean isActive) {
        List<CertificateTemplate> templates = Boolean.FALSE.equals(isActive)
                ? service.listActiveTemplates().stream()
                    .filter(t -> !Boolean.TRUE.equals(t.getIsActive()))
                    .toList()
                : service.listActiveTemplates();
        return ResponseEntity.ok(templates.stream()
                .map(CertificateTemplateResponse::from)
                .toList());
    }

    @Operation(summary = "Deactivate a template")
    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('NATIONAL_ADMIN')")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        service.deactivateTemplate(id);
        return ResponseEntity.accepted().build();
    }
}
