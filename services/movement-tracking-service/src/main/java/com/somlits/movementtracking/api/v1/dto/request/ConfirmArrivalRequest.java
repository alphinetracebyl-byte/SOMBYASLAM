package com.somlits.movementtracking.api.v1.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ConfirmArrivalRequest {

    private boolean full = true;

    private Instant actualArrivalAt;

    private boolean offline;

    @Valid
    private List<ArrivedAnimalDto> arrivedAnimals;

    @Valid
    private List<ExceptionReportDto> exceptions;

    public boolean isFull() { return full; }
    public void setFull(boolean v) { this.full = v; }
    public Instant getActualArrivalAt() { return actualArrivalAt; }
    public void setActualArrivalAt(Instant v) { this.actualArrivalAt = v; }
    public boolean isOffline() { return offline; }
    public void setOffline(boolean v) { this.offline = v; }
    public List<ArrivedAnimalDto> getArrivedAnimals() { return arrivedAnimals; }
    public void setArrivedAnimals(List<ArrivedAnimalDto> v) { this.arrivedAnimals = v; }
    public List<ExceptionReportDto> getExceptions() { return exceptions; }
    public void setExceptions(List<ExceptionReportDto> v) { this.exceptions = v; }

    public static class ArrivedAnimalDto {
        private UUID animalId;
        private String arrivedTagSerial;

        public UUID getAnimalId() { return animalId; }
        public void setAnimalId(UUID v) { this.animalId = v; }
        public String getArrivedTagSerial() { return arrivedTagSerial; }
        public void setArrivedTagSerial(String v) { this.arrivedTagSerial = v; }
    }

    public static class ExceptionReportDto {
        @NotBlank
        private String type;
        private UUID animalId;
        private String animalCode;
        private String tagSerialFound;
        @Size(max = 500)
        private String notes;

        public String getType() { return type; }
        public void setType(String v) { this.type = v; }
        public UUID getAnimalId() { return animalId; }
        public void setAnimalId(UUID v) { this.animalId = v; }
        public String getAnimalCode() { return animalCode; }
        public void setAnimalCode(String v) { this.animalCode = v; }
        public String getTagSerialFound() { return tagSerialFound; }
        public void setTagSerialFound(String v) { this.tagSerialFound = v; }
        public String getNotes() { return notes; }
        public void setNotes(String v) { this.notes = v; }
    }
}
