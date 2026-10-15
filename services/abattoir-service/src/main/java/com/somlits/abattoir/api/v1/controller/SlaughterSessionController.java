package com.somlits.abattoir.api.v1.controller;

import com.somlits.abattoir.api.v1.dto.request.OpenSessionRequest;
import com.somlits.abattoir.api.v1.dto.response.SlaughterSessionResponse;
import com.somlits.abattoir.application.service.SlaughterSessionService;
import com.somlits.abattoir.domain.enums.SlaughterSessionStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/internal/v1/slaughter-sessions")
@Tag(name = "Slaughter Sessions", description = "Manage slaughter session lifecycle")
public class SlaughterSessionController {

    private static final Logger log = LoggerFactory.getLogger(SlaughterSessionController.class);

    private final SlaughterSessionService sessionService;

    public SlaughterSessionController(SlaughterSessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SLAUGHTERHOUSE_OFFICER','VETERINARY_OFFICER','MINISTRY_OFFICER')")
    @Operation(summary = "Open a new slaughter session")
    public ResponseEntity<SlaughterSessionResponse> openSession(
            @Valid @RequestBody OpenSessionRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        UUID openedBy = UUID.fromString(jwt.getSubject());
        log.info("Opening session requested by userId={}", openedBy);

        var session = sessionService.openSession(request, openedBy);
        return ResponseEntity.ok(SlaughterSessionResponse.from(session));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('SLAUGHTERHOUSE_OFFICER','VETERINARY_OFFICER','MINISTRY_OFFICER')")
    @Operation(summary = "Close an open slaughter session")
    public ResponseEntity<SlaughterSessionResponse> closeSession(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {

        UUID closedBy = UUID.fromString(jwt.getSubject());
        log.info("Closing session id={} requested by userId={}", id, closedBy);

        var session = sessionService.closeSession(id, closedBy);
        return ResponseEntity.ok(SlaughterSessionResponse.from(session));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SLAUGHTERHOUSE_OFFICER','VETERINARY_OFFICER','MINISTRY_OFFICER')")
    @Operation(summary = "Search slaughter sessions")
    public ResponseEntity<Page<SlaughterSessionResponse>> search(
            @RequestParam(required = false) UUID premisesId,
            @RequestParam(required = false) SlaughterSessionStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("sessionDate").descending());
        Page<SlaughterSessionResponse> result = sessionService
                .search(premisesId, status, date, pageable)
                .map(SlaughterSessionResponse::from);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SLAUGHTERHOUSE_OFFICER','VETERINARY_OFFICER','MINISTRY_OFFICER')")
    @Operation(summary = "Get slaughter session by ID")
    public ResponseEntity<SlaughterSessionResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(SlaughterSessionResponse.from(sessionService.getById(id)));
    }

    @GetMapping("/by-code/{code}")
    @PreAuthorize("hasAnyRole('SLAUGHTERHOUSE_OFFICER','VETERINARY_OFFICER','MINISTRY_OFFICER')")
    @Operation(summary = "Get slaughter session by session code")
    public ResponseEntity<SlaughterSessionResponse> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(SlaughterSessionResponse.from(sessionService.getByCode(code)));
    }
}
