package com.somlits.vethealth.domain.entity;

import com.somlits.vethealth.domain.enums.FitnessDecision;
import com.somlits.vethealth.domain.enums.HealthEventStatus;
import com.somlits.vethealth.domain.enums.HealthEventType;
import com.somlits.vethealth.domain.exception.BusinessRuleViolationException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Year;
import java.util.UUID;

@Entity
@Table(name = "health_event")
public class HealthEvent {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "event_code", nullable = false, unique = true, length = 20, updatable = false)
    private String eventCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 40)
    private HealthEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private HealthEventStatus status = HealthEventStatus.RECORDED;

    @Column(name = "animal_id", nullable = false)
    private UUID animalId;

    @Column(name = "animal_code", nullable = false, length = 30)
    private String animalCode;

    @Column(name = "premises_id")
    private UUID premisesId;

    @Column(name = "premises_code", length = 20)
    private String premisesCode;

    @Column(name = "responsible_vet_id", nullable = false)
    private UUID responsibleVetId;

    @Column(name = "responsible_vet_name", nullable = false, length = 200)
    private String responsibleVetName;

    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate;

    @Column(name = "event_time")
    private LocalTime eventTime;

    @Column(name = "diagnosis")
    private String diagnosis;

    @Column(name = "treatment")
    private String treatment;

    @Column(name = "vaccine_product", length = 200)
    private String vaccineProduct;

    @Column(name = "vaccine_batch_number", length = 100)
    private String vaccineBatchNumber;

    @Column(name = "vaccine_expiry_date")
    private LocalDate vaccineExpiryDate;

    @Column(name = "dose_ml", precision = 6, scale = 2)
    private BigDecimal doseMl;

    @Column(name = "route_of_administration", length = 50)
    private String routeOfAdministration;

    @Column(name = "next_due_date")
    private LocalDate nextDueDate;

    @Column(name = "clinical_notes")
    private String clinicalNotes;

    @Enumerated(EnumType.STRING)
    @Column(name = "fitness_decision", length = 30)
    private FitnessDecision fitnessDecision;

    @Column(name = "fitness_notes")
    private String fitnessNotes;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

    public static HealthEvent create(String eventCode, HealthEventType eventType, UUID animalId,
                                     String animalCode, UUID premisesId, String premisesCode,
                                     UUID responsibleVetId, String responsibleVetName,
                                     LocalDate eventDate, UUID createdBy) {
        var e = new HealthEvent();
        e.id = UUID.randomUUID();
        e.eventCode = eventCode;
        e.eventType = eventType;
        e.status = HealthEventStatus.RECORDED;
        e.animalId = animalId;
        e.animalCode = animalCode;
        e.premisesId = premisesId;
        e.premisesCode = premisesCode;
        e.responsibleVetId = responsibleVetId;
        e.responsibleVetName = responsibleVetName;
        e.eventDate = eventDate;
        e.createdBy = createdBy;
        e.createdAt = Instant.now();
        e.updatedAt = Instant.now();
        return e;
    }

    public static String generateCode(long sequence) {
        return "HE-" + Year.now().getValue() + "-" + String.format("%06d", sequence);
    }

    public void verify(UUID verifiedBy) {
        if (this.status == HealthEventStatus.CANCELLED) {
            throw new BusinessRuleViolationException("ERR-VH-001",
                    "Cannot verify a cancelled health event");
        }
        if (this.status == HealthEventStatus.VERIFIED) {
            throw new BusinessRuleViolationException("ERR-VH-002",
                    "Health event is already verified");
        }
        this.status = HealthEventStatus.VERIFIED;
        this.updatedAt = Instant.now();
    }

    public void cancel(String reason) {
        if (this.status == HealthEventStatus.VERIFIED) {
            throw new BusinessRuleViolationException("ERR-VH-003",
                    "Cannot cancel a verified health event");
        }
        if (this.status == HealthEventStatus.CANCELLED) {
            throw new BusinessRuleViolationException("ERR-VH-004",
                    "Health event is already cancelled");
        }
        this.status = HealthEventStatus.CANCELLED;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getEventCode() { return eventCode; }
    public HealthEventType getEventType() { return eventType; }
    public HealthEventStatus getStatus() { return status; }
    public UUID getAnimalId() { return animalId; }
    public String getAnimalCode() { return animalCode; }
    public UUID getPremisesId() { return premisesId; }
    public String getPremisesCode() { return premisesCode; }
    public UUID getResponsibleVetId() { return responsibleVetId; }
    public String getResponsibleVetName() { return responsibleVetName; }
    public LocalDate getEventDate() { return eventDate; }
    public LocalTime getEventTime() { return eventTime; }
    public String getDiagnosis() { return diagnosis; }
    public String getTreatment() { return treatment; }
    public String getVaccineProduct() { return vaccineProduct; }
    public String getVaccineBatchNumber() { return vaccineBatchNumber; }
    public LocalDate getVaccineExpiryDate() { return vaccineExpiryDate; }
    public BigDecimal getDoseMl() { return doseMl; }
    public String getRouteOfAdministration() { return routeOfAdministration; }
    public LocalDate getNextDueDate() { return nextDueDate; }
    public String getClinicalNotes() { return clinicalNotes; }
    public FitnessDecision getFitnessDecision() { return fitnessDecision; }
    public String getFitnessNotes() { return fitnessNotes; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public int getVersion() { return version; }

    public void setEventTime(LocalTime eventTime) { this.eventTime = eventTime; this.updatedAt = Instant.now(); }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; this.updatedAt = Instant.now(); }
    public void setTreatment(String treatment) { this.treatment = treatment; this.updatedAt = Instant.now(); }
    public void setVaccineProduct(String vaccineProduct) { this.vaccineProduct = vaccineProduct; this.updatedAt = Instant.now(); }
    public void setVaccineBatchNumber(String vaccineBatchNumber) { this.vaccineBatchNumber = vaccineBatchNumber; this.updatedAt = Instant.now(); }
    public void setVaccineExpiryDate(LocalDate vaccineExpiryDate) { this.vaccineExpiryDate = vaccineExpiryDate; this.updatedAt = Instant.now(); }
    public void setDoseMl(BigDecimal doseMl) { this.doseMl = doseMl; this.updatedAt = Instant.now(); }
    public void setRouteOfAdministration(String route) { this.routeOfAdministration = route; this.updatedAt = Instant.now(); }
    public void setNextDueDate(LocalDate nextDueDate) { this.nextDueDate = nextDueDate; this.updatedAt = Instant.now(); }
    public void setClinicalNotes(String clinicalNotes) { this.clinicalNotes = clinicalNotes; this.updatedAt = Instant.now(); }
    public void setFitnessDecision(FitnessDecision fitnessDecision) { this.fitnessDecision = fitnessDecision; this.updatedAt = Instant.now(); }
    public void setFitnessNotes(String fitnessNotes) { this.fitnessNotes = fitnessNotes; this.updatedAt = Instant.now(); }
}
