package com.somlits.identityaccess.api.v1.controller;

import com.somlits.identityaccess.api.v1.dto.response.UserResponse;
import com.somlits.identityaccess.application.UserManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.UUID;

@RestController
@RequestMapping("/internal/v1/service")
@Tag(name = "Internal Service API", description = "Service-to-service endpoints — not exposed via APIM")
public class InternalController {

    private final UserManagementService userService;

    public InternalController(UserManagementService userService) {
        this.userService = userService;
    }

    @GetMapping("/users/{userId}")
    @PreAuthorize("hasRole('NATIONAL_ADMIN')")
    @Operation(summary = "Resolve user by ID (service-to-service)")
    public ResponseEntity<UserResponse> getUser(@PathVariable UUID userId) {
        var user = userService.getById(userId);
        var roles = userService.getRoles(userId);
        return ResponseEntity.ok(UserResponse.from(user, roles));
    }

    @PostMapping("/users/{userId}/link-owner")
    @PreAuthorize("hasRole('NATIONAL_ADMIN')")
    @Operation(summary = "Link a user account to an owner (called by owner-org-service)")
    public ResponseEntity<Void> linkOwner(
            @PathVariable UUID userId,
            @RequestParam UUID ownerId) {
        userService.linkOwner(userId, ownerId);
        return ResponseEntity.noContent().build();
    }
}
