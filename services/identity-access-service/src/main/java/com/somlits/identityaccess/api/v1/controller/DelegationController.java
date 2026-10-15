package com.somlits.identityaccess.api.v1.controller;

import com.somlits.identityaccess.api.v1.dto.request.GrantDelegationRequest;
import com.somlits.identityaccess.api.v1.dto.response.DelegateGrantResponse;
import com.somlits.identityaccess.application.DelegationService;
import com.somlits.identityaccess.application.UserManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/internal/v1/delegations")
@Tag(name = "Delegations", description = "Owner-to-employee data access delegation")
public class DelegationController {

    private final DelegationService delegationService;
    private final UserManagementService userService;

    public DelegationController(DelegationService delegationService, UserManagementService userService) {
        this.delegationService = delegationService;
        this.userService = userService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER_ADMIN', 'LIVESTOCK_OWNER')")
    @Operation(summary = "Grant herd data access to an employee")
    public ResponseEntity<DelegateGrantResponse> grant(
            @Valid @RequestBody GrantDelegationRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        var caller = userService.getByKeycloakSubjectId(jwt.getSubject());
        var grant = delegationService.grant(caller.getId(), request.granteeUserId(),
                request.ownerId(), request.scope(), request.validUntil(), caller.getId());
        var location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/internal/v1/delegations/{id}").buildAndExpand(grant.getId()).toUri();
        return ResponseEntity.created(location).body(DelegateGrantResponse.from(grant));
    }

    @DeleteMapping("/{grantId}")
    @PreAuthorize("hasAnyRole('OWNER_ADMIN', 'LIVESTOCK_OWNER', 'NATIONAL_ADMIN')")
    @Operation(summary = "Revoke a delegation grant")
    public ResponseEntity<Void> revoke(
            @PathVariable UUID grantId,
            @AuthenticationPrincipal Jwt jwt) {
        var caller = userService.getByKeycloakSubjectId(jwt.getSubject());
        delegationService.revoke(grantId, caller.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my-grants")
    @PreAuthorize("hasAnyRole('OWNER_ADMIN', 'LIVESTOCK_OWNER')")
    @Operation(summary = "List grants issued by the authenticated owner")
    public ResponseEntity<List<DelegateGrantResponse>> myGrants(@AuthenticationPrincipal Jwt jwt) {
        var caller = userService.getByKeycloakSubjectId(jwt.getSubject());
        var grants = delegationService.getGrantsByGrantor(caller.getId()).stream()
                .map(DelegateGrantResponse::from).toList();
        return ResponseEntity.ok(grants);
    }
}
