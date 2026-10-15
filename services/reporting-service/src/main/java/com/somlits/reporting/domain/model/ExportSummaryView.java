package com.somlits.reporting.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "export_summary_view")
public class ExportSummaryView {

    @Id
    private UUID id;

    @Column(name = "consignment_code", length = 20)
    private String consignmentCode;

    @Column(name = "exporter_owner_code", length = 20)
    private String exporterOwnerCode;

    @Column(name = "destination_country", length = 100)
    private String destinationCountry;

    @Column(name = "animal_count")
    private int animalCount;

    @Column(name = "status", length = 40)
    private String status;

    @Column(name = "exported_at")
    private Instant exportedAt;

    protected ExportSummaryView() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getConsignmentCode() { return consignmentCode; }
    public void setConsignmentCode(String consignmentCode) { this.consignmentCode = consignmentCode; }
    public String getExporterOwnerCode() { return exporterOwnerCode; }
    public void setExporterOwnerCode(String exporterOwnerCode) { this.exporterOwnerCode = exporterOwnerCode; }
    public String getDestinationCountry() { return destinationCountry; }
    public void setDestinationCountry(String destinationCountry) { this.destinationCountry = destinationCountry; }
    public int getAnimalCount() { return animalCount; }
    public void setAnimalCount(int animalCount) { this.animalCount = animalCount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getExportedAt() { return exportedAt; }
    public void setExportedAt(Instant exportedAt) { this.exportedAt = exportedAt; }
}
