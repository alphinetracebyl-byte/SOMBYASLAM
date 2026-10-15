package com.somlits.identityaccess.api.v1.dto.response;

import java.util.UUID;

public record RegisterResponse(
        UUID userId,
        String phoneLast4,
        String message
) {}
