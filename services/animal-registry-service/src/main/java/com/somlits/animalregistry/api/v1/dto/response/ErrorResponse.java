package com.somlits.animalregistry.api.v1.dto.response;

import java.time.Instant;
import java.util.List;

public class ErrorResponse {
    private int status;
    private String errorCode;
    private String error;
    private String message;
    private String path;
    private String correlationId;
    private Instant timestamp;
    private List<FieldError> fieldErrors;

    public static ErrorResponse of(int status, String errorCode, String error, String message,
                                   String path, String correlationId) {
        var r = new ErrorResponse();
        r.status = status;
        r.errorCode = errorCode;
        r.error = error;
        r.message = message;
        r.path = path;
        r.correlationId = correlationId;
        r.timestamp = Instant.now();
        return r;
    }

    public static ErrorResponse ofValidation(String message, String path, String correlationId,
                                              List<FieldError> fieldErrors) {
        var r = of(400, "validation-failed", "Bad Request", message, path, correlationId);
        r.fieldErrors = fieldErrors;
        return r;
    }

    public int getStatus() { return status; }
    public String getErrorCode() { return errorCode; }
    public String getError() { return error; }
    public String getMessage() { return message; }
    public String getPath() { return path; }
    public String getCorrelationId() { return correlationId; }
    public Instant getTimestamp() { return timestamp; }
    public List<FieldError> getFieldErrors() { return fieldErrors; }

    public record FieldError(String field, String code, String message) {}
}
