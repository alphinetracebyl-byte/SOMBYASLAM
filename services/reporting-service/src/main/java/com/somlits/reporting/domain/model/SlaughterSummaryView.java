package com.somlits.reporting.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "slaughter_summary_view")
public class SlaughterSummaryView {

    @Id
    private UUID id;

    @Column(name = "record_code", length = 20)
    private String recordCode;

    @Column(name = "animal_code", length = 30)
    private String animalCode;

    @Column(name = "session_date")
    private LocalDate sessionDate;

    @Column(name = "abattoir_premises_code", length = 20)
    private String abattoirPremisesCode;

    @Column(name = "region_code", length = 50)
    private String regionCode;

    @Column(name = "outcome", length = 30)
    private String outcome;

    protected SlaughterSummaryView() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getRecordCode() { return recordCode; }
    public void setRecordCode(String recordCode) { this.recordCode = recordCode; }
    public String getAnimalCode() { return animalCode; }
    public void setAnimalCode(String animalCode) { this.animalCode = animalCode; }
    public LocalDate getSessionDate() { return sessionDate; }
    public void setSessionDate(LocalDate sessionDate) { this.sessionDate = sessionDate; }
    public String getAbattoirPremisesCode() { return abattoirPremisesCode; }
    public void setAbattoirPremisesCode(String abattoirPremisesCode) { this.abattoirPremisesCode = abattoirPremisesCode; }
    public String getRegionCode() { return regionCode; }
    public void setRegionCode(String regionCode) { this.regionCode = regionCode; }
    public String getOutcome() { return outcome; }
    public void setOutcome(String outcome) { this.outcome = outcome; }
}
