package com.somlits.markettrade.api.v1.controller;

import com.somlits.markettrade.api.v1.dto.request.RecordSaleRequest;
import com.somlits.markettrade.api.v1.dto.response.SaleRecordResponse;
import com.somlits.markettrade.application.SaleRecordService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.UUID;

@RestController
public class SaleRecordController {

    private final SaleRecordService service;

    public SaleRecordController(SaleRecordService service) {
        this.service = service;
    }

    @PostMapping("/internal/v1/market-sessions/{sessionId}/sales")
    @PreAuthorize("hasAnyRole('MARKET_OFFICER','MINISTRY_OFFICER','NATIONAL_ADMIN')")
    public ResponseEntity<SaleRecordResponse> recordSale(
            @PathVariable UUID sessionId,
            @Valid @RequestBody RecordSaleRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        var sale = service.recordSale(sessionId, req, callerId);
        var location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/internal/v1/sale-records/{id}").buildAndExpand(sale.getId()).toUri();
        return ResponseEntity.created(location).body(SaleRecordResponse.from(sale));
    }

    @PostMapping("/internal/v1/sale-records/{id}/transfer")
    @PreAuthorize("hasAnyRole('MARKET_OFFICER','MINISTRY_OFFICER','NATIONAL_ADMIN','SYSTEM')")
    public ResponseEntity<SaleRecordResponse> markTransferred(@PathVariable UUID id) {
        return ResponseEntity.accepted().body(SaleRecordResponse.from(service.markTransferred(id)));
    }

    @GetMapping("/internal/v1/market-sessions/{sessionId}/sales")
    @PreAuthorize("hasAnyRole('MARKET_OFFICER','VETERINARY_OFFICER','FIELD_INSPECTOR','MINISTRY_OFFICER','NATIONAL_ADMIN')")
    public ResponseEntity<Page<SaleRecordResponse>> listBySession(
            @PathVariable UUID sessionId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(service.listBySession(sessionId, pageable).map(SaleRecordResponse::from));
    }

    @GetMapping("/internal/v1/sale-records/{id}")
    @PreAuthorize("hasAnyRole('MARKET_OFFICER','VETERINARY_OFFICER','FIELD_INSPECTOR','MINISTRY_OFFICER','NATIONAL_ADMIN')")
    public ResponseEntity<SaleRecordResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(SaleRecordResponse.from(service.getById(id)));
    }
}
