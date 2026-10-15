package com.somlits.common.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Sex {
    MALE("MALE"),
    FEMALE("FEMALE");

    private final String code;

    Sex(String code) {
        this.code = code;
    }

    @JsonValue
    public String getCode() {
        return code;
    }
}
