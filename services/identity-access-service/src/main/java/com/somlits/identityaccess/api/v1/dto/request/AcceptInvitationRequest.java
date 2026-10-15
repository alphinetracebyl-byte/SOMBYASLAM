package com.somlits.identityaccess.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AcceptInvitationRequest(
        @NotBlank @Size(min = 8, max = 128)
        String password,

        @NotBlank @Size(min = 2, max = 200)
        String fullName,

        @NotBlank @Pattern(regexp = "^\\+[1-9]\\d{7,14}$")
        String phoneE164
) {}
