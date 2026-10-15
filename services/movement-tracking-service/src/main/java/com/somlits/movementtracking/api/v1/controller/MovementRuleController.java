package com.somlits.movementtracking.api.v1.controller;

import com.somlits.movementtracking.api.v1.dto.request.CreateMovementRuleRequest;
import com.somlits.movementtracking.api.v1.dto.response.MovementRuleResponse;
import com.somlits.movementtracking.application.MovementRuleService;
import com.somlits.movementtracking.domain.enums.DestinationType;
import com.somlits.movementtracking.domain.enums.MovementPurpose;
import com.somlits.movementtracking.domain.repository.MovementRuleRepository;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/internal/v1/movement-rules")
public class MovementRuleController {

    private final MovementRuleService ruleService;
    private final MovementRuleRepository ruleRepo;

    public MovementRuleController(MovementRuleService ruleService, MovementRuleRepository ruleRepo) {
        this.ruleService = ruleService;
        this.ruleRepo = ruleRepo;
    }

    @PostMapping
    @PreAuthorize("hasRole('MINISTRY_OFFICER')")
    public ResponseEntity<MovementRuleResponse> create(
            @Valid @RequestBody CreateMovementRuleRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        var rule = ruleService.create(
                req.getRuleCode(),
                req.getOriginPremisesType(),
                DestinationType.valueOf(req.getDestinationType()),
                MovementPurpose.valueOf(req.getMovementPurpose()),
                req.isPermitted(),
                req.isRequiresVetReview(),
                req.getPermitValidityHours(),
                req.isMixedSpeciesAllowed(),
                req.isCrossBorder(),
                null,
                callerId);
        return ResponseEntity.status(HttpStatus.CREATED).body(MovementRuleResponse.from(rule));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MINISTRY_OFFICER')")
    public ResponseEntity<MovementRuleResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateMovementRuleRequest req) {
        var rule = ruleService.update(id, req.isPermitted(), req.isRequiresVetReview(),
                req.getPermitValidityHours(), req.isMixedSpeciesAllowed(), null);
        return ResponseEntity.ok(MovementRuleResponse.from(rule));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MINISTRY_OFFICER')")
    public ResponseEntity<Void> deactivate(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        ruleService.deactivate(id, callerId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<MovementRuleResponse>> listActive() {
        return ResponseEntity.ok(
                ruleRepo.findByActiveTrue().stream()
                        .map(MovementRuleResponse::from)
                        .collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MovementRuleResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(MovementRuleResponse.from(ruleService.getById(id)));
    }
}
