package com.somlits.reporting.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "animal_summary_view")
public class AnimalSummaryView {

    @Id
    private UUID id;

    @Column(name = "animal_code", nullable = false, length = 30)
    private String animalCode;

    @Column(name = "species", length = 30)
    private String species;

    @Column(name = "sex", length = 10)
    private String sex;

    @Column(name = "status", length = 30)
    private String status;

    @Column(name = "current_owner_id")
    private UUID currentOwnerId;

    @Column(name = "current_owner_code", length = 20)
    private String currentOwnerCode;

    @Column(name = "current_premises_id")
    private UUID currentPremisesId;

    @Column(name = "current_premises_code", length = 20)
    private String currentPremisesCode;

    @Column(name = "region_code", length = 50)
    private String regionCode;

    @Column(name = "district_code", length = 50)
    private String districtCode;

    @Column(name = "registered_at")
    private Instant registeredAt;

    @Column(name = "last_updated_at")
    private Instant lastUpdatedAt;

    protected AnimalSummaryView() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getAnimalCode() { return animalCode; }
    public void setAnimalCode(String animalCode) { this.animalCode = animalCode; }
    public String getSpecies() { return species; }
    public void setSpecies(String species) { this.species = species; }
    public String getSex() { return sex; }
    public void setSex(String sex) { this.sex = sex; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public UUID getCurrentOwnerId() { return currentOwnerId; }
    public void setCurrentOwnerId(UUID currentOwnerId) { this.currentOwnerId = currentOwnerId; }
    public String getCurrentOwnerCode() { return currentOwnerCode; }
    public void setCurrentOwnerCode(String currentOwnerCode) { this.currentOwnerCode = currentOwnerCode; }
    public UUID getCurrentPremisesId() { return currentPremisesId; }
    public void setCurrentPremisesId(UUID currentPremisesId) { this.currentPremisesId = currentPremisesId; }
    public String getCurrentPremisesCode() { return currentPremisesCode; }
    public void setCurrentPremisesCode(String currentPremisesCode) { this.currentPremisesCode = currentPremisesCode; }
    public String getRegionCode() { return regionCode; }
    public void setRegionCode(String regionCode) { this.regionCode = regionCode; }
    public String getDistrictCode() { return districtCode; }
    public void setDistrictCode(String districtCode) { this.districtCode = districtCode; }
    public Instant getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(Instant registeredAt) { this.registeredAt = registeredAt; }
    public Instant getLastUpdatedAt() { return lastUpdatedAt; }
    public void setLastUpdatedAt(Instant lastUpdatedAt) { this.lastUpdatedAt = lastUpdatedAt; }
}
