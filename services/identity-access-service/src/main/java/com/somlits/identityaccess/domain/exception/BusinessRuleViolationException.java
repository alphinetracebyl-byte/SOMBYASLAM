package com.somlits.identityaccess.domain.exception;

/**
 * Thrown when a business rule prevents an operation from completing.
 * Maps to HTTP 422 Unprocessable Entity.
 */
public class BusinessRuleViolationException extends RuntimeException {

    private final String errorCode;

    public BusinessRuleViolationException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
