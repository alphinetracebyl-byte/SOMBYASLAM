package com.somlits.certification.api.v1.controller;

import com.somlits.certification.api.v1.dto.request.IssueCertificateRequest;
import com.somlits.certification.api.v1.dto.request.ReplaceCertificateRequest;
import com.somlits.certification.api.v1.dto.request.RevokeCertificateRequest;
import com.somlits.certification.api.v1.dto.response.CertificateResponse;
import com.somlits.certification.application.service.CertificationService;
import com.somlits.certification.domain.model.Certificate;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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

@Tag(name = "Certificates", description = "Issue and manage livestock certificates")
@RestController
@RequestMapping("/internal/v1/certificates")
public class CertificateController {

    private final CertificationService service;

    public CertificateController(CertificationService service) {
        this.service = service;
    }

    @Operation(summary = "Issue a new certificate")
    @PostMapping
    @PreAuthorize("hasAnyRole('VETERINARY_OFFICER','NATIONAL_ADMIN','REGIONAL_ADMIN')")
    public ResponseEntity<CertificateResponse> issue(
            @Valid @RequestBody IssueCertificateRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        Certificate cert = service.issueCertificate(
                req.getCertificateType(), req.getTemplateId(),
                callerId, req.getIssuedByName(),
                req.getValidFrom(), req.getValidUntil(),
                req.getSubjectAnimalId(), req.getSubjectAnimalCode(),
                req.getSubjectConsignmentId(), req.getSubjectMovementId(),
                req.getTemplateData());
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{certNumber}").buildAndExpand(cert.getCertificateNumber()).toUri();
        return ResponseEntity.created(location).body(CertificateResponse.from(cert));
    }

    @Operation(summary = "Revoke a certificate")
    @PostMapping("/{certNumber}/revoke")
    @PreAuthorize("hasAnyRole('VETERINARY_OFFICER','NATIONAL_ADMIN','REGIONAL_ADMIN')")
    public ResponseEntity<Void> revoke(
            @PathVariable String certNumber,
            @Valid @RequestBody RevokeCertificateRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        service.revokeCertificate(certNumber, callerId, req.getReason());
        return ResponseEntity.accepted().build();
    }

    @Operation(summary = "Replace a certificate with a new one")
    @PostMapping("/{certNumber}/replace")
    @PreAuthorize("hasAnyRole('VETERINARY_OFFICER','NATIONAL_ADMIN','REGIONAL_ADMIN')")
    public ResponseEntity<CertificateResponse> replace(
            @PathVariable String certNumber,
            @Valid @RequestBody ReplaceCertificateRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        Certificate newCert = service.replaceCertificate(certNumber, callerId, req.getIssuedByName(),
                req.getValidFrom(), req.getValidUntil(), req.getTemplateData());
        return ResponseEntity.ok(CertificateResponse.from(newCert));
    }

    @Operation(summary = "Get certificate by number")
    @GetMapping("/{certNumber}")
    public ResponseEntity<CertificateResponse> getByNumber(@PathVariable String certNumber) {
        return ResponseEntity.ok(CertificateResponse.from(service.getCertificate(certNumber)));
    }

    @Operation(summary = "Get certificates for an animal")
    @GetMapping("/by-animal/{animalId}")
    public ResponseEntity<List<CertificateResponse>> byAnimal(@PathVariable UUID animalId) {
        return ResponseEntity.ok(service.getCertificatesByAnimal(animalId).stream()
                .map(CertificateResponse::from)
                .toList());
    }

    @Operation(summary = "Get certificates for a consignment")
    @GetMapping("/by-consignment/{consignmentId}")
    public ResponseEntity<List<CertificateResponse>> byConsignment(@PathVariable UUID consignmentId) {
        return ResponseEntity.ok(service.getCertificatesByConsignment(consignmentId).stream()
                .map(CertificateResponse::from)
                .toList());
    }

    @Operation(summary = "List certificates (paginated)")
    @GetMapping
    public ResponseEntity<Page<CertificateResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("issuedAt").descending());
        return ResponseEntity.ok(service.listCertificates(pageable).map(CertificateResponse::from));
    }
}
