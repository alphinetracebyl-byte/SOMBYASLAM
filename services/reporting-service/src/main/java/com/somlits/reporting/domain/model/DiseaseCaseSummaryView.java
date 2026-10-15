package com.somlits.reporting.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "disease_case_summary_view")
public class DiseaseCaseSummaryView {

    @Id
    private UUID id;

    @Column(name = "case_code", length = 20)
    private String caseCode;

    @Column(name = "disease", length = 200)
    private String disease;

    @Column(name = "status", length = 30)
    private String status;

    @Column(name = "premises_code", length = 20)
    private String premisesCode;

    @Column(name = "region_code", length = 50)
    private String regionCode;

    @Column(name = "reported_at")
    private Instant reportedAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    protected DiseaseCaseSummaryView() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getCaseCode() { return caseCode; }
    public void setCaseCode(String caseCode) { this.caseCode = caseCode; }
    public String getDisease() { return disease; }
    public void setDisease(String disease) { this.disease = disease; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getPremisesCode() { return premisesCode; }
    public void setPremisesCode(String premisesCode) { this.premisesCode = premisesCode; }
    public String getRegionCode() { return regionCode; }
    public void setRegionCode(String regionCode) { this.regionCode = regionCode; }
    public Instant getReportedAt() { return reportedAt; }
    public void setReportedAt(Instant reportedAt) { this.reportedAt = reportedAt; }
    public Instant getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(Instant confirmedAt) { this.confirmedAt = confirmedAt; }
}
