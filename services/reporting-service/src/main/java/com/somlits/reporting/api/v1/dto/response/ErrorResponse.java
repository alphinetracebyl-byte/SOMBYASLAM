package com.somlits.reporting.api.v1.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * RFC 7807 Problem Details error response.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ErrorResponse(
        String type,
        String title,
        int status,
        String detail,
        String instance,
        String traceId,
        List<FieldError> errors
) {

    private static final String ERROR_BASE_URI = "https://somlits.gov.so/errors/";

    public static ErrorResponse of(int status, String errorCode, String title, String detail,
                                   String instance, String traceId) {
        return new ErrorResponse(
                ERROR_BASE_URI + errorCode,
                title,
                status,
                detail,
                instance,
                traceId,
                List.of()
        );
    }

    public static ErrorResponse ofValidation(String detail, String instance, String traceId,
                                             List<FieldError> fieldErrors) {
        return new ErrorResponse(
                ERROR_BASE_URI + "validation-error",
                "Validation failed",
                400,
                detail,
                instance,
                traceId,
                fieldErrors
        );
    }

    public record FieldError(String field, String code, String message) {}
}
