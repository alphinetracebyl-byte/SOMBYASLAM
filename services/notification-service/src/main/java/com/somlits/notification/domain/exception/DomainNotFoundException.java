package com.somlits.notification.domain.exception;

public class DomainNotFoundException extends RuntimeException {

    private final String errorCode;

    public DomainNotFoundException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
