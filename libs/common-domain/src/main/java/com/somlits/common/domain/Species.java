package com.somlits.common.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Species {
    CATTLE("CATTLE"),
    CAMEL("CAMEL"),
    SHEEP("SHEEP"),
    GOAT("GOAT");

    private final String code;

    Species(String code) {
        this.code = code;
    }

    @JsonValue
    public String getCode() {
        return code;
    }
}
