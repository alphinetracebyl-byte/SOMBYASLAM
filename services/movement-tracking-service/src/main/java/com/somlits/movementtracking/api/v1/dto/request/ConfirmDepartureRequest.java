package com.somlits.movementtracking.api.v1.dto.request;

import jakarta.validation.constraints.Size;

import java.time.Instant;

public class ConfirmDepartureRequest {

    private Instant actualDepartureAt;

    @Size(max = 30)
    private String vehicleRegistration;

    @Size(max = 150)
    private String transporterName;

    private boolean offline;

    public Instant getActualDepartureAt() { return actualDepartureAt; }
    public void setActualDepartureAt(Instant v) { this.actualDepartureAt = v; }
    public String getVehicleRegistration() { return vehicleRegistration; }
    public void setVehicleRegistration(String v) { this.vehicleRegistration = v; }
    public String getTransporterName() { return transporterName; }
    public void setTransporterName(String v) { this.transporterName = v; }
    public boolean isOffline() { return offline; }
    public void setOffline(boolean v) { this.offline = v; }
}
