package com.somlits.quarantineexport.api.v1.controller;

import com.somlits.quarantineexport.api.v1.dto.request.AddAnimalsRequest;
import com.somlits.quarantineexport.api.v1.dto.request.CancelConsignmentRequest;
import com.somlits.quarantineexport.api.v1.dto.request.RegisterConsignmentRequest;
import com.somlits.quarantineexport.api.v1.dto.request.StartQuarantineRequest;
import com.somlits.quarantineexport.api.v1.dto.response.ConsignmentAnimalResponse;
import com.somlits.quarantineexport.api.v1.dto.response.ConsignmentResponse;
import com.somlits.quarantineexport.application.command.AddAnimalsCommand;
import com.somlits.quarantineexport.application.command.CancelConsignmentCommand;
import com.somlits.quarantineexport.application.command.ConfirmExportCommand;
import com.somlits.quarantineexport.application.command.IssueClearanceCommand;
import com.somlits.quarantineexport.application.command.RegisterConsignmentCommand;
import com.somlits.quarantineexport.application.command.StartQuarantineCommand;
import com.somlits.quarantineexport.application.command.SubmitConsignmentCommand;
import com.somlits.quarantineexport.application.query.GetConsignmentQuery;
import com.somlits.quarantineexport.application.query.ListConsignmentsQuery;
import com.somlits.quarantineexport.application.service.ConsignmentService;
import com.somlits.quarantineexport.domain.enums.ConsignmentStatus;
import com.somlits.quarantineexport.domain.model.Consignment;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
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

@Tag(name = "Consignments", description = "Export consignment lifecycle management")
@RestController
@RequestMapping("/internal/v1/consignments")
public class ConsignmentController {

    private final ConsignmentService service;

    public ConsignmentController(ConsignmentService service) {
        this.service = service;
    }

    @Operation(summary = "Register a new export consignment")
    @PostMapping
    public ResponseEntity<ConsignmentResponse> register(
            @Valid @RequestBody RegisterConsignmentRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        Consignment c = service.register(new RegisterConsignmentCommand(
                req.getExporterOwnerId(), req.getExporterOwnerCode(),
                req.getDestinationCountry(), callerId));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(c.getId()).toUri();
        return ResponseEntity.created(location).body(ConsignmentResponse.from(c));
    }

    @Operation(summary = "Submit a consignment for processing")
    @PostMapping("/{id}/submit")
    public ResponseEntity<Void> submit(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        service.submit(new SubmitConsignmentCommand(id, callerId));
        return ResponseEntity.accepted().build();
    }

    @Operation(summary = "Add animals to a consignment")
    @PostMapping("/{id}/animals")
    public ResponseEntity<Void> addAnimals(
            @PathVariable UUID id,
            @Valid @RequestBody AddAnimalsRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        List<AddAnimalsCommand.AnimalItem> items = req.getAnimals().stream()
                .map(a -> new AddAnimalsCommand.AnimalItem(a.getAnimalId(), a.getAnimalCode()))
                .toList();
        service.addAnimals(new AddAnimalsCommand(id, items, callerId));
        return ResponseEntity.accepted().build();
    }

    @Operation(summary = "Move consignment to quarantine")
    @PostMapping("/{id}/start-quarantine")
    public ResponseEntity<Void> startQuarantine(
            @PathVariable UUID id,
            @Valid @RequestBody StartQuarantineRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        service.startQuarantine(new StartQuarantineCommand(
                id, req.getQuarantinePremisesId(), req.getQuarantinePremisesCode(), callerId));
        return ResponseEntity.accepted().build();
    }

    @Operation(summary = "Issue export clearance for a consignment")
    @PostMapping("/{id}/issue-clearance")
    public ResponseEntity<Void> issueClearance(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        service.issueClearance(new IssueClearanceCommand(id, callerId));
        return ResponseEntity.accepted().build();
    }

    @Operation(summary = "Confirm animal export")
    @PostMapping("/{id}/export")
    public ResponseEntity<Void> confirmExport(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        service.confirmExport(new ConfirmExportCommand(id, callerId));
        return ResponseEntity.accepted().build();
    }

    @Operation(summary = "Cancel a consignment")
    @PostMapping("/{id}/cancel")
    public ResponseEntity<Void> cancel(
            @PathVariable UUID id,
            @Valid @RequestBody CancelConsignmentRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        service.cancel(new CancelConsignmentCommand(id, req.getReason(), callerId));
        return ResponseEntity.accepted().build();
    }

    @Operation(summary = "Get consignment by ID")
    @GetMapping("/{id}")
    public ResponseEntity<ConsignmentResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ConsignmentResponse.from(service.getConsignment(new GetConsignmentQuery(id))));
    }

    @Operation(summary = "List animals for a consignment")
    @GetMapping("/{id}/animals")
    public ResponseEntity<List<ConsignmentAnimalResponse>> listAnimals(@PathVariable UUID id) {
        List<ConsignmentAnimalResponse> animals = service.listAnimals(id).stream()
                .map(ConsignmentAnimalResponse::from)
                .toList();
        return ResponseEntity.ok(animals);
    }

    @Operation(summary = "List consignments with optional filters")
    @GetMapping
    public ResponseEntity<Page<ConsignmentResponse>> list(
            @RequestParam(required = false) ConsignmentStatus status,
            @RequestParam(required = false) UUID exporterOwnerId,
            @RequestParam(required = false) String destinationCountry,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<ConsignmentResponse> result = service.listConsignments(
                        new ListConsignmentsQuery(status, exporterOwnerId, destinationCountry, pageable))
                .map(ConsignmentResponse::from);
        return ResponseEntity.ok(result);
    }
}
