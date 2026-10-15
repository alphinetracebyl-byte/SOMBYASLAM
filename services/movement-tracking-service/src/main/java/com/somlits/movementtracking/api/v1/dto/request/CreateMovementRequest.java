package com.somlits.movementtracking.api.v1.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class CreateMovementRequest {

    @NotBlank
    private String idempotencyKey;

    @NotBlank
    private String initiatorRole;

    private UUID onBehalfOfOwnerId;

    @NotNull
    private UUID originPremisesId;

    @NotBlank
    private String originPremisesType;

    private UUID destinationPremisesId;

    @NotBlank
    private String destinationType;

    @NotBlank
    @Size(max = 200)
    private String destinationName;

    @Size(max = 60)
    private String destinationRegion;

    @Size(max = 100)
    private String destinationDistrict;

    @Size(max = 60)
    private String destinationCountry;

    @NotBlank
    private String movementPurpose;

    @NotEmpty
    @Valid
    private List<AnimalRefDto> animals;

    @Size(max = 30)
    private String vehicleRegistration;

    @Size(max = 150)
    private String transporterName;

    @Size(max = 50)
    private String transporterLicence;

    @NotNull
    private Instant plannedDepartureAt;

    private Instant plannedArrivalAt;

    @Size(max = 500)
    private String routeDescription;

    private boolean emergency;
    private String emergencyReason;
    private boolean crossBorder;

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String v) { this.idempotencyKey = v; }
    public String getInitiatorRole() { return initiatorRole; }
    public void setInitiatorRole(String v) { this.initiatorRole = v; }
    public UUID getOnBehalfOfOwnerId() { return onBehalfOfOwnerId; }
    public void setOnBehalfOfOwnerId(UUID v) { this.onBehalfOfOwnerId = v; }
    public UUID getOriginPremisesId() { return originPremisesId; }
    public void setOriginPremisesId(UUID v) { this.originPremisesId = v; }
    public String getOriginPremisesType() { return originPremisesType; }
    public void setOriginPremisesType(String v) { this.originPremisesType = v; }
    public UUID getDestinationPremisesId() { return destinationPremisesId; }
    public void setDestinationPremisesId(UUID v) { this.destinationPremisesId = v; }
    public String getDestinationType() { return destinationType; }
    public void setDestinationType(String v) { this.destinationType = v; }
    public String getDestinationName() { return destinationName; }
    public void setDestinationName(String v) { this.destinationName = v; }
    public String getDestinationRegion() { return destinationRegion; }
    public void setDestinationRegion(String v) { this.destinationRegion = v; }
    public String getDestinationDistrict() { return destinationDistrict; }
    public void setDestinationDistrict(String v) { this.destinationDistrict = v; }
    public String getDestinationCountry() { return destinationCountry; }
    public void setDestinationCountry(String v) { this.destinationCountry = v; }
    public String getMovementPurpose() { return movementPurpose; }
    public void setMovementPurpose(String v) { this.movementPurpose = v; }
    public List<AnimalRefDto> getAnimals() { return animals; }
    public void setAnimals(List<AnimalRefDto> v) { this.animals = v; }
    public String getVehicleRegistration() { return vehicleRegistration; }
    public void setVehicleRegistration(String v) { this.vehicleRegistration = v; }
    public String getTransporterName() { return transporterName; }
    public void setTransporterName(String v) { this.transporterName = v; }
    public String getTransporterLicence() { return transporterLicence; }
    public void setTransporterLicence(String v) { this.transporterLicence = v; }
    public Instant getPlannedDepartureAt() { return plannedDepartureAt; }
    public void setPlannedDepartureAt(Instant v) { this.plannedDepartureAt = v; }
    public Instant getPlannedArrivalAt() { return plannedArrivalAt; }
    public void setPlannedArrivalAt(Instant v) { this.plannedArrivalAt = v; }
    public String getRouteDescription() { return routeDescription; }
    public void setRouteDescription(String v) { this.routeDescription = v; }
    public boolean isEmergency() { return emergency; }
    public void setEmergency(boolean v) { this.emergency = v; }
    public String getEmergencyReason() { return emergencyReason; }
    public void setEmergencyReason(String v) { this.emergencyReason = v; }
    public boolean isCrossBorder() { return crossBorder; }
    public void setCrossBorder(boolean v) { this.crossBorder = v; }

    public static class AnimalRefDto {
        @NotNull
        private UUID animalId;
        @NotBlank
        private String animalCode;
        @NotBlank
        private String tagSerial;
        @NotBlank
        private String species;

        public UUID getAnimalId() { return animalId; }
        public void setAnimalId(UUID v) { this.animalId = v; }
        public String getAnimalCode() { return animalCode; }
        public void setAnimalCode(String v) { this.animalCode = v; }
        public String getTagSerial() { return tagSerial; }
        public void setTagSerial(String v) { this.tagSerial = v; }
        public String getSpecies() { return species; }
        public void setSpecies(String v) { this.species = v; }
    }
}
