package com.somlits.identityaccess.api.v1.controller;

import com.somlits.identityaccess.api.v1.dto.request.AcceptInvitationRequest;
import com.somlits.identityaccess.api.v1.dto.request.ForgotPasswordRequest;
import com.somlits.identityaccess.api.v1.dto.request.RegisterRequest;
import com.somlits.identityaccess.api.v1.dto.request.ResetPasswordRequest;
import com.somlits.identityaccess.api.v1.dto.request.VerifyOtpRequest;
import com.somlits.identityaccess.api.v1.dto.response.InvitationResponse;
import com.somlits.identityaccess.api.v1.dto.response.RegisterResponse;
import com.somlits.identityaccess.api.v1.dto.response.UserResponse;
import com.somlits.identityaccess.application.InvitationService;
import com.somlits.identityaccess.application.UserManagementService;
import com.somlits.identityaccess.application.UserRegistrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import java.util.UUID;

@RestController
@RequestMapping("/internal/v1/auth")
@Tag(name = "Authentication", description = "Self-service registration and password management")
public class AuthController {

    private final UserRegistrationService registrationService;
    private final InvitationService invitationService;
    private final UserManagementService userService;

    public AuthController(UserRegistrationService registrationService,
            InvitationService invitationService,
            UserManagementService userService) {
        this.registrationService = registrationService;
        this.invitationService = invitationService;
        this.userService = userService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new livestock owner account (sends OTP)")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        var user = registrationService.register(request.phoneE164(), request.fullName());
        var response = new RegisterResponse(user.getId(), user.getPhoneLast4(),
                "OTP sent to your registered phone number. Enter it to activate your account.");
        var location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/internal/v1/users/{id}").buildAndExpand(user.getId()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PostMapping("/verify-otp")
    @Operation(summary = "Verify OTP and set initial password to activate account")
    public ResponseEntity<UserResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        var user = registrationService.verifyOtpAndActivate(
                request.phoneE164(), request.otpCode(), "Temp@" + request.otpCode());
        var roles = userService.getRoles(user.getId());
        return ResponseEntity.ok(UserResponse.from(user, roles));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request a password reset OTP")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        registrationService.requestPasswordReset(request.phoneE164());
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password using OTP")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        registrationService.resetPassword(request.phoneE164(), request.otpCode(), request.newPassword());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/invitations/{invitationCode}/accept")
    @Operation(summary = "Accept an invitation and create an account")
    public ResponseEntity<UserResponse> acceptInvitation(
            @PathVariable String invitationCode,
            @Valid @RequestBody AcceptInvitationRequest request) {
        var user = invitationService.accept(invitationCode, request.password(),
                request.fullName(), request.phoneE164());
        var roles = userService.getRoles(user.getId());
        var location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/internal/v1/users/{id}").buildAndExpand(user.getId()).toUri();
        return ResponseEntity.created(location).body(UserResponse.from(user, roles));
    }
}
