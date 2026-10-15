package com.somlits.movementtracking.api.v1.controller;

import com.somlits.movementtracking.api.v1.dto.request.ConfirmArrivalRequest;
import com.somlits.movementtracking.api.v1.dto.request.ConfirmDepartureRequest;
import com.somlits.movementtracking.api.v1.dto.request.CreateMovementRequest;
import com.somlits.movementtracking.api.v1.dto.request.RecordCheckpointRequest;
import com.somlits.movementtracking.api.v1.dto.request.RecordIllegalMovementRequest;
import com.somlits.movementtracking.api.v1.dto.request.ReviewMovementRequest;
import com.somlits.movementtracking.api.v1.dto.response.MovementAnimalResponse;
import com.somlits.movementtracking.api.v1.dto.response.MovementCheckpointResponse;
import com.somlits.movementtracking.api.v1.dto.response.MovementResponse;
import com.somlits.movementtracking.api.v1.dto.response.MovementSummaryResponse;
import com.somlits.movementtracking.application.ArrivalService;
import com.somlits.movementtracking.application.CheckpointService;
import com.somlits.movementtracking.application.DepartureService;
import com.somlits.movementtracking.application.MovementApplicationService;
import com.somlits.movementtracking.domain.enums.DestinationType;
import com.somlits.movementtracking.domain.enums.MovementExceptionType;
import com.somlits.movementtracking.domain.enums.MovementInitiatorRole;
import com.somlits.movementtracking.domain.enums.MovementPurpose;
import com.somlits.movementtracking.domain.enums.MovementStatus;
import com.somlits.movementtracking.domain.repository.MovementAnimalRepository;
import com.somlits.movementtracking.domain.repository.MovementRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
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

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/internal/v1/movements")
public class MovementController {

    private final MovementApplicationService movementService;
    private final DepartureService departureService;
    private final ArrivalService arrivalService;
    private final CheckpointService checkpointService;
    private final MovementAnimalRepository animalRepo;
    private final MovementRepository movementRepo;

    public MovementController(MovementApplicationService movementService,
                               DepartureService departureService,
                               ArrivalService arrivalService,
                               CheckpointService checkpointService,
                               MovementAnimalRepository animalRepo,
                               MovementRepository movementRepo) {
        this.movementService = movementService;
        this.departureService = departureService;
        this.arrivalService = arrivalService;
        this.checkpointService = checkpointService;
        this.animalRepo = animalRepo;
        this.movementRepo = movementRepo;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER','TRADER','MARKET_OPERATOR','EXPORTER','VETERINARY_OFFICER','MINISTRY_OFFICER')")
    public ResponseEntity<MovementResponse> createDraft(
            @Valid @RequestBody CreateMovementRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        String role = jwt.getClaimAsString("preferred_username");

        List<MovementApplicationService.AnimalRef> animals = req.getAnimals().stream()
                .map(a -> new MovementApplicationService.AnimalRef(
                        a.getAnimalId(), a.getAnimalCode(), a.getTagSerial(), a.getSpecies()))
                .collect(Collectors.toList());

        var movement = movementService.createDraft(
                req.getIdempotencyKey(),
                MovementInitiatorRole.valueOf(req.getInitiatorRole()),
                callerId,
                req.getOnBehalfOfOwnerId(),
                req.getOriginPremisesId(),
                req.getOriginPremisesType(),
                req.getDestinationPremisesId(),
                DestinationType.valueOf(req.getDestinationType()),
                req.getDestinationName(),
                req.getDestinationRegion(),
                req.getDestinationDistrict(),
                req.getDestinationCountry(),
                MovementPurpose.valueOf(req.getMovementPurpose()),
                animals,
                req.getVehicleRegistration(),
                req.getTransporterName(),
                req.getTransporterLicence(),
                req.getPlannedDepartureAt(),
                req.getPlannedArrivalAt(),
                req.getRouteDescription(),
                req.isEmergency(),
                req.getEmergencyReason(),
                req.isCrossBorder());

        return ResponseEntity.status(HttpStatus.CREATED).body(MovementResponse.from(movement));
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('OWNER','TRADER','MARKET_OPERATOR','EXPORTER','VETERINARY_OFFICER','MINISTRY_OFFICER')")
    public ResponseEntity<MovementResponse> submit(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        String role = jwt.getClaimAsString("preferred_username");
        var movement = movementService.submit(id, callerId, role);
        return ResponseEntity.ok(MovementResponse.from(movement));
    }

    @PostMapping("/{id}/vet-approve")
    @PreAuthorize("hasRole('VETERINARY_OFFICER')")
    public ResponseEntity<MovementResponse> vetApprove(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewMovementRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID vetId = UUID.fromString(jwt.getSubject());
        var movement = movementService.vetApprove(id, vetId, req.getNotes());
        return ResponseEntity.ok(MovementResponse.from(movement));
    }

    @PostMapping("/{id}/vet-reject")
    @PreAuthorize("hasRole('VETERINARY_OFFICER')")
    public ResponseEntity<MovementResponse> vetReject(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewMovementRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID vetId = UUID.fromString(jwt.getSubject());
        var movement = movementService.vetReject(id, vetId, req.getNotes());
        return ResponseEntity.ok(MovementResponse.from(movement));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('OWNER','TRADER','MINISTRY_OFFICER')")
    public ResponseEntity<MovementResponse> cancel(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewMovementRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        String role = jwt.getClaimAsString("preferred_username");
        var movement = movementService.cancel(id, callerId, role, req.getNotes());
        return ResponseEntity.ok(MovementResponse.from(movement));
    }

    @PostMapping("/{id}/confirm-departure")
    @PreAuthorize("hasAnyRole('OWNER','TRADER','MARKET_OPERATOR','EXPORTER','CHECKPOINT_OFFICER')")
    public ResponseEntity<MovementResponse> confirmDeparture(
            @PathVariable UUID id,
            @Valid @RequestBody ConfirmDepartureRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        String role = jwt.getClaimAsString("preferred_username");
        var movement = departureService.confirmDeparture(id, callerId, role,
                req.getActualDepartureAt(), req.getVehicleRegistration(),
                req.getTransporterName(), req.isOffline());
        return ResponseEntity.ok(MovementResponse.from(movement));
    }

    @PostMapping("/{id}/checkpoints")
    @PreAuthorize("hasAnyRole('CHECKPOINT_OFFICER','MINISTRY_OFFICER')")
    public ResponseEntity<MovementCheckpointResponse> recordCheckpoint(
            @PathVariable UUID id,
            @Valid @RequestBody RecordCheckpointRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        var checkpoint = checkpointService.record(id, req.getOfficerId(), req.getOfficerName(),
                req.getCheckpointName(), req.getCheckpointRegion(),
                req.getAnimalsVerifiedCount(), req.isPermitVerified(),
                req.isAnomalyNoted(), req.getAnomalyNotes(), req.isOffline());
        return ResponseEntity.status(HttpStatus.CREATED).body(MovementCheckpointResponse.from(checkpoint));
    }

    @PostMapping("/{id}/confirm-arrival")
    @PreAuthorize("hasAnyRole('OWNER','TRADER','MARKET_OPERATOR','EXPORTER','VETERINARY_OFFICER','MINISTRY_OFFICER')")
    public ResponseEntity<MovementResponse> confirmArrival(
            @PathVariable UUID id,
            @Valid @RequestBody ConfirmArrivalRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        String role = jwt.getClaimAsString("preferred_username");

        if (req.isFull()) {
            var movement = arrivalService.confirmFullArrival(id, callerId, role,
                    req.getActualArrivalAt(), req.isOffline());
            return ResponseEntity.ok(MovementResponse.from(movement));
        }

        List<ArrivalService.ArrivedAnimal> arrivedAnimals = req.getArrivedAnimals() == null
                ? List.of()
                : req.getArrivedAnimals().stream()
                        .map(a -> new ArrivalService.ArrivedAnimal(a.getAnimalId(), a.getArrivedTagSerial()))
                        .collect(Collectors.toList());

        List<ArrivalService.ExceptionReport> exceptions = req.getExceptions() == null
                ? List.of()
                : req.getExceptions().stream()
                        .map(e -> new ArrivalService.ExceptionReport(
                                MovementExceptionType.valueOf(e.getType()),
                                e.getAnimalId(), e.getAnimalCode(),
                                e.getTagSerialFound(), e.getNotes()))
                        .collect(Collectors.toList());

        var movement = arrivalService.confirmPartialArrival(id, callerId, role,
                req.getActualArrivalAt(), arrivedAnimals, exceptions, req.isOffline());
        return ResponseEntity.ok(MovementResponse.from(movement));
    }

    @PostMapping("/{id}/open-investigation")
    @PreAuthorize("hasRole('MINISTRY_OFFICER')")
    public ResponseEntity<Void> openInvestigation(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID officerId = UUID.fromString(jwt.getSubject());
        arrivalService.openInvestigation(id, officerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/flag-illegal")
    @PreAuthorize("hasRole('MINISTRY_OFFICER')")
    public ResponseEntity<MovementResponse> flagIllegal(
            @PathVariable UUID id,
            @Valid @RequestBody RecordIllegalMovementRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID officerId = UUID.fromString(jwt.getSubject());
        var movement = movementService.recordIllegalMovement(id, req.getNotes(), officerId);
        return ResponseEntity.ok(MovementResponse.from(movement));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MovementResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(MovementResponse.from(movementService.getById(id)));
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<MovementResponse> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(MovementResponse.from(movementService.getByCode(code)));
    }

    @GetMapping
    public ResponseEntity<Page<MovementSummaryResponse>> list(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        if (status != null) {
            return ResponseEntity.ok(
                    movementService.listByStatus(MovementStatus.valueOf(status), pageable)
                            .map(MovementSummaryResponse::from));
        }
        return ResponseEntity.ok(
                movementRepo.findAll(pageable).map(MovementSummaryResponse::from));
    }

    @GetMapping("/{id}/animals")
    public ResponseEntity<List<MovementAnimalResponse>> listAnimals(@PathVariable UUID id) {
        return ResponseEntity.ok(
                animalRepo.findByMovementId(id).stream()
                        .map(MovementAnimalResponse::from)
                        .collect(Collectors.toList()));
    }

    @GetMapping("/{id}/checkpoints")
    public ResponseEntity<List<MovementCheckpointResponse>> listCheckpoints(@PathVariable UUID id) {
        return ResponseEntity.ok(
                checkpointService.listForMovement(id).stream()
                        .map(MovementCheckpointResponse::from)
                        .collect(Collectors.toList()));
    }
}
