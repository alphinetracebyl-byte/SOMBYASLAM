package com.somlits.identityaccess.domain.exception;

/**
 * Thrown when a requested domain aggregate does not exist.
 * Maps to HTTP 404.
 */
public class DomainNotFoundException extends RuntimeException {

    private final String resourceType;
    private final String resourceId;

    public DomainNotFoundException(String resourceType, String resourceId) {
        super(resourceType + " not found: " + resourceId);
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }

    public DomainNotFoundException(String resourceType, java.util.UUID resourceId) {
        this(resourceType, resourceId.toString());
    }

    public String getResourceType() {
        return resourceType;
    }

    public String getResourceId() {
        return resourceId;
    }
}
