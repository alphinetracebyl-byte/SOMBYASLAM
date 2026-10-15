package com.somlits.markettrade.api.v1.controller;

import com.somlits.markettrade.api.v1.dto.request.RegisterMarketEntryRequest;
import com.somlits.markettrade.api.v1.dto.request.VetInspectionRequest;
import com.somlits.markettrade.api.v1.dto.response.MarketEntryResponse;
import com.somlits.markettrade.application.MarketEntryService;
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
public class MarketEntryController {

    private final MarketEntryService service;

    public MarketEntryController(MarketEntryService service) {
        this.service = service;
    }

    @PostMapping("/internal/v1/market-sessions/{sessionId}/entries")
    @PreAuthorize("hasAnyRole('MARKET_OFFICER','FIELD_INSPECTOR','MINISTRY_OFFICER','NATIONAL_ADMIN')")
    public ResponseEntity<MarketEntryResponse> register(
            @PathVariable UUID sessionId,
            @Valid @RequestBody RegisterMarketEntryRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        var entry = service.registerEntry(sessionId, req, callerId);
        var location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/internal/v1/market-entries/{id}").buildAndExpand(entry.getId()).toUri();
        return ResponseEntity.created(location).body(MarketEntryResponse.from(entry));
    }

    @PostMapping("/internal/v1/market-entries/{id}/vet-inspect")
    @PreAuthorize("hasAnyRole('VETERINARY_OFFICER','MINISTRY_OFFICER','NATIONAL_ADMIN')")
    public ResponseEntity<MarketEntryResponse> vetInspect(
            @PathVariable UUID id,
            @Valid @RequestBody VetInspectionRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(MarketEntryResponse.from(service.performVetInspection(id, req, callerId)));
    }

    @PostMapping("/internal/v1/market-entries/{id}/withdraw")
    @PreAuthorize("hasAnyRole('MARKET_OFFICER','FIELD_INSPECTOR','FARMER','MINISTRY_OFFICER','NATIONAL_ADMIN')")
    public ResponseEntity<MarketEntryResponse> withdraw(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.accepted().body(MarketEntryResponse.from(service.withdraw(id, callerId)));
    }

    @GetMapping("/internal/v1/market-sessions/{sessionId}/entries")
    @PreAuthorize("hasAnyRole('MARKET_OFFICER','VETERINARY_OFFICER','FIELD_INSPECTOR','MINISTRY_OFFICER','NATIONAL_ADMIN')")
    public ResponseEntity<Page<MarketEntryResponse>> listBySession(
            @PathVariable UUID sessionId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(service.listBySession(sessionId, pageable).map(MarketEntryResponse::from));
    }

    @GetMapping("/internal/v1/market-entries/{id}")
    @PreAuthorize("hasAnyRole('MARKET_OFFICER','VETERINARY_OFFICER','FIELD_INSPECTOR','MINISTRY_OFFICER','NATIONAL_ADMIN')")
    public ResponseEntity<MarketEntryResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(MarketEntryResponse.from(service.getById(id)));
    }
}
