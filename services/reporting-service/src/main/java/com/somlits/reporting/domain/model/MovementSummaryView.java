package com.somlits.reporting.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "movement_summary_view")
public class MovementSummaryView {

    @Id
    private UUID id;

    @Column(name = "movement_code", length = 20)
    private String movementCode;

    @Column(name = "status", length = 30)
    private String status;

    @Column(name = "origin_premises_code", length = 20)
    private String originPremisesCode;

    @Column(name = "destination_premises_code", length = 20)
    private String destinationPremisesCode;

    @Column(name = "origin_region", length = 50)
    private String originRegion;

    @Column(name = "destination_region", length = 50)
    private String destinationRegion;

    @Column(name = "purpose", length = 50)
    private String purpose;

    @Column(name = "animal_count")
    private int animalCount;

    @Column(name = "departed_at")
    private Instant departedAt;

    @Column(name = "arrived_at")
    private Instant arrivedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    protected MovementSummaryView() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getMovementCode() { return movementCode; }
    public void setMovementCode(String movementCode) { this.movementCode = movementCode; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getOriginPremisesCode() { return originPremisesCode; }
    public void setOriginPremisesCode(String originPremisesCode) { this.originPremisesCode = originPremisesCode; }
    public String getDestinationPremisesCode() { return destinationPremisesCode; }
    public void setDestinationPremisesCode(String destinationPremisesCode) { this.destinationPremisesCode = destinationPremisesCode; }
    public String getOriginRegion() { return originRegion; }
    public void setOriginRegion(String originRegion) { this.originRegion = originRegion; }
    public String getDestinationRegion() { return destinationRegion; }
    public void setDestinationRegion(String destinationRegion) { this.destinationRegion = destinationRegion; }
    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }
    public int getAnimalCount() { return animalCount; }
    public void setAnimalCount(int animalCount) { this.animalCount = animalCount; }
    public Instant getDepartedAt() { return departedAt; }
    public void setDepartedAt(Instant departedAt) { this.departedAt = departedAt; }
    public Instant getArrivedAt() { return arrivedAt; }
    public void setArrivedAt(Instant arrivedAt) { this.arrivedAt = arrivedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
