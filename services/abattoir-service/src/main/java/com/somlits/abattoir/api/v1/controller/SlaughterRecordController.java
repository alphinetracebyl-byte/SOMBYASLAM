package com.somlits.abattoir.api.v1.controller;

import com.somlits.abattoir.api.v1.dto.request.AnteMortemRequest;
import com.somlits.abattoir.api.v1.dto.request.EmergencySlaughterRequest;
import com.somlits.abattoir.api.v1.dto.request.PostMortemRequest;
import com.somlits.abattoir.api.v1.dto.request.RecordArrivalRequest;
import com.somlits.abattoir.api.v1.dto.response.SlaughterRecordResponse;
import com.somlits.abattoir.application.service.SlaughterRecordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
import java.util.UUID;

@RestController
@Tag(name = "Slaughter Records", description = "Manage animal slaughter record lifecycle")
public class SlaughterRecordController {

    private static final Logger log = LoggerFactory.getLogger(SlaughterRecordController.class);

    private final SlaughterRecordService recordService;

    public SlaughterRecordController(SlaughterRecordService recordService) {
        this.recordService = recordService;
    }

    @PostMapping("/internal/v1/slaughter-sessions/{sessionId}/records")
    @PreAuthorize("hasAnyRole('SLAUGHTERHOUSE_OFFICER','VETERINARY_OFFICER','MINISTRY_OFFICER')")
    @Operation(summary = "Record animal arrival at abattoir")
    public ResponseEntity<SlaughterRecordResponse> recordArrival(
            @PathVariable UUID sessionId,
            @Valid @RequestBody RecordArrivalRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        UUID arrivedBy = UUID.fromString(jwt.getSubject());
        var record = recordService.recordArrival(sessionId, request, arrivedBy);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(record.getId())
                .toUri();
        return ResponseEntity.created(location).body(SlaughterRecordResponse.from(record));
    }

    @PostMapping("/internal/v1/slaughter-records/{id}/verify-tag")
    @PreAuthorize("hasAnyRole('SLAUGHTERHOUSE_OFFICER','VETERINARY_OFFICER','MINISTRY_OFFICER')")
    @Operation(summary = "Verify animal ear tag against record")
    public ResponseEntity<SlaughterRecordResponse> verifyTag(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = UUID.fromString(jwt.getSubject());
        var record = recordService.verifyTag(id, userId);
        return ResponseEntity.accepted().body(SlaughterRecordResponse.from(record));
    }

    @PostMapping("/internal/v1/slaughter-records/{id}/verify-permit")
    @PreAuthorize("hasAnyRole('SLAUGHTERHOUSE_OFFICER','VETERINARY_OFFICER','MINISTRY_OFFICER')")
    @Operation(summary = "Verify movement permit for animal")
    public ResponseEntity<SlaughterRecordResponse> verifyPermit(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = UUID.fromString(jwt.getSubject());
        var record = recordService.verifyPermit(id, userId);
        return ResponseEntity.accepted().body(SlaughterRecordResponse.from(record));
    }

    @PostMapping("/internal/v1/slaughter-records/{id}/ante-mortem")
    @PreAuthorize("hasAnyRole('SLAUGHTERHOUSE_OFFICER','VETERINARY_OFFICER','MINISTRY_OFFICER')")
    @Operation(summary = "Record ante-mortem inspection result")
    public ResponseEntity<SlaughterRecordResponse> recordAnteMortem(
            @PathVariable UUID id,
            @Valid @RequestBody AnteMortemRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = UUID.fromString(jwt.getSubject());
        var record = recordService.recordAnteMortem(id, request, userId);
        return ResponseEntity.ok(SlaughterRecordResponse.from(record));
    }

    @PostMapping("/internal/v1/slaughter-records/{id}/slaughter")
    @PreAuthorize("hasAnyRole('SLAUGHTERHOUSE_OFFICER','VETERINARY_OFFICER','MINISTRY_OFFICER')")
    @Operation(summary = "Record animal slaughter")
    public ResponseEntity<SlaughterRecordResponse> recordSlaughter(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = UUID.fromString(jwt.getSubject());
        var record = recordService.recordSlaughter(id, userId);
        return ResponseEntity.accepted().body(SlaughterRecordResponse.from(record));
    }

    @PostMapping("/internal/v1/slaughter-records/{id}/post-mortem")
    @PreAuthorize("hasAnyRole('SLAUGHTERHOUSE_OFFICER','VETERINARY_OFFICER','MINISTRY_OFFICER')")
    @Operation(summary = "Record post-mortem inspection result")
    public ResponseEntity<SlaughterRecordResponse> recordPostMortem(
            @PathVariable UUID id,
            @Valid @RequestBody PostMortemRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = UUID.fromString(jwt.getSubject());
        var record = recordService.recordPostMortem(id, request, userId);
        return ResponseEntity.ok(SlaughterRecordResponse.from(record));
    }

    @PostMapping("/internal/v1/slaughter-records/{id}/emergency-slaughter")
    @PreAuthorize("hasAnyRole('SLAUGHTERHOUSE_OFFICER','VETERINARY_OFFICER','MINISTRY_OFFICER')")
    @Operation(summary = "Record emergency slaughter")
    public ResponseEntity<SlaughterRecordResponse> emergencySlaughter(
            @PathVariable UUID id,
            @Valid @RequestBody EmergencySlaughterRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = UUID.fromString(jwt.getSubject());
        var record = recordService.emergencySlaughter(id, request.reason(), userId);
        return ResponseEntity.ok(SlaughterRecordResponse.from(record));
    }

    @GetMapping("/internal/v1/slaughter-sessions/{sessionId}/records")
    @PreAuthorize("hasAnyRole('SLAUGHTERHOUSE_OFFICER','VETERINARY_OFFICER','MINISTRY_OFFICER')")
    @Operation(summary = "List slaughter records for a session")
    public ResponseEntity<Page<SlaughterRecordResponse>> getBySession(
            @PathVariable UUID sessionId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("arrivedAt").ascending());
        Page<SlaughterRecordResponse> result = recordService.getBySession(sessionId, pageable)
                .map(SlaughterRecordResponse::from);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/internal/v1/slaughter-records/{id}")
    @PreAuthorize("hasAnyRole('SLAUGHTERHOUSE_OFFICER','VETERINARY_OFFICER','MINISTRY_OFFICER')")
    @Operation(summary = "Get slaughter record by ID")
    public ResponseEntity<SlaughterRecordResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(SlaughterRecordResponse.from(recordService.getById(id)));
    }
}
