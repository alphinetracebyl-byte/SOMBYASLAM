package com.somlits.premises.api.v1.controller;

import com.somlits.premises.api.v1.dto.request.RegisterPremisesRequest;
import com.somlits.premises.api.v1.dto.request.RejectPremisesRequest;
import com.somlits.premises.api.v1.dto.request.SuspendPremisesRequest;
import com.somlits.premises.api.v1.dto.request.UpdatePremisesRequest;
import com.somlits.premises.api.v1.dto.response.PremisesResponse;
import com.somlits.premises.api.v1.dto.response.PremisesSummaryResponse;
import com.somlits.premises.application.PremisesService;
import com.somlits.premises.application.command.ApprovePremisesCommand;
import com.somlits.premises.application.command.ClosePremisesCommand;
import com.somlits.premises.application.command.ReactivatePremisesCommand;
import com.somlits.premises.application.command.RegisterPremisesCommand;
import com.somlits.premises.application.command.RejectPremisesCommand;
import com.somlits.premises.application.command.SubmitPremisesCommand;
import com.somlits.premises.application.command.SuspendPremisesCommand;
import com.somlits.premises.application.command.UpdatePremisesCommand;
import com.somlits.premises.application.query.GetPremisesByIdQuery;
import com.somlits.premises.application.query.ListPremisesQuery;
import com.somlits.premises.domain.enums.PremisesType;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/internal/v1/premises")
public class PremisesController {

    private final PremisesService premisesService;

    public PremisesController(PremisesService premisesService) {
        this.premisesService = premisesService;
    }

    // ── Register ──────────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<PremisesResponse> register(
            @Valid @RequestBody RegisterPremisesRequest req,
            @AuthenticationPrincipal Jwt jwt) {

        UUID callerId = UUID.fromString(jwt.getSubject());

        RegisterPremisesCommand cmd = new RegisterPremisesCommand(
                PremisesType.valueOf(req.getPremisesType()),
                req.getPremisesName(),
                req.getOwnerId(),
                req.getOwnerCode(),
                req.getRegionCode(),
                req.getDistrictCode(),
                req.getVillageOrSettlement(),
                req.getPhysicalAddress(),
                req.getGpsLatitude(),
                req.getGpsLongitude(),
                req.getAreaHectares(),
                req.getCapacityAnimals(),
                req.getAllowedSpecies(),
                req.getLicenseNumber(),
                req.getLicenseExpiryDate(),
                req.getIsTemporary() != null && req.getIsTemporary(),
                req.getTemporaryEndDate(),
                callerId);

        var premises = premisesService.register(cmd);
        return ResponseEntity
                .created(URI.create("/internal/v1/premises/" + premises.getId()))
                .body(PremisesResponse.from(premises));
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<Page<PremisesSummaryResponse>> list(
            @RequestParam(required = false) UUID ownerId,
            @RequestParam(required = false) String regionCode,
            @RequestParam(required = false) String districtCode,
            @RequestParam(required = false) String premisesType,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        ListPremisesQuery query = new ListPremisesQuery(
                ownerId, regionCode, districtCode, premisesType, status, page, size);
        return ResponseEntity.ok(premisesService.list(query).map(PremisesSummaryResponse::from));
    }

    @GetMapping("/{premisesId}")
    public ResponseEntity<PremisesResponse> getById(@PathVariable UUID premisesId) {
        return ResponseEntity.ok(
                PremisesResponse.from(premisesService.getById(new GetPremisesByIdQuery(premisesId))));
    }

    @GetMapping("/by-code/{premisesCode}")
    public ResponseEntity<PremisesResponse> getByCode(@PathVariable String premisesCode) {
        return ResponseEntity.ok(PremisesResponse.from(premisesService.getByCode(premisesCode)));
    }

    @GetMapping("/by-owner/{ownerId}")
    public ResponseEntity<List<PremisesResponse>> getByOwner(@PathVariable UUID ownerId) {
        List<PremisesResponse> list = premisesService.getByOwner(ownerId)
                .stream()
                .map(PremisesResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    @PatchMapping("/{premisesId}")
    public ResponseEntity<PremisesResponse> update(
            @PathVariable UUID premisesId,
            @Valid @RequestBody UpdatePremisesRequest req,
            @AuthenticationPrincipal Jwt jwt) {

        UUID callerId = UUID.fromString(jwt.getSubject());
        UpdatePremisesCommand cmd = new UpdatePremisesCommand(
                premisesId,
                req.getPremisesName(),
                req.getRegionCode(),
                req.getDistrictCode(),
                req.getVillageOrSettlement(),
                req.getPhysicalAddress(),
                req.getGpsLatitude(),
                req.getGpsLongitude(),
                req.getAreaHectares(),
                req.getCapacityAnimals(),
                req.getAllowedSpecies(),
                req.getLicenseNumber(),
                req.getLicenseExpiryDate(),
                req.getIsTemporary(),
                req.getTemporaryEndDate(),
                req.getOfficerNotes(),
                callerId);

        return ResponseEntity.ok(PremisesResponse.from(premisesService.update(cmd)));
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @PostMapping("/{premisesId}/submit")
    public ResponseEntity<PremisesResponse> submit(
            @PathVariable UUID premisesId,
            @AuthenticationPrincipal Jwt jwt) {

        UUID callerId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(
                PremisesResponse.from(premisesService.submit(new SubmitPremisesCommand(premisesId, callerId))));
    }

    @PostMapping("/{premisesId}/approve")
    public ResponseEntity<PremisesResponse> approve(
            @PathVariable UUID premisesId,
            @AuthenticationPrincipal Jwt jwt) {

        UUID callerId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(
                PremisesResponse.from(premisesService.approve(new ApprovePremisesCommand(premisesId, callerId))));
    }

    @PostMapping("/{premisesId}/reject")
    public ResponseEntity<PremisesResponse> reject(
            @PathVariable UUID premisesId,
            @Valid @RequestBody RejectPremisesRequest req,
            @AuthenticationPrincipal Jwt jwt) {

        UUID callerId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(
                PremisesResponse.from(premisesService.reject(
                        new RejectPremisesCommand(premisesId, req.getReason(), callerId))));
    }

    @PostMapping("/{premisesId}/suspend")
    public ResponseEntity<PremisesResponse> suspend(
            @PathVariable UUID premisesId,
            @Valid @RequestBody SuspendPremisesRequest req,
            @AuthenticationPrincipal Jwt jwt) {

        UUID callerId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(
                PremisesResponse.from(premisesService.suspend(
                        new SuspendPremisesCommand(premisesId, req.getReason(), callerId))));
    }

    @PostMapping("/{premisesId}/reactivate")
    public ResponseEntity<PremisesResponse> reactivate(
            @PathVariable UUID premisesId,
            @AuthenticationPrincipal Jwt jwt) {

        UUID callerId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(
                PremisesResponse.from(premisesService.reactivate(new ReactivatePremisesCommand(premisesId, callerId))));
    }

    @PostMapping("/{premisesId}/close")
    public ResponseEntity<PremisesResponse> close(
            @PathVariable UUID premisesId,
            @AuthenticationPrincipal Jwt jwt) {

        UUID callerId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(
                PremisesResponse.from(premisesService.close(new ClosePremisesCommand(premisesId, callerId))));
    }
}
