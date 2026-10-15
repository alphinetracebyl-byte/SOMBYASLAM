package com.somlits.common.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum MovementStatus {
    DRAFT("DRAFT"),
    PENDING_APPROVAL("PENDING_APPROVAL"),
    APPROVED("APPROVED"),
    IN_TRANSIT("IN_TRANSIT"),
    COMPLETED("COMPLETED"),
    REJECTED("REJECTED"),
    CANCELLED("CANCELLED");

    private final String code;

    MovementStatus(String code) {
        this.code = code;
    }

    @JsonValue
    public String getCode() {
        return code;
    }

    public boolean isFinal() {
        return this == COMPLETED || this == REJECTED || this == CANCELLED;
    }
}
