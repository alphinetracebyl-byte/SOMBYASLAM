package com.somlits.reporting.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "health_summary_view")
public class HealthSummaryView {

    @Id
    private UUID id;

    @Column(name = "event_type", length = 40)
    private String eventType;

    @Column(name = "animal_code", length = 30)
    private String animalCode;

    @Column(name = "region_code", length = 50)
    private String regionCode;

    @Column(name = "district_code", length = 50)
    private String districtCode;

    @Column(name = "event_date")
    private LocalDate eventDate;

    @Column(name = "vaccine_product", length = 200)
    private String vaccineProduct;

    @Column(name = "outcome", length = 30)
    private String outcome;

    protected HealthSummaryView() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getAnimalCode() { return animalCode; }
    public void setAnimalCode(String animalCode) { this.animalCode = animalCode; }
    public String getRegionCode() { return regionCode; }
    public void setRegionCode(String regionCode) { this.regionCode = regionCode; }
    public String getDistrictCode() { return districtCode; }
    public void setDistrictCode(String districtCode) { this.districtCode = districtCode; }
    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(LocalDate eventDate) { this.eventDate = eventDate; }
    public String getVaccineProduct() { return vaccineProduct; }
    public void setVaccineProduct(String vaccineProduct) { this.vaccineProduct = vaccineProduct; }
    public String getOutcome() { return outcome; }
    public void setOutcome(String outcome) { this.outcome = outcome; }
}
