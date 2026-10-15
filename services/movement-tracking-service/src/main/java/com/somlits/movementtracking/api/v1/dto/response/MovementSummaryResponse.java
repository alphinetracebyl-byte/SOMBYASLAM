package com.somlits.movementtracking.api.v1.dto.response;

import com.somlits.movementtracking.domain.model.Movement;

import java.time.Instant;
import java.util.UUID;

public class MovementSummaryResponse {

    private UUID id;
    private String movementCode;
    private String status;
    private String movementPurpose;
    private String destinationName;
    private String destinationType;
    private int animalCount;
    private Integer arrivedCount;
    private String permitNumber;
    private Instant plannedDepartureAt;
    private Instant plannedArrivalAt;
    private boolean emergency;
    private boolean crossBorder;
    private Instant createdAt;

    public static MovementSummaryResponse from(Movement m) {
        var r = new MovementSummaryResponse();
        r.id = m.getId();
        r.movementCode = m.getMovementCode();
        r.status = m.getStatus().name();
        r.movementPurpose = m.getMovementPurpose().name();
        r.destinationName = m.getDestinationName();
        r.destinationType = m.getDestinationType().name();
        r.animalCount = m.getAnimalCount();
        r.arrivedCount = m.getArrivedCount();
        r.permitNumber = m.getPermitNumber();
        r.plannedDepartureAt = m.getPlannedDepartureAt();
        r.plannedArrivalAt = m.getPlannedArrivalAt();
        r.emergency = m.isEmergency();
        r.crossBorder = m.isCrossBorder();
        r.createdAt = m.getCreatedAt();
        return r;
    }

    public UUID getId() { return id; }
    public String getMovementCode() { return movementCode; }
    public String getStatus() { return status; }
    public String getMovementPurpose() { return movementPurpose; }
    public String getDestinationName() { return destinationName; }
    public String getDestinationType() { return destinationType; }
    public int getAnimalCount() { return animalCount; }
    public Integer getArrivedCount() { return arrivedCount; }
    public String getPermitNumber() { return permitNumber; }
    public Instant getPlannedDepartureAt() { return plannedDepartureAt; }
    public Instant getPlannedArrivalAt() { return plannedArrivalAt; }
    public boolean isEmergency() { return emergency; }
    public boolean isCrossBorder() { return crossBorder; }
    public Instant getCreatedAt() { return createdAt; }
}
