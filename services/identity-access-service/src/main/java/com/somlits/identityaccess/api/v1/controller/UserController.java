package com.somlits.identityaccess.api.v1.controller;

import com.somlits.identityaccess.api.v1.dto.request.AssignRoleRequest;
import com.somlits.identityaccess.api.v1.dto.response.RoleAssignmentResponse;
import com.somlits.identityaccess.api.v1.dto.response.UserResponse;
import com.somlits.identityaccess.application.UserManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/internal/v1/users")
@Tag(name = "User Management", description = "Admin operations on user accounts and role assignments")
public class UserController {

    private final UserManagementService userService;

    public UserController(UserManagementService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    @Operation(summary = "Get the authenticated user's profile")
    public ResponseEntity<UserResponse> getMe(@AuthenticationPrincipal Jwt jwt) {
        var user = userService.getByKeycloakSubjectId(jwt.getSubject());
        var roles = userService.getRoles(user.getId());
        return ResponseEntity.ok(UserResponse.from(user, roles));
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'DISTRICT_ADMIN', 'AUDITOR')")
    @Operation(summary = "Get user by ID (admin)")
    public ResponseEntity<UserResponse> getById(@PathVariable UUID userId) {
        var user = userService.getById(userId);
        var roles = userService.getRoles(userId);
        return ResponseEntity.ok(UserResponse.from(user, roles));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'DISTRICT_ADMIN')")
    @Operation(summary = "List all users (paginated)")
    public ResponseEntity<Page<UserResponse>> listAll(
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        var page = userService.listAll(pageable)
                .map(u -> UserResponse.from(u, userService.getRoles(u.getId())));
        return ResponseEntity.ok(page);
    }

    @PostMapping("/{userId}/roles")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'DISTRICT_ADMIN')")
    @Operation(summary = "Assign a role to a user")
    public ResponseEntity<RoleAssignmentResponse> assignRole(
            @PathVariable UUID userId,
            @Valid @RequestBody AssignRoleRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        var callerUser = userService.getByKeycloakSubjectId(jwt.getSubject());
        var assignment = userService.assignRole(userId, request.roleCode(), request.territoryType(),
                request.regionCode(), request.districtCode(), request.ownerId(), callerUser.getId());
        return ResponseEntity.ok(RoleAssignmentResponse.from(assignment));
    }

    @DeleteMapping("/{userId}/roles/{assignmentId}")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'DISTRICT_ADMIN')")
    @Operation(summary = "Revoke a role assignment")
    public ResponseEntity<Void> revokeRole(
            @PathVariable UUID userId,
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal Jwt jwt) {
        var callerUser = userService.getByKeycloakSubjectId(jwt.getSubject());
        userService.revokeRole(assignmentId, callerUser.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{userId}/deactivate")
    @PreAuthorize("hasRole('NATIONAL_ADMIN')")
    @Operation(summary = "Permanently deactivate a user account")
    public ResponseEntity<Void> deactivate(
            @PathVariable UUID userId,
            @AuthenticationPrincipal Jwt jwt) {
        var callerUser = userService.getByKeycloakSubjectId(jwt.getSubject());
        userService.deactivate(userId, callerUser.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{userId}/suspend")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'DISTRICT_ADMIN')")
    @Operation(summary = "Suspend a user account")
    public ResponseEntity<Void> suspend(
            @PathVariable UUID userId,
            @AuthenticationPrincipal Jwt jwt) {
        var callerUser = userService.getByKeycloakSubjectId(jwt.getSubject());
        userService.suspend(userId, callerUser.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{userId}/reactivate")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN', 'REGIONAL_ADMIN')")
    @Operation(summary = "Reactivate a suspended user account")
    public ResponseEntity<Void> reactivate(
            @PathVariable UUID userId,
            @AuthenticationPrincipal Jwt jwt) {
        var callerUser = userService.getByKeycloakSubjectId(jwt.getSubject());
        userService.reactivate(userId, callerUser.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{userId}/roles")
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'DISTRICT_ADMIN', 'AUDITOR')")
    @Operation(summary = "List role assignments for a user")
    public ResponseEntity<List<RoleAssignmentResponse>> listRoles(@PathVariable UUID userId) {
        var roles = userService.getRoles(userId).stream()
                .map(RoleAssignmentResponse::from).toList();
        return ResponseEntity.ok(roles);
    }
}
