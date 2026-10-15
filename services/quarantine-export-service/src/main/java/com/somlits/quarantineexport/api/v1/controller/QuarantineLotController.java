package com.somlits.quarantineexport.api.v1.controller;

import com.somlits.quarantineexport.api.v1.dto.request.CreateQuarantineLotRequest;
import com.somlits.quarantineexport.api.v1.dto.request.PassFailLotRequest;
import com.somlits.quarantineexport.api.v1.dto.response.QuarantineLotResponse;
import com.somlits.quarantineexport.application.command.CreateQuarantineLotCommand;
import com.somlits.quarantineexport.application.command.FailQuarantineLotCommand;
import com.somlits.quarantineexport.application.command.PassQuarantineLotCommand;
import com.somlits.quarantineexport.application.service.ConsignmentService;
import com.somlits.quarantineexport.domain.model.QuarantineLot;
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

@Tag(name = "Quarantine Lots", description = "Manage quarantine lots for export consignments")
@RestController
@RequestMapping("/internal/v1/quarantine-lots")
public class QuarantineLotController {

    private final ConsignmentService service;

    public QuarantineLotController(ConsignmentService service) {
        this.service = service;
    }

    @Operation(summary = "Create a quarantine lot for a consignment")
    @PostMapping
    public ResponseEntity<QuarantineLotResponse> create(
            @Valid @RequestBody CreateQuarantineLotRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        QuarantineLot lot = service.createLot(new CreateQuarantineLotCommand(
                req.getConsignmentId(), req.getStartDate(), req.getRequiredDays(),
                req.getSupervisingVetId(), req.getTestRequirements(), callerId));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(lot.getId()).toUri();
        return ResponseEntity.created(location).body(QuarantineLotResponse.from(lot));
    }

    @Operation(summary = "Mark a quarantine lot as passed")
    @PostMapping("/{lotId}/pass")
    public ResponseEntity<Void> pass(
            @PathVariable UUID lotId,
            @Valid @RequestBody PassFailLotRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        service.passLot(new PassQuarantineLotCommand(lotId, req.getEndDate(), callerId));
        return ResponseEntity.accepted().build();
    }

    @Operation(summary = "Mark a quarantine lot as failed")
    @PostMapping("/{lotId}/fail")
    public ResponseEntity<Void> fail(
            @PathVariable UUID lotId,
            @Valid @RequestBody PassFailLotRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        service.failLot(new FailQuarantineLotCommand(lotId, req.getEndDate(), callerId, req.getReason()));
        return ResponseEntity.accepted().build();
    }

    @Operation(summary = "Get a quarantine lot by ID")
    @GetMapping("/{lotId}")
    public ResponseEntity<QuarantineLotResponse> getById(@PathVariable UUID lotId) {
        return ResponseEntity.ok(QuarantineLotResponse.from(service.getLot(lotId)));
    }

    @Operation(summary = "List quarantine lots for a consignment")
    @GetMapping("/by-consignment/{consignmentId}")
    public ResponseEntity<List<QuarantineLotResponse>> byConsignment(@PathVariable UUID consignmentId) {
        List<QuarantineLotResponse> lots = service.listLots(consignmentId).stream()
                .map(QuarantineLotResponse::from)
                .toList();
        return ResponseEntity.ok(lots);
    }
}
