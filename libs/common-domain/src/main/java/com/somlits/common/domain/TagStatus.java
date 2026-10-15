package com.somlits.common.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum TagStatus {
    IN_STOCK("IN_STOCK"),
    ASSIGNED("ASSIGNED"),
    ACTIVE("ACTIVE"),
    REPLACED("REPLACED"),
    LOST("LOST"),
    DAMAGED("DAMAGED"),
    RETIRED("RETIRED");

    private final String code;

    TagStatus(String code) {
        this.code = code;
    }

    @JsonValue
    public String getCode() {
        return code;
    }
}
