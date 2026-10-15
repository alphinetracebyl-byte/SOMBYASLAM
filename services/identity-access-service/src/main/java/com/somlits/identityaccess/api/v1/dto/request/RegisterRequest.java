package com.somlits.identityaccess.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Pattern(regexp = "^\\+[1-9]\\d{7,14}$", message = "Must be E.164 format")
        String phoneE164,

        @NotBlank @Size(min = 2, max = 200)
        String fullName
) {}
