package com.somlits.identityaccess.domain.enums;

public enum UserStatus {
    INVITED,
    PENDING_ACTIVATION,
    ACTIVE,
    SUSPENDED,
    LOCKED,
    DEACTIVATED;

    public boolean isOperational() {
        return this == ACTIVE;
    }

    public boolean isTerminal() {
        return this == DEACTIVATED;
    }
}
