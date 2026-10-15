package com.somlits.movementtracking.api.v1.dto.response;

import com.somlits.movementtracking.domain.model.Movement;

import java.time.Instant;
import java.util.UUID;

public class MovementResponse {

    private UUID id;
    private String movementCode;
    private String status;
    private String initiatorRole;
    private UUID initiatorId;
    private UUID onBehalfOfOwnerId;
    private UUID originPremisesId;
    private String originPremisesType;
    private UUID destinationPremisesId;
    private String destinationType;
    private String destinationName;
    private String destinationRegion;
    private String destinationDistrict;
    private String destinationCountry;
    private String movementPurpose;
    private UUID movementRuleId;
    private int animalCount;
    private String vehicleRegistration;
    private String transporterName;
    private String transporterLicence;
    private Instant plannedDepartureAt;
    private Instant plannedArrivalAt;
    private String routeDescription;
    private boolean emergency;
    private String emergencyReason;
    private boolean crossBorder;
    private boolean illegalMovement;
    private String illegalMovementNotes;
    private UUID vetReviewerId;
    private String vetReviewNotes;
    private String rejectionReason;
    private String permitNumber;
    private Instant permitIssuedAt;
    private Instant permitValidUntil;
    private Instant actualDepartureAt;
    private Instant actualArrivalAt;
    private Integer arrivedCount;
    private Integer missingCount;
    private boolean offlineDeparture;
    private boolean offlineArrival;
    private Instant completedAt;
    private Instant createdAt;
    private Instant updatedAt;
    private int version;

    public static MovementResponse from(Movement m) {
        var r = new MovementResponse();
        r.id = m.getId();
        r.movementCode = m.getMovementCode();
        r.status = m.getStatus().name();
        r.initiatorRole = m.getInitiatorRole().name();
        r.initiatorId = m.getInitiatorId();
        r.onBehalfOfOwnerId = m.getOnBehalfOfOwnerId();
        r.originPremisesId = m.getOriginPremisesId();
        r.originPremisesType = m.getOriginPremisesType();
        r.destinationPremisesId = m.getDestinationPremisesId();
        r.destinationType = m.getDestinationType().name();
        r.destinationName = m.getDestinationName();
        r.destinationRegion = m.getDestinationRegion();
        r.destinationDistrict = m.getDestinationDistrict();
        r.destinationCountry = m.getDestinationCountry();
        r.movementPurpose = m.getMovementPurpose().name();
        r.movementRuleId = m.getMovementRuleId();
        r.animalCount = m.getAnimalCount();
        r.vehicleRegistration = m.getVehicleRegistration();
        r.transporterName = m.getTransporterName();
        r.transporterLicence = m.getTransporterLicence();
        r.plannedDepartureAt = m.getPlannedDepartureAt();
        r.plannedArrivalAt = m.getPlannedArrivalAt();
        r.routeDescription = m.getRouteDescription();
        r.emergency = m.isEmergency();
        r.emergencyReason = m.getEmergencyReason();
        r.crossBorder = m.isCrossBorder();
        r.illegalMovement = m.isIllegalMovement();
        r.illegalMovementNotes = m.getIllegalMovementNotes();
        r.vetReviewerId = m.getVetReviewerId();
        r.vetReviewNotes = m.getVetReviewNotes();
        r.rejectionReason = m.getRejectionReason();
        r.permitNumber = m.getPermitNumber();
        r.permitIssuedAt = m.getPermitIssuedAt();
        r.permitValidUntil = m.getPermitValidUntil();
        r.actualDepartureAt = m.getActualDepartureAt();
        r.actualArrivalAt = m.getActualArrivalAt();
        r.arrivedCount = m.getArrivedCount();
        r.missingCount = m.getMissingCount();
        r.offlineDeparture = m.isOfflineDeparture();
        r.offlineArrival = m.isOfflineArrival();
        r.completedAt = m.getCompletedAt();
        r.createdAt = m.getCreatedAt();
        r.updatedAt = m.getUpdatedAt();
        r.version = m.getVersion();
        return r;
    }

    public UUID getId() { return id; }
    public String getMovementCode() { return movementCode; }
    public String getStatus() { return status; }
    public String getInitiatorRole() { return initiatorRole; }
    public UUID getInitiatorId() { return initiatorId; }
    public UUID getOnBehalfOfOwnerId() { return onBehalfOfOwnerId; }
    public UUID getOriginPremisesId() { return originPremisesId; }
    public String getOriginPremisesType() { return originPremisesType; }
    public UUID getDestinationPremisesId() { return destinationPremisesId; }
    public String getDestinationType() { return destinationType; }
    public String getDestinationName() { return destinationName; }
    public String getDestinationRegion() { return destinationRegion; }
    public String getDestinationDistrict() { return destinationDistrict; }
    public String getDestinationCountry() { return destinationCountry; }
    public String getMovementPurpose() { return movementPurpose; }
    public UUID getMovementRuleId() { return movementRuleId; }
    public int getAnimalCount() { return animalCount; }
    public String getVehicleRegistration() { return vehicleRegistration; }
    public String getTransporterName() { return transporterName; }
    public String getTransporterLicence() { return transporterLicence; }
    public Instant getPlannedDepartureAt() { return plannedDepartureAt; }
    public Instant getPlannedArrivalAt() { return plannedArrivalAt; }
    public String getRouteDescription() { return routeDescription; }
    public boolean isEmergency() { return emergency; }
    public String getEmergencyReason() { return emergencyReason; }
    public boolean isCrossBorder() { return crossBorder; }
    public boolean isIllegalMovement() { return illegalMovement; }
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
}
