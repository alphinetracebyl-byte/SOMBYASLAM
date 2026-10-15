package com.somlits.identityaccess.domain.enums;

public enum TerritoryType {
    NATIONAL,
    REGIONAL,
    DISTRICT,
    PREMISES,
    OWNER;

    public boolean includes(TerritoryType other) {
        return switch (this) {
            case NATIONAL -> true;
            case REGIONAL -> other == REGIONAL || other == DISTRICT || other == PREMISES || other == OWNER;
            case DISTRICT -> other == DISTRICT || other == PREMISES || other == OWNER;
            case PREMISES -> other == PREMISES;
            case OWNER -> other == OWNER;
        };
    }
}
