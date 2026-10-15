package com.somlits.markettrade.api.v1.dto.response;

import java.time.Instant;

public record ErrorResponse(String error, String message, String timestamp) {

    public static ErrorResponse of(String error, String message) {
        return new ErrorResponse(error, message, Instant.now().toString());
    }
}
