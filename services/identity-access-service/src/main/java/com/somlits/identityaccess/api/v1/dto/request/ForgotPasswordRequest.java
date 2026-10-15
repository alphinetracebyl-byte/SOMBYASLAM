package com.somlits.identityaccess.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ForgotPasswordRequest(
        @NotBlank @Pattern(regexp = "^\\+[1-9]\\d{7,14}$")
        String phoneE164
) {}
