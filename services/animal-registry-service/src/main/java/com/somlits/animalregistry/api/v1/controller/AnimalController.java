package com.somlits.animalregistry.api.v1.controller;

import com.somlits.animalregistry.api.v1.dto.request.ConfiscationRequest;
import com.somlits.animalregistry.api.v1.dto.request.DeathNotificationRequest;
import com.somlits.animalregistry.api.v1.dto.request.ExportDeclarationRequest;
import com.somlits.animalregistry.api.v1.dto.request.OwnerTransferRequest;
import com.somlits.animalregistry.api.v1.dto.request.SlaughterNotificationRequest;
import com.somlits.animalregistry.api.v1.dto.request.TagApplicationRequest;
import com.somlits.animalregistry.api.v1.dto.request.TagReplacementRequest;
import com.somlits.animalregistry.api.v1.dto.response.AnimalResponse;
import com.somlits.animalregistry.application.AnimalLifecycleService;
import com.somlits.animalregistry.application.TagManagementService;
import com.somlits.animalregistry.domain.enums.AnimalStatus;
import com.somlits.animalregistry.domain.enums.Species;
import com.somlits.animalregistry.domain.exception.DomainNotFoundException;
import com.somlits.animalregistry.domain.model.AnimalRecord;
import com.somlits.animalregistry.domain.model.TagAssignment;
import com.somlits.animalregistry.domain.repository.AnimalRecordRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/internal/v1/animals")
public class AnimalController {

    private final AnimalRecordRepository animalRepo;
    private final TagManagementService tagService;
    private final AnimalLifecycleService lifecycleService;

    public AnimalController(AnimalRecordRepository animalRepo,
                            TagManagementService tagService,
                            AnimalLifecycleService lifecycleService) {
        this.animalRepo = animalRepo;
        this.tagService = tagService;
        this.lifecycleService = lifecycleService;
    }

    @GetMapping
    public ResponseEntity<Page<AnimalResponse>> search(
            @RequestParam(required = false) UUID ownerId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String species,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        AnimalStatus statusEnum = status != null ? AnimalStatus.valueOf(status.toUpperCase()) : null;
        Species speciesEnum = species != null ? Species.valueOf(species.toUpperCase()) : null;
        PageRequest pageable = PageRequest.of(page, size, Sort.by("registeredAt").descending());
        Page<AnimalResponse> result = animalRepo.search(ownerId, statusEnum, speciesEnum, pageable)
                .map(AnimalResponse::from);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{animalId}")
    public ResponseEntity<AnimalResponse> getById(@PathVariable UUID animalId) {
        AnimalRecord animal = animalRepo.findById(animalId)
                .orElseThrow(() -> new DomainNotFoundException("Animal not found: " + animalId));
        return ResponseEntity.ok(AnimalResponse.from(animal));
    }

    @GetMapping("/by-code/{animalCode}")
    public ResponseEntity<AnimalResponse> getByCode(@PathVariable String animalCode) {
        AnimalRecord animal = animalRepo.findByAnimalCode(animalCode)
                .orElseThrow(() -> new DomainNotFoundException("Animal not found with code: " + animalCode));
        return ResponseEntity.ok(AnimalResponse.from(animal));
    }

    @GetMapping("/by-tag/{tagSerial}")
    public ResponseEntity<AnimalResponse> getByTag(@PathVariable String tagSerial) {
        AnimalRecord animal = animalRepo.findByActiveTagSerial(tagSerial)
                .orElseThrow(() -> new DomainNotFoundException("No active animal found with tag: " + tagSerial));
        return ResponseEntity.ok(AnimalResponse.from(animal));
    }

    // Tag management

    @PostMapping("/{animalId}/tags")
    public ResponseEntity<TagAssignment> applyTag(
            @PathVariable UUID animalId,
            @Valid @RequestBody TagApplicationRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        TagAssignment assignment = tagService.applyTag(animalId, req, callerId);
        return ResponseEntity.status(HttpStatus.CREATED).body(assignment);
    }

    @PutMapping("/{animalId}/tags/replace")
    public ResponseEntity<TagAssignment> replaceTag(
            @PathVariable UUID animalId,
            @Valid @RequestBody TagReplacementRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        TagAssignment assignment = tagService.replaceTag(animalId, req, callerId);
        return ResponseEntity.ok(assignment);
    }

    @GetMapping("/{animalId}/tags")
    public ResponseEntity<List<TagAssignment>> listTags(@PathVariable UUID animalId) {
        return ResponseEntity.ok(tagService.listAssignments(animalId));
    }

    // Lifecycle events

    @PostMapping("/{animalId}/death")
    public ResponseEntity<Void> notifyDeath(
            @PathVariable UUID animalId,
            @Valid @RequestBody DeathNotificationRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        lifecycleService.notifyDeath(animalId, req, callerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{animalId}/slaughter")
    public ResponseEntity<Void> notifySlaughter(
            @PathVariable UUID animalId,
            @Valid @RequestBody SlaughterNotificationRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        lifecycleService.notifySlaughter(animalId, req, callerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{animalId}/export")
    public ResponseEntity<Void> declareExport(
            @PathVariable UUID animalId,
            @Valid @RequestBody ExportDeclarationRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        lifecycleService.declareExport(animalId, req, callerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{animalId}/confiscation")
    @PreAuthorize("hasRole('ENFORCEMENT_OFFICER') or hasRole('ADMIN')")
    public ResponseEntity<Void> confiscate(
            @PathVariable UUID animalId,
            @Valid @RequestBody ConfiscationRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        lifecycleService.confiscate(animalId, req, callerId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{animalId}/confiscation")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> releaseConfiscation(
            @PathVariable UUID animalId,
            @RequestParam(defaultValue = "") String releaseReason,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        lifecycleService.releaseConfiscation(animalId, releaseReason, callerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{animalId}/owner-transfer")
    public ResponseEntity<AnimalResponse> transferOwner(
            @PathVariable UUID animalId,
            @Valid @RequestBody OwnerTransferRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        AnimalRecord animal = lifecycleService.transferOwner(animalId, req, callerId);
        return ResponseEntity.ok(AnimalResponse.from(animal));
    }
}
