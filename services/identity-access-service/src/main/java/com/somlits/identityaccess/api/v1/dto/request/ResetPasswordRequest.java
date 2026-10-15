package com.somlits.identityaccess.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank @Pattern(regexp = "^\\+[1-9]\\d{7,14}$")
        String phoneE164,

        @NotBlank @Size(min = 6, max = 6) @Pattern(regexp = "^\\d{6}$")
        String otpCode,

        @NotBlank @Size(min = 8, max = 128)
        String newPassword
) {}
