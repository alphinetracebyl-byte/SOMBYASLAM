package com.somlits.identityaccess.application;

import com.somlits.identityaccess.domain.exception.BusinessRuleViolationException;
import com.somlits.identityaccess.domain.exception.DomainNotFoundException;
import com.somlits.identityaccess.domain.enums.RoleCode;
import com.somlits.identityaccess.domain.enums.TerritoryType;
import com.somlits.identityaccess.domain.enums.UserStatus;
import com.somlits.identityaccess.domain.model.UserAccount;
import com.somlits.identityaccess.domain.model.UserRoleAssignment;
import com.somlits.identityaccess.domain.repository.UserAccountRepository;
import com.somlits.identityaccess.domain.repository.UserRoleAssignmentRepository;
import com.somlits.identityaccess.infrastructure.keycloak.KeycloakUserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
public class UserManagementService {

    private static final Logger log = LoggerFactory.getLogger(UserManagementService.class);

    private final UserAccountRepository userRepo;
    private final UserRoleAssignmentRepository roleRepo;
    private final KeycloakUserService keycloakService;
    private final OutboxService outboxService;

    public UserManagementService(UserAccountRepository userRepo,
            UserRoleAssignmentRepository roleRepo,
            KeycloakUserService keycloakService,
            OutboxService outboxService) {
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.keycloakService = keycloakService;
        this.outboxService = outboxService;
    }

    @Transactional(readOnly = true)
    public UserAccount getById(UUID userId) {
        return userRepo.findById(userId)
                .orElseThrow(() -> new DomainNotFoundException("UserAccount", userId));
    }

    @Transactional(readOnly = true)
    public UserAccount getByKeycloakSubjectId(String subjectId) {
        return userRepo.findByKeycloakSubjectId(subjectId)
                .orElseThrow(() -> new DomainNotFoundException("UserAccount", subjectId));
    }

    @Transactional(readOnly = true)
    public List<UserRoleAssignment> getRoles(UUID userId) {
        return roleRepo.findByUserIdAndActiveTrue(userId);
    }

    @Transactional
    public UserRoleAssignment assignRole(UUID targetUserId, RoleCode roleCode, TerritoryType territoryType,
            String regionCode, String districtCode, UUID ownerId, UUID assignedByUserId) {

        var target = userRepo.findById(targetUserId)
                .orElseThrow(() -> new DomainNotFoundException("UserAccount", targetUserId));

        if (target.getAccountStatus() != UserStatus.ACTIVE) {
            throw new BusinessRuleViolationException("BR-IAM-016", "User must be ACTIVE to receive a role");
        }

        var assignment = UserRoleAssignment.create(
                targetUserId, roleCode, territoryType, regionCode, districtCode, assignedByUserId);
        assignment.setOwnerId(ownerId);
        roleRepo.save(assignment);

        keycloakService.assignRole(target.getKeycloakSubjectId(), roleCode);

        log.info("Role {} assigned to userId={} by userId={}", roleCode, targetUserId, assignedByUserId);

        outboxService.publish("RoleAssigned", "UserAccount", targetUserId,
                """
                {"userId":"%s","roleCode":"%s","assignedByUserId":"%s"}
                """.formatted(targetUserId, roleCode, assignedByUserId));

        return assignment;
    }

    @Transactional
    public void revokeRole(UUID assignmentId, UUID revokedByUserId) {
        var assignment = roleRepo.findById(assignmentId)
                .orElseThrow(() -> new DomainNotFoundException("UserRoleAssignment", assignmentId));
        assignment.revoke(revokedByUserId);
        roleRepo.save(assignment);
        log.info("Role assignment {} revoked by userId={}", assignmentId, revokedByUserId);
    }

    @Transactional
    public void deactivate(UUID userId, UUID deactivatedByUserId) {
        var user = userRepo.findById(userId)
                .orElseThrow(() -> new DomainNotFoundException("UserAccount", userId));

        if (user.getAccountStatus().isTerminal()) {
            throw new BusinessRuleViolationException("BR-IAM-016", "User is already deactivated");
        }

        user.setAccountStatus(UserStatus.DEACTIVATED);
        userRepo.save(user);

        keycloakService.disableUser(user.getKeycloakSubjectId());

        outboxService.publish("UserDeactivated", "UserAccount", userId,
                """
                {"userId":"%s","deactivatedByUserId":"%s"}
                """.formatted(userId, deactivatedByUserId));

        log.info("User deactivated userId={} by userId={}", userId, deactivatedByUserId);
    }

    @Transactional
    public void suspend(UUID userId, UUID suspendedByUserId) {
        var user = userRepo.findById(userId)
                .orElseThrow(() -> new DomainNotFoundException("UserAccount", userId));
        user.setAccountStatus(UserStatus.SUSPENDED);
        userRepo.save(user);
        keycloakService.disableUser(user.getKeycloakSubjectId());
        log.info("User suspended userId={}", userId);
    }

    @Transactional
    public void reactivate(UUID userId, UUID reactivatedByUserId) {
        var user = userRepo.findById(userId)
                .orElseThrow(() -> new DomainNotFoundException("UserAccount", userId));

        if (user.getAccountStatus() == UserStatus.DEACTIVATED) {
            throw new BusinessRuleViolationException("BR-IAM-016", "Deactivated users cannot be reactivated");
        }

        user.setAccountStatus(UserStatus.ACTIVE);
        userRepo.save(user);
        keycloakService.enableUser(user.getKeycloakSubjectId());
        log.info("User reactivated userId={}", userId);
    }

    @Transactional
    public void linkOwner(UUID userId, UUID ownerId) {
        var user = userRepo.findById(userId)
                .orElseThrow(() -> new DomainNotFoundException("UserAccount", userId));
        user.setOwnerId(ownerId);
        userRepo.save(user);
    }

    @Transactional(readOnly = true)
    public Page<UserAccount> listAll(Pageable pageable) {
        return userRepo.findAll(pageable);
    }
}
