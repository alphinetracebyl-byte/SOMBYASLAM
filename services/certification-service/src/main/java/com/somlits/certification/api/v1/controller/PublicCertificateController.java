package com.somlits.certification.api.v1.controller;

import com.somlits.certification.api.v1.dto.response.VerificationResponse;
import com.somlits.certification.application.service.CertificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Public Certificate Verification", description = "Publicly accessible QR code verification endpoint")
@RestController
@RequestMapping("/public/v1/certificates")
public class PublicCertificateController {

    private final CertificationService service;

    public PublicCertificateController(CertificationService service) {
        this.service = service;
    }

    @Operation(summary = "Verify a certificate using its QR code — no authentication required")
    @GetMapping("/verify/{qrCode}")
    public ResponseEntity<VerificationResponse> verify(
            @PathVariable String qrCode,
            HttpServletRequest httpRequest) {
        String ip = extractIp(httpRequest);
        CertificationService.VerificationResponse vr = service.verify(qrCode, ip);
        return ResponseEntity.ok(VerificationResponse.from(vr));
    }

    private String extractIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
