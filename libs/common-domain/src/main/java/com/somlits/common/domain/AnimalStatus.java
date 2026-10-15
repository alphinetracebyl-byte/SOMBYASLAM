package com.somlits.common.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum AnimalStatus {
    REGISTERED("REGISTERED"),
    ACTIVE("ACTIVE"),
    SUSPENDED("SUSPENDED"),
    DEAD("DEAD"),
    SLAUGHTERED("SLAUGHTERED"),
    EXPORTED("EXPORTED"),
    LOST("LOST");

    private final String code;

    AnimalStatus(String code) {
        this.code = code;
    }

    @JsonValue
    public String getCode() {
        return code;
    }

    public boolean isTerminal() {
        return this == DEAD || this == SLAUGHTERED || this == EXPORTED;
    }
}
