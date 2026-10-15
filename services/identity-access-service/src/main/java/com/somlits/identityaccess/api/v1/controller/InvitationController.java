package com.somlits.identityaccess.api.v1.controller;

import com.somlits.identityaccess.api.v1.dto.request.InviteUserRequest;
import com.somlits.identityaccess.api.v1.dto.response.InvitationResponse;
import com.somlits.identityaccess.application.InvitationService;
import com.somlits.identityaccess.application.UserManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/internal/v1/invitations")
@Tag(name = "Invitations", description = "Invite officers, owner employees, and other system users")
public class InvitationController {

    private final InvitationService invitationService;
    private final UserManagementService userService;

    public InvitationController(InvitationService invitationService, UserManagementService userService) {
        this.invitationService = invitationService;
        this.userService = userService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('NATIONAL_ADMIN', 'REGIONAL_ADMIN', 'DISTRICT_ADMIN', 'OWNER_ADMIN')")
    @Operation(summary = "Create and send an invitation")
    public ResponseEntity<InvitationResponse> createInvitation(
            @Valid @RequestBody InviteUserRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        var caller = userService.getByKeycloakSubjectId(jwt.getSubject());
        var invitation = invitationService.create(
                request.roleCode(), request.territoryType(),
                request.regionCode(), request.districtCode(),
                request.ownerId(), request.phoneE164(), caller.getId());

        var location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/internal/v1/invitations/{id}").buildAndExpand(invitation.getId()).toUri();
        return ResponseEntity.created(location).body(InvitationResponse.from(invitation));
    }
}
