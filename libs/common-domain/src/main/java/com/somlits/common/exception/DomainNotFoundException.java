package com.somlits.common.exception;

import java.util.UUID;

public class DomainNotFoundException extends RuntimeException {

    public DomainNotFoundException(String resourceType, UUID id) {
        super(resourceType + " not found: " + id);
    }

    public DomainNotFoundException(String resourceType, String identifier) {
        super(resourceType + " not found: " + identifier);
    }
}
