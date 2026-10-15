package com.somlits.identityaccess.domain.exception;

/**
 * Thrown when an operation conflicts with existing state (e.g. duplicate phone number).
 * Maps to HTTP 409 Conflict.
 */
public class DomainConflictException extends RuntimeException {

    private final String errorCode;

    public DomainConflictException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
