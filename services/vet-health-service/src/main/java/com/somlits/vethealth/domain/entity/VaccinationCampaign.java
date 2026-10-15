package com.somlits.vethealth.domain.entity;

import com.somlits.vethealth.domain.enums.CampaignStatus;
import com.somlits.vethealth.domain.exception.BusinessRuleViolationException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.time.LocalDate;
import java.time.Year;
import java.util.UUID;

@Entity
@Table(name = "vaccination_campaign")
public class VaccinationCampaign {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "campaign_code", nullable = false, unique = true, length = 20, updatable = false)
    private String campaignCode;

    @Column(name = "campaign_name", nullable = false, length = 200)
    private String campaignName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private CampaignStatus status = CampaignStatus.PLANNED;

    @Column(name = "target_species", nullable = false, length = 200)
    private String targetSpecies;

    @Column(name = "target_region_code", nullable = false, length = 50)
    private String targetRegionCode;

    @Column(name = "target_district_code", length = 50)
    private String targetDistrictCode;

    @Column(name = "vaccine_product", nullable = false, length = 200)
    private String vaccineProduct;

    @Column(name = "vaccine_batch_number", nullable = false, length = 100)
    private String vaccineBatchNumber;

    @Column(name = "planned_start_date", nullable = false)
    private LocalDate plannedStartDate;

    @Column(name = "planned_end_date", nullable = false)
    private LocalDate plannedEndDate;

    @Column(name = "actual_start_date")
    private LocalDate actualStartDate;

    @Column(name = "actual_end_date")
    private LocalDate actualEndDate;

    @Column(name = "planned_animal_count", nullable = false)
    private Integer plannedAnimalCount;

    @Column(name = "actual_animal_count", nullable = false)
    private Integer actualAnimalCount = 0;

    @Column(name = "assigned_vet_id")
    private UUID assignedVetId;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

    public static VaccinationCampaign create(String campaignCode, String campaignName,
                                              String targetSpecies, String targetRegionCode,
                                              String targetDistrictCode, String vaccineProduct,
                                              String vaccineBatchNumber, LocalDate plannedStartDate,
                                              LocalDate plannedEndDate, Integer plannedAnimalCount,
                                              UUID assignedVetId, UUID createdBy) {
        var c = new VaccinationCampaign();
        c.id = UUID.randomUUID();
        c.campaignCode = campaignCode;
        c.campaignName = campaignName;
        c.status = CampaignStatus.PLANNED;
        c.targetSpecies = targetSpecies;
        c.targetRegionCode = targetRegionCode;
        c.targetDistrictCode = targetDistrictCode;
        c.vaccineProduct = vaccineProduct;
        c.vaccineBatchNumber = vaccineBatchNumber;
        c.plannedStartDate = plannedStartDate;
        c.plannedEndDate = plannedEndDate;
        c.plannedAnimalCount = plannedAnimalCount;
        c.actualAnimalCount = 0;
        c.assignedVetId = assignedVetId;
        c.createdBy = createdBy;
        c.createdAt = Instant.now();
        return c;
    }

    public static String generateCode(long sequence) {
        return "CAMP-" + Year.now().getValue() + "-" + String.format("%06d", sequence);
    }

    public void start(LocalDate actualStartDate) {
        if (this.status != CampaignStatus.PLANNED) {
            throw new BusinessRuleViolationException("ERR-VH-020",
                    "Only PLANNED campaigns can be started. Current status: " + this.status);
        }
        this.status = CampaignStatus.ACTIVE;
        this.actualStartDate = actualStartDate;
    }

    public void complete(LocalDate actualEndDate, Integer finalAnimalCount) {
        if (this.status != CampaignStatus.ACTIVE) {
            throw new BusinessRuleViolationException("ERR-VH-021",
                    "Only ACTIVE campaigns can be completed. Current status: " + this.status);
        }
        this.status = CampaignStatus.COMPLETED;
        this.actualEndDate = actualEndDate;
        if (finalAnimalCount != null) {
            this.actualAnimalCount = finalAnimalCount;
        }
    }

    public void cancel() {
        if (this.status == CampaignStatus.COMPLETED || this.status == CampaignStatus.CANCELLED) {
            throw new BusinessRuleViolationException("ERR-VH-022",
                    "Cannot cancel a campaign in status: " + this.status);
        }
        this.status = CampaignStatus.CANCELLED;
    }

    public UUID getId() { return id; }
    public String getCampaignCode() { return campaignCode; }
    public String getCampaignName() { return campaignName; }
    public CampaignStatus getStatus() { return status; }
    public String getTargetSpecies() { return targetSpecies; }
    public String getTargetRegionCode() { return targetRegionCode; }
    public String getTargetDistrictCode() { return targetDistrictCode; }
    public String getVaccineProduct() { return vaccineProduct; }
    public String getVaccineBatchNumber() { return vaccineBatchNumber; }
    public LocalDate getPlannedStartDate() { return plannedStartDate; }
    public LocalDate getPlannedEndDate() { return plannedEndDate; }
    public LocalDate getActualStartDate() { return actualStartDate; }
    public LocalDate getActualEndDate() { return actualEndDate; }
    public Integer getPlannedAnimalCount() { return plannedAnimalCount; }
    public Integer getActualAnimalCount() { return actualAnimalCount; }
    public UUID getAssignedVetId() { return assignedVetId; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public int getVersion() { return version; }

    public void setCampaignName(String campaignName) { this.campaignName = campaignName; }
    public void setTargetSpecies(String targetSpecies) { this.targetSpecies = targetSpecies; }
    public void setTargetRegionCode(String targetRegionCode) { this.targetRegionCode = targetRegionCode; }
    public void setTargetDistrictCode(String targetDistrictCode) { this.targetDistrictCode = targetDistrictCode; }
    public void setVaccineProduct(String vaccineProduct) { this.vaccineProduct = vaccineProduct; }
    public void setVaccineBatchNumber(String vaccineBatchNumber) { this.vaccineBatchNumber = vaccineBatchNumber; }
    public void setPlannedStartDate(LocalDate plannedStartDate) { this.plannedStartDate = plannedStartDate; }
    public void setPlannedEndDate(LocalDate plannedEndDate) { this.plannedEndDate = plannedEndDate; }
    public void setPlannedAnimalCount(Integer plannedAnimalCount) { this.plannedAnimalCount = plannedAnimalCount; }
    public void setActualAnimalCount(Integer actualAnimalCount) { this.actualAnimalCount = actualAnimalCount; }
    public void setAssignedVetId(UUID assignedVetId) { this.assignedVetId = assignedVetId; }
}
