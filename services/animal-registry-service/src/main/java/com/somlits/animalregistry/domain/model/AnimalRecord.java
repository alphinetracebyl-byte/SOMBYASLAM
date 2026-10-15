package com.somlits.animalregistry.domain.model;

import com.somlits.animalregistry.domain.enums.AnimalStatus;
import com.somlits.animalregistry.domain.enums.DobPrecision;
import com.somlits.animalregistry.domain.enums.Sex;
import com.somlits.animalregistry.domain.enums.Species;
import com.somlits.animalregistry.domain.enums.SubmissionType;
import com.somlits.animalregistry.domain.exception.BusinessRuleViolationException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "animal_record")
public class AnimalRecord {

    private static final String TERMINAL_ERROR = "ERR-AR-008";

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "animal_code", nullable = false, unique = true, length = 25, updatable = false)
    private String animalCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "species", nullable = false, length = 30)
    private Species species;

    @Column(name = "breed", nullable = false, length = 60)
    private String breed;

    @Enumerated(EnumType.STRING)
    @Column(name = "sex", nullable = false, length = 10)
    private Sex sex;

    @Column(name = "dob")
    private LocalDate dob;

    @Enumerated(EnumType.STRING)
    @Column(name = "dob_precision", nullable = false, length = 10)
    private DobPrecision dobPrecision = DobPrecision.UNKNOWN;

    @Column(name = "coat_color", length = 100)
    private String coatColor;

    @Column(name = "distinguishing_marks")
    private String distinguishingMarks;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private AnimalStatus status = AnimalStatus.DRAFT;

    @Column(name = "current_owner_id", nullable = false)
    private UUID currentOwnerId;

    @Column(name = "current_premises_id", nullable = false)
    private UUID currentPremisesId;

    @Column(name = "active_tag_serial", length = 50)
    private String activeTagSerial;

    @Column(name = "primary_photo_id")
    private UUID primaryPhotoId;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private SubmissionType sourceType;

    @Column(name = "terminated_at")
    private Instant terminatedAt;

    @Column(name = "batch_id")
    private UUID batchId;

    @Column(name = "batch_code", length = 40)
    private String batchCode;

    @Column(name = "registered_by", nullable = false)
    private UUID registeredBy;

    @Column(name = "registered_at", nullable = false, updatable = false)
    private Instant registeredAt;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static AnimalRecord create(String animalCode, Species species, String breed, Sex sex,
                                      LocalDate dob, DobPrecision dobPrecision, String coatColor,
                                      String distinguishingMarks, UUID ownerId, UUID premisesId,
                                      SubmissionType sourceType, UUID registeredBy,
                                      UUID batchId, String batchCode) {
        var a = new AnimalRecord();
        a.id = UUID.randomUUID();
        a.animalCode = animalCode;
        a.species = species;
        a.breed = breed;
        a.sex = sex;
        a.dob = dob;
        a.dobPrecision = dobPrecision != null ? dobPrecision : DobPrecision.UNKNOWN;
        a.coatColor = coatColor;
        a.distinguishingMarks = distinguishingMarks;
        a.status = AnimalStatus.DRAFT;
        a.currentOwnerId = ownerId;
        a.currentPremisesId = premisesId;
        a.sourceType = sourceType;
        a.registeredBy = registeredBy;
        a.batchId = batchId;
        a.batchCode = batchCode;
        a.registeredAt = Instant.now();
        a.createdAt = Instant.now();
        a.updatedAt = Instant.now();
        return a;
    }

    public void submit() {
        requireNonTerminal();
        this.status = AnimalStatus.SUBMITTED;
        this.updatedAt = Instant.now();
    }

    public void verify(String tagSerial) {
        requireNonTerminal();
        this.status = AnimalStatus.ACTIVE;
        this.activeTagSerial = tagSerial;
        this.updatedAt = Instant.now();
    }

    public void reject() {
        if (this.status != AnimalStatus.DRAFT && this.status != AnimalStatus.SUBMITTED) {
            throw new BusinessRuleViolationException(TERMINAL_ERROR,
                    "Cannot reject an animal in status " + this.status);
        }
        this.status = AnimalStatus.DRAFT;
        this.updatedAt = Instant.now();
    }

    public void applyTag(String tagSerial) {
        requireNonTerminal();
        this.activeTagSerial = tagSerial;
        this.updatedAt = Instant.now();
    }

    public void replaceTag(String newTagSerial) {
        requireActive();
        this.activeTagSerial = newTagSerial;
        this.updatedAt = Instant.now();
    }

    public void transferOwner(UUID newOwnerId) {
        requireActive();
        this.currentOwnerId = newOwnerId;
        this.updatedAt = Instant.now();
    }

    public void assignPremises(UUID newPremisesId) {
        requireActive();
        this.currentPremisesId = newPremisesId;
        this.updatedAt = Instant.now();
    }

    public void markDead(Instant deathInstant) {
        requireNonTerminal();
        this.status = AnimalStatus.DEAD;
        this.activeTagSerial = null;
        this.terminatedAt = deathInstant;
        this.updatedAt = Instant.now();
    }

    public void markSlaughtered(Instant slaughterInstant) {
        requireNonTerminal();
        this.status = AnimalStatus.SLAUGHTERED;
        this.activeTagSerial = null;
        this.terminatedAt = slaughterInstant;
        this.updatedAt = Instant.now();
    }

    public void markExported(Instant exportInstant) {
        if (this.status != AnimalStatus.ACTIVE) {
            throw new BusinessRuleViolationException(TERMINAL_ERROR,
                    "Only ACTIVE animals can be exported");
        }
        this.status = AnimalStatus.EXPORTED;
        this.activeTagSerial = null;
        this.terminatedAt = exportInstant;
        this.updatedAt = Instant.now();
    }

    public void confiscate() {
        if (isTerminal()) {
            throw new BusinessRuleViolationException(TERMINAL_ERROR,
                    "Cannot confiscate an animal in status " + this.status);
        }
        this.status = AnimalStatus.CONFISCATED;
        this.updatedAt = Instant.now();
    }

    public void release() {
        if (this.status != AnimalStatus.CONFISCATED) {
            throw new BusinessRuleViolationException(TERMINAL_ERROR,
                    "Only CONFISCATED animals can be released");
        }
        this.status = AnimalStatus.ACTIVE;
        this.updatedAt = Instant.now();
    }

    public void setPrimaryPhoto(UUID photoId) {
        this.primaryPhotoId = photoId;
        this.updatedAt = Instant.now();
    }

    public boolean isTerminal() {
        return status == AnimalStatus.DEAD
                || status == AnimalStatus.SLAUGHTERED
                || status == AnimalStatus.EXPORTED
                || status == AnimalStatus.ARCHIVED;
    }

    private void requireNonTerminal() {
        if (isTerminal()) {
            throw new BusinessRuleViolationException(TERMINAL_ERROR,
                    "Operation not permitted for animal in status " + this.status);
        }
    }

    private void requireActive() {
        if (this.status == AnimalStatus.CONFISCATED) {
            throw new BusinessRuleViolationException("ERR-AR-009",
                    "Operation not permitted: animal is CONFISCATED");
        }
        requireNonTerminal();
    }

    public UUID getId() { return id; }
    public String getAnimalCode() { return animalCode; }
    public Species getSpecies() { return species; }
    public String getBreed() { return breed; }
    public Sex getSex() { return sex; }
    public LocalDate getDob() { return dob; }
    public DobPrecision getDobPrecision() { return dobPrecision; }
    public String getCoatColor() { return coatColor; }
    public String getDistinguishingMarks() { return distinguishingMarks; }
    public AnimalStatus getStatus() { return status; }
    public UUID getCurrentOwnerId() { return currentOwnerId; }
    public UUID getCurrentPremisesId() { return currentPremisesId; }
    public String getActiveTagSerial() { return activeTagSerial; }
    public UUID getPrimaryPhotoId() { return primaryPhotoId; }
    public SubmissionType getSourceType() { return sourceType; }
    public Instant getTerminatedAt() { return terminatedAt; }
    public UUID getBatchId() { return batchId; }
    public String getBatchCode() { return batchCode; }
    public UUID getRegisteredBy() { return registeredBy; }
    public Instant getRegisteredAt() { return registeredAt; }
    public int getVersion() { return version; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setCoatColor(String coatColor) { this.coatColor = coatColor; this.updatedAt = Instant.now(); }
    public void setDistinguishingMarks(String m) { this.distinguishingMarks = m; this.updatedAt = Instant.now(); }
}
