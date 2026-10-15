package com.somlits.premises.api.v1.dto.response;

import java.util.UUID;

public class PremisesEligibilityResponse {

    private UUID premisesId;
    private String premisesCode;
    private boolean eligibleForMovement;
    private String status;
    private String reason;

    public static PremisesEligibilityResponse eligible(UUID premisesId, String premisesCode, String status) {
        var r = new PremisesEligibilityResponse();
        r.premisesId = premisesId;
        r.premisesCode = premisesCode;
        r.eligibleForMovement = true;
        r.status = status;
        r.reason = null;
        return r;
    }

    public static PremisesEligibilityResponse notEligible(UUID premisesId, String premisesCode,
                                                            String status, String reason) {
        var r = new PremisesEligibilityResponse();
        r.premisesId = premisesId;
        r.premisesCode = premisesCode;
        r.eligibleForMovement = false;
        r.status = status;
        r.reason = reason;
        return r;
    }

    public UUID getPremisesId() { return premisesId; }
    public String getPremisesCode() { return premisesCode; }
    public boolean isEligibleForMovement() { return eligibleForMovement; }
    public String getStatus() { return status; }
    public String getReason() { return reason; }
}
