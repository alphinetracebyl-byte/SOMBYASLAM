package com.somlits.markettrade.api.v1.controller;

import com.somlits.markettrade.api.v1.dto.request.CreateMarketSessionRequest;
import com.somlits.markettrade.api.v1.dto.response.MarketSessionResponse;
import com.somlits.markettrade.application.MarketSessionService;
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

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/internal/v1/market-sessions")
public class MarketSessionController {

    private final MarketSessionService service;

    public MarketSessionController(MarketSessionService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MARKET_OFFICER','MINISTRY_OFFICER','NATIONAL_ADMIN')")
    public ResponseEntity<MarketSessionResponse> create(
            @Valid @RequestBody CreateMarketSessionRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        var session = service.createSession(req, callerId);
        var location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(session.getId()).toUri();
        return ResponseEntity.created(location).body(MarketSessionResponse.from(session));
    }

    @PostMapping("/{id}/open")
    @PreAuthorize("hasAnyRole('MARKET_OFFICER','MINISTRY_OFFICER','NATIONAL_ADMIN')")
    public ResponseEntity<MarketSessionResponse> open(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.accepted().body(MarketSessionResponse.from(service.openSession(id, callerId)));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('MARKET_OFFICER','MINISTRY_OFFICER','NATIONAL_ADMIN')")
    public ResponseEntity<MarketSessionResponse> close(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.accepted().body(MarketSessionResponse.from(service.closeSession(id, callerId)));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('MARKET_OFFICER','MINISTRY_OFFICER','NATIONAL_ADMIN')")
    public ResponseEntity<MarketSessionResponse> cancel(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.accepted().body(MarketSessionResponse.from(service.cancelSession(id, callerId)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('MARKET_OFFICER','VETERINARY_OFFICER','FIELD_INSPECTOR','MINISTRY_OFFICER','NATIONAL_ADMIN')")
    public ResponseEntity<Page<MarketSessionResponse>> list(
            @RequestParam(required = false) UUID premisesId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) LocalDate sessionDate,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(service.listSessions(premisesId, status, sessionDate, pageable)
                .map(MarketSessionResponse::from));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MARKET_OFFICER','VETERINARY_OFFICER','FIELD_INSPECTOR','MINISTRY_OFFICER','NATIONAL_ADMIN')")
    public ResponseEntity<MarketSessionResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(MarketSessionResponse.from(service.getSession(id)));
    }
}
