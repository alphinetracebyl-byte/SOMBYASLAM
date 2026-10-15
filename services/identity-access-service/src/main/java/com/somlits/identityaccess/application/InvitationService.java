package com.somlits.identityaccess.application;

import com.somlits.identityaccess.domain.exception.BusinessRuleViolationException;
import com.somlits.identityaccess.domain.exception.DomainNotFoundException;
import com.somlits.identityaccess.domain.enums.InvitationStatus;
import com.somlits.identityaccess.domain.enums.RoleCode;
import com.somlits.identityaccess.domain.enums.TerritoryType;
import com.somlits.identityaccess.domain.enums.UserStatus;
import com.somlits.identityaccess.domain.model.Invitation;
import com.somlits.identityaccess.domain.model.UserAccount;
import com.somlits.identityaccess.domain.model.UserRoleAssignment;
import com.somlits.identityaccess.domain.repository.InvitationRepository;
import com.somlits.identityaccess.domain.repository.UserAccountRepository;
import com.somlits.identityaccess.domain.repository.UserRoleAssignmentRepository;
import com.somlits.identityaccess.infrastructure.keycloak.KeycloakUserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class InvitationService {

    private static final Logger log = LoggerFactory.getLogger(InvitationService.class);
    private final SecureRandom random = new SecureRandom();

    private final InvitationRepository invitationRepo;
    private final UserAccountRepository userRepo;
    private final UserRoleAssignmentRepository roleRepo;
    private final KeycloakUserService keycloakService;
    private final OutboxService outboxService;

    public InvitationService(InvitationRepository invitationRepo, UserAccountRepository userRepo,
            UserRoleAssignmentRepository roleRepo, KeycloakUserService keycloakService,
            OutboxService outboxService) {
        this.invitationRepo = invitationRepo;
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.keycloakService = keycloakService;
        this.outboxService = outboxService;
    }

    @Transactional
    public Invitation create(RoleCode roleCode, TerritoryType territoryType, String regionCode,
            String districtCode, UUID ownerId, String phoneE164, UUID createdByUserId) {

        String rawCode = generateInvitationCode();
        String codeHash = sha256(rawCode);

        var invitation = Invitation.create(roleCode, territoryType, regionCode, districtCode,
                ownerId, codeHash, createdByUserId);

        if (phoneE164 != null && phoneE164.length() >= 4) {
            invitation.setIntendedPhoneLast4(phoneE164.substring(phoneE164.length() - 4));
        }

        invitationRepo.save(invitation);

        log.info("Invitation created id={} roleCode={} by userId={}",
                invitation.getId(), roleCode, createdByUserId);

        outboxService.publish("InvitationCreated", "Invitation", invitation.getId(),
                """
                {"invitationId":"%s","phoneE164":"%s","roleCode":"%s","createdByUserId":"%s"}
                """.formatted(invitation.getId(), phoneE164, roleCode, createdByUserId));

        return invitation;
    }

    @Transactional
    public UserAccount accept(String invitationCode, String password, String fullName, String phoneE164) {
        String codeHash = sha256(invitationCode);
        var invitation = invitationRepo.findByInvitationCodeHashAndStatus(codeHash, InvitationStatus.PENDING)
                .orElseThrow(() -> new DomainNotFoundException("Invitation", invitationCode));

        if (invitation.isExpired()) {
            invitation.expire();
            invitationRepo.save(invitation);
            throw new BusinessRuleViolationException("BR-IAM-013",
                    "Invitation has expired. Please request a new one.");
        }

        String phoneLast4 = phoneE164.substring(phoneE164.length() - 4);

        var user = UserAccount.create(phoneE164, phoneLast4, fullName);
        user.setInvitationId(invitation.getId());
        user.setInvitedByUserId(invitation.getCreatedByUserId());
        userRepo.save(user);

        String keycloakId = keycloakService.createUser(phoneE164, fullName, password);
        user.activate(keycloakId);
        userRepo.save(user);

        var roleAssignment = UserRoleAssignment.create(
                user.getId(), invitation.getIntendedRoleCode(),
                invitation.getIntendedTerritoryType(),
                invitation.getIntendedRegionCode(),
                invitation.getIntendedDistrictCode(),
                invitation.getCreatedByUserId());
        roleAssignment.setOwnerId(invitation.getIntendedOwnerId());
        roleRepo.save(roleAssignment);

        keycloakService.assignRole(keycloakId, invitation.getIntendedRoleCode());

        invitation.accept(user.getId());
        invitationRepo.save(invitation);

        log.info("Invitation accepted userId={} invitationId={}", user.getId(), invitation.getId());

        outboxService.publish("InvitationAccepted", "Invitation", invitation.getId(),
                """
                {"invitationId":"%s","userId":"%s","roleCode":"%s"}
                """.formatted(invitation.getId(), user.getId(), invitation.getIntendedRoleCode()));

        return user;
    }

    private String generateInvitationCode() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256(String input) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(input.getBytes()));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
