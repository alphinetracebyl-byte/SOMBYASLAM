package com.somlits.movementtracking.domain.model;

import com.somlits.movementtracking.domain.enums.DestinationType;
import com.somlits.movementtracking.domain.enums.MovementInitiatorRole;
import com.somlits.movementtracking.domain.enums.MovementPurpose;
import com.somlits.movementtracking.domain.enums.MovementStatus;
import com.somlits.movementtracking.domain.exception.BusinessRuleViolationException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "movement")
public class Movement {

    private static final String ERR_IMMUTABLE = "ERR-MT-001";
    private static final String ERR_WRONG_STATUS = "ERR-MT-002";

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "movement_code", nullable = false, unique = true, length = 30, updatable = false)
    private String movementCode;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 80, updatable = false)
    private String idempotencyKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private MovementStatus status = MovementStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "initiator_role", nullable = false, length = 40)
    private MovementInitiatorRole initiatorRole;

    @Column(name = "initiator_id", nullable = false)
    private UUID initiatorId;

    @Column(name = "on_behalf_of_owner_id")
    private UUID onBehalfOfOwnerId;

    @Column(name = "origin_premises_id", nullable = false)
    private UUID originPremisesId;

    @Column(name = "origin_premises_type", nullable = false, length = 40)
    private String originPremisesType;

    @Column(name = "destination_premises_id")
    private UUID destinationPremisesId;

    @Enumerated(EnumType.STRING)
    @Column(name = "destination_type", nullable = false, length = 40)
    private DestinationType destinationType;

    @Column(name = "destination_name", nullable = false, length = 200)
    private String destinationName;

    @Column(name = "destination_region", length = 60)
    private String destinationRegion;

    @Column(name = "destination_district", length = 100)
    private String destinationDistrict;

    @Column(name = "destination_country", length = 60)
    private String destinationCountry;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_purpose", nullable = false, length = 40)
    private MovementPurpose movementPurpose;

    @Column(name = "movement_rule_id")
    private UUID movementRuleId;

    @Column(name = "animal_count", nullable = false)
    private int animalCount;

    @Column(name = "vehicle_registration", length = 30)
    private String vehicleRegistration;

    @Column(name = "transporter_name", length = 150)
    private String transporterName;

    @Column(name = "transporter_licence", length = 50)
    private String transporterLicence;

    @Column(name = "planned_departure_at")
    private Instant plannedDepartureAt;

    @Column(name = "planned_arrival_at")
    private Instant plannedArrivalAt;

    @Column(name = "route_description", length = 500)
    private String routeDescription;

    @Column(name = "is_emergency", nullable = false)
    private boolean isEmergency = false;

    @Column(name = "emergency_reason", length = 300)
    private String emergencyReason;

    @Column(name = "is_cross_border", nullable = false)
    private boolean isCrossBorder = false;

    @Column(name = "is_illegal_movement", nullable = false)
    private boolean isIllegalMovement = false;

    @Column(name = "illegal_movement_notes", length = 500)
    private String illegalMovementNotes;

    @Column(name = "vet_reviewer_id")
    private UUID vetReviewerId;

    @Column(name = "vet_review_notes", length = 500)
    private String vetReviewNotes;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "permit_number", unique = true, length = 40)
    private String permitNumber;

    @Column(name = "permit_issued_at")
    private Instant permitIssuedAt;

    @Column(name = "permit_valid_until")
    private Instant permitValidUntil;

    @Column(name = "actual_departure_at")
    private Instant actualDepartureAt;

    @Column(name = "actual_arrival_at")
    private Instant actualArrivalAt;

    @Column(name = "arrived_count")
    private Integer arrivedCount;

    @Column(name = "missing_count")
    private Integer missingCount;

    @Column(name = "offline_departure", nullable = false)
    private boolean offlineDeparture = false;

    @Column(name = "offline_arrival", nullable = false)
    private boolean offlineArrival = false;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

    public static Movement create(String movementCode, String idempotencyKey,
                                   MovementInitiatorRole initiatorRole, UUID initiatorId,
                                   UUID onBehalfOfOwnerId, UUID originPremisesId,
                                   String originPremisesType, UUID destinationPremisesId,
                                   DestinationType destinationType, String destinationName,
                                   String destinationRegion, String destinationDistrict,
                                   String destinationCountry, MovementPurpose purpose,
                                   UUID movementRuleId, int animalCount,
                                   String vehicleRegistration, String transporterName,
                                   String transporterLicence, Instant plannedDepartureAt,
                                   Instant plannedArrivalAt, String routeDescription,
                                   boolean isEmergency, String emergencyReason,
                                   boolean isCrossBorder) {
        var m = new Movement();
        m.id = UUID.randomUUID();
        m.movementCode = movementCode;
        m.idempotencyKey = idempotencyKey;
        m.status = MovementStatus.DRAFT;
        m.initiatorRole = initiatorRole;
        m.initiatorId = initiatorId;
        m.onBehalfOfOwnerId = onBehalfOfOwnerId;
        m.originPremisesId = originPremisesId;
        m.originPremisesType = originPremisesType;
        m.destinationPremisesId = destinationPremisesId;
        m.destinationType = destinationType;
        m.destinationName = destinationName;
        m.destinationRegion = destinationRegion;
        m.destinationDistrict = destinationDistrict;
        m.destinationCountry = destinationCountry;
        m.movementPurpose = purpose;
        m.movementRuleId = movementRuleId;
        m.animalCount = animalCount;
        m.vehicleRegistration = vehicleRegistration;
        m.transporterName = transporterName;
        m.transporterLicence = transporterLicence;
        m.plannedDepartureAt = plannedDepartureAt;
        m.plannedArrivalAt = plannedArrivalAt;
        m.routeDescription = routeDescription;
        m.isEmergency = isEmergency;
        m.emergencyReason = emergencyReason;
        m.isCrossBorder = isCrossBorder;
        m.createdAt = Instant.now();
        m.updatedAt = Instant.now();
        return m;
    }

    public void submit() {
        requireStatus(MovementStatus.DRAFT, "submit");
        this.status = MovementStatus.SUBMITTED;
        this.updatedAt = Instant.now();
    }

    public void routeForVetReview() {
        requireStatus(MovementStatus.SUBMITTED, "route for vet review");
        this.status = MovementStatus.UNDER_REVIEW;
        this.updatedAt = Instant.now();
    }

    public void approve(UUID vetReviewerId, String vetNotes) {
        if (this.status != MovementStatus.SUBMITTED && this.status != MovementStatus.UNDER_REVIEW) {
            throw new BusinessRuleViolationException(ERR_WRONG_STATUS,
                    "Cannot approve a movement in status " + this.status);
        }
        this.vetReviewerId = vetReviewerId;
        this.vetReviewNotes = vetNotes;
        this.status = MovementStatus.APPROVED;
        this.updatedAt = Instant.now();
    }

    public void reject(UUID vetReviewerId, String reason) {
        if (this.status != MovementStatus.SUBMITTED && this.status != MovementStatus.UNDER_REVIEW) {
            throw new BusinessRuleViolationException(ERR_WRONG_STATUS,
                    "Cannot reject a movement in status " + this.status);
        }
        this.vetReviewerId = vetReviewerId;
        this.rejectionReason = reason;
        this.status = MovementStatus.REJECTED;
        this.updatedAt = Instant.now();
    }

    public void issuePermit(String permitNumber, int validityHours) {
        requireStatus(MovementStatus.APPROVED, "issue permit");
        this.permitNumber = permitNumber;
        this.permitIssuedAt = Instant.now();
        this.permitValidUntil = this.permitIssuedAt.plusSeconds((long) validityHours * 3600);
        this.status = MovementStatus.PERMIT_ISSUED;
        this.updatedAt = Instant.now();
    }

    public void confirmDeparture(Instant actualDeparture, String vehicleReg,
                                  String transporterName, boolean offline) {
        requireStatus(MovementStatus.PERMIT_ISSUED, "confirm departure");
        assertPermitValid();
        this.actualDepartureAt = actualDeparture != null ? actualDeparture : Instant.now();
        if (vehicleReg != null) this.vehicleRegistration = vehicleReg;
        if (transporterName != null) this.transporterName = transporterName;
        this.offlineDeparture = offline;
        this.status = MovementStatus.DEPARTURE_CONFIRMED;
        this.updatedAt = Instant.now();
    }

    public void recordCheckpointPass() {
        if (this.status != MovementStatus.DEPARTURE_CONFIRMED
                && this.status != MovementStatus.IN_TRANSIT) {
            throw new BusinessRuleViolationException(ERR_WRONG_STATUS,
                    "Cannot record checkpoint for movement in status " + this.status);
        }
        this.status = MovementStatus.IN_TRANSIT;
        this.updatedAt = Instant.now();
    }

    public void confirmArrivalFull(Instant actualArrival, boolean offline) {
        requireInTransitOrDeparted("confirm arrival");
        this.actualArrivalAt = actualArrival != null ? actualArrival : Instant.now();
        this.arrivedCount = this.animalCount;
        this.missingCount = 0;
        this.offlineArrival = offline;
        this.status = MovementStatus.ARRIVAL_CONFIRMED;
        this.updatedAt = Instant.now();
    }

    public void confirmArrivalPartial(int arrivedCount, Instant actualArrival, boolean offline) {
        requireInTransitOrDeparted("confirm partial arrival");
        if (arrivedCount >= this.animalCount) {
            throw new BusinessRuleViolationException("ERR-MT-003",
                    "Arrived count " + arrivedCount + " equals or exceeds expected " + this.animalCount
                            + ". Use full arrival confirmation.");
        }
        this.arrivedCount = arrivedCount;
        this.missingCount = this.animalCount - arrivedCount;
        this.actualArrivalAt = actualArrival != null ? actualArrival : Instant.now();
        this.offlineArrival = offline;
        this.status = MovementStatus.ARRIVAL_PARTIALLY_CONFIRMED;
        this.updatedAt = Instant.now();
    }

    public void complete() {
        if (this.status != MovementStatus.ARRIVAL_CONFIRMED
                && this.status != MovementStatus.ARRIVAL_PARTIALLY_CONFIRMED) {
            throw new BusinessRuleViolationException(ERR_WRONG_STATUS,
                    "Cannot complete a movement in status " + this.status);
        }
        this.status = MovementStatus.COMPLETED;
        this.completedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void openInvestigation() {
        requireStatus(MovementStatus.ARRIVAL_PARTIALLY_CONFIRMED, "open investigation");
        this.status = MovementStatus.INVESTIGATED;
        this.updatedAt = Instant.now();
    }

    public void cancel(String reason) {
        if (isTerminal()) {
            throw new BusinessRuleViolationException(ERR_IMMUTABLE,
                    "Cannot cancel a movement in terminal status " + this.status);
        }
        this.rejectionReason = reason;
        this.status = MovementStatus.CANCELLED;
        this.updatedAt = Instant.now();
    }

    public void expire() {
        if (this.status == MovementStatus.PERMIT_ISSUED || this.status == MovementStatus.APPROVED) {
            this.status = MovementStatus.EXPIRED;
            this.updatedAt = Instant.now();
        }
    }

    public boolean isPermitValid() {
        return permitValidUntil != null && Instant.now().isBefore(permitValidUntil);
    }

    public boolean isTerminal() {
        return status == MovementStatus.COMPLETED
                || status == MovementStatus.CANCELLED
                || status == MovementStatus.EXPIRED;
    }

    private void assertPermitValid() {
        if (!isPermitValid()) {
            throw new BusinessRuleViolationException("ERR-MT-004",
                    "Movement permit " + permitNumber + " has expired.");
        }
    }

    private void requireStatus(MovementStatus required, String operation) {
        if (this.status != required) {
            throw new BusinessRuleViolationException(ERR_WRONG_STATUS,
                    "Cannot " + operation + " — movement is in status " + this.status
                            + ", expected " + required);
        }
    }

    private void requireInTransitOrDeparted(String operation) {
        if (this.status != MovementStatus.DEPARTURE_CONFIRMED
                && this.status != MovementStatus.IN_TRANSIT) {
            throw new BusinessRuleViolationException(ERR_WRONG_STATUS,
                    "Cannot " + operation + " — movement is in status " + this.status);
        }
    }

    // ── Getters ──────────────────────────────────────────────────────────────
    public UUID getId() { return id; }
    public String getMovementCode() { return movementCode; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public MovementStatus getStatus() { return status; }
    public MovementInitiatorRole getInitiatorRole() { return initiatorRole; }
    public UUID getInitiatorId() { return initiatorId; }
    public UUID getOnBehalfOfOwnerId() { return onBehalfOfOwnerId; }
    public UUID getOriginPremisesId() { return originPremisesId; }
    public String getOriginPremisesType() { return originPremisesType; }
    public UUID getDestinationPremisesId() { return destinationPremisesId; }
    public DestinationType getDestinationType() { return destinationType; }
    public String getDestinationName() { return destinationName; }
    public String getDestinationRegion() { return destinationRegion; }
    public String getDestinationDistrict() { return destinationDistrict; }
    public String getDestinationCountry() { return destinationCountry; }
    public MovementPurpose getMovementPurpose() { return movementPurpose; }
    public UUID getMovementRuleId() { return movementRuleId; }
    public int getAnimalCount() { return animalCount; }
    public String getVehicleRegistration() { return vehicleRegistration; }
    public String getTransporterName() { return transporterName; }
    public String getTransporterLicence() { return transporterLicence; }
    public Instant getPlannedDepartureAt() { return plannedDepartureAt; }
    public Instant getPlannedArrivalAt() { return plannedArrivalAt; }
    public String getRouteDescription() { return routeDescription; }
    public boolean isEmergency() { return isEmergency; }
    public String getEmergencyReason() { return emergencyReason; }
    public boolean isCrossBorder() { return isCrossBorder; }
    public boolean isIllegalMovement() { return isIllegalMovement; }
    public String getIllegalMovementNotes() { return illegalMovementNotes; }
    public UUID getVetReviewerId() { return vetReviewerId; }
    public String getVetReviewNotes() { return vetReviewNotes; }
    public String getRejectionReason() { return rejectionReason; }
    public String getPermitNumber() { return permitNumber; }
    public Instant getPermitIssuedAt() { return permitIssuedAt; }
    public Instant getPermitValidUntil() { return permitValidUntil; }
    public Instant getActualDepartureAt() { return actualDepartureAt; }
    public Instant getActualArrivalAt() { return actualArrivalAt; }
    public Integer getArrivedCount() { return arrivedCount; }
    public Integer getMissingCount() { return missingCount; }
    public boolean isOfflineDeparture() { return offlineDeparture; }
    public boolean isOfflineArrival() { return offlineArrival; }
    public Instant getCompletedAt() { return completedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public int getVersion() { return version; }

    public void setIllegalMovement(boolean flag, String notes) {
        this.isIllegalMovement = flag;
        this.illegalMovementNotes = notes;
        this.updatedAt = Instant.now();
    }
}
