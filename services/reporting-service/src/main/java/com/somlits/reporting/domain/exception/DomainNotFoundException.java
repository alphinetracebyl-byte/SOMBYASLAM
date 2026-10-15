package com.somlits.reporting.domain.exception;

public class DomainNotFoundException extends RuntimeException {

    public DomainNotFoundException(String message) {
        super(message);
    }

    public DomainNotFoundException(String resourceType, Object id) {
        super(resourceType + " not found: " + id);
    }
}
