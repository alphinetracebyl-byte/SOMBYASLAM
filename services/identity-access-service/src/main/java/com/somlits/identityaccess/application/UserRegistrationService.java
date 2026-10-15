package com.somlits.identityaccess.application;

import com.somlits.identityaccess.domain.exception.BusinessRuleViolationException;
import com.somlits.identityaccess.domain.exception.DomainConflictException;
import com.somlits.identityaccess.domain.enums.LoginEventType;
import com.somlits.identityaccess.domain.enums.OtpType;
import com.somlits.identityaccess.domain.enums.RoleCode;
import com.somlits.identityaccess.domain.enums.TerritoryType;
import com.somlits.identityaccess.domain.enums.UserStatus;
import com.somlits.identityaccess.domain.model.LoginEvent;
import com.somlits.identityaccess.domain.model.UserAccount;
import com.somlits.identityaccess.domain.model.UserRoleAssignment;
import com.somlits.identityaccess.domain.repository.LoginEventRepository;
import com.somlits.identityaccess.domain.repository.UserAccountRepository;
import com.somlits.identityaccess.domain.repository.UserRoleAssignmentRepository;
import com.somlits.identityaccess.infrastructure.keycloak.KeycloakUserService;
import com.somlits.identityaccess.infrastructure.web.CorrelationIdFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
public class UserRegistrationService {

    private static final Logger log = LoggerFactory.getLogger(UserRegistrationService.class);
    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final UUID SYSTEM_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private final UserAccountRepository userRepo;
    private final UserRoleAssignmentRepository roleRepo;
    private final LoginEventRepository loginEventRepo;
    private final OtpService otpService;
    private final KeycloakUserService keycloakService;
    private final OutboxService outboxService;

    public UserRegistrationService(UserAccountRepository userRepo,
            UserRoleAssignmentRepository roleRepo,
            LoginEventRepository loginEventRepo,
            OtpService otpService,
            KeycloakUserService keycloakService,
            OutboxService outboxService) {
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.loginEventRepo = loginEventRepo;
        this.otpService = otpService;
        this.keycloakService = keycloakService;
        this.outboxService = outboxService;
    }

    @Transactional
    public UserAccount register(String phoneE164, String fullName) {
        String phoneLast4 = phoneE164.substring(phoneE164.length() - 4);

        if (userRepo.existsByPhoneLast4AndAccountStatusIn(phoneLast4,
                List.of(UserStatus.ACTIVE, UserStatus.PENDING_ACTIVATION, UserStatus.INVITED))) {
            throw new DomainConflictException("ERR-IAM-PHONE-CONFLICT", "Phone number is already registered");
        }

        var user = UserAccount.create(phoneE164, phoneLast4, fullName);
        userRepo.save(user);
        log.info("User registered userId={}", user.getId());

        otpService.generateAndStore(user.getId(), OtpType.REGISTRATION);

        outboxService.publish("UserRegistered", "UserAccount", user.getId(), """
                {"userId":"%s","phoneLast4":"%s","fullName":"%s"}
                """.formatted(user.getId(), phoneLast4, fullName));

        return user;
    }

    @Transactional
    public UserAccount verifyOtpAndActivate(String phoneE164, String otpCode, String initialPassword) {
        String phoneLast4 = phoneE164.substring(phoneE164.length() - 4);
        var user = userRepo.findAll().stream()
                .filter(u -> phoneLast4.equals(u.getPhoneLast4())
                        && u.getAccountStatus() == UserStatus.PENDING_ACTIVATION)
                .findFirst()
                .orElseThrow(() -> new BusinessRuleViolationException("BR-IAM-016",
                        "No pending activation found for this phone number"));

        otpService.verify(user.getId(), otpCode, OtpType.REGISTRATION);

        String keycloakId = keycloakService.createUser(phoneE164, fullNameOf(user), initialPassword);
        user.activate(keycloakId);
        userRepo.save(user);

        var roleAssignment = UserRoleAssignment.create(
                user.getId(), RoleCode.LIVESTOCK_OWNER,
                TerritoryType.OWNER, null, null, SYSTEM_USER_ID);
        roleRepo.save(roleAssignment);

        keycloakService.assignRole(keycloakId, RoleCode.LIVESTOCK_OWNER);

        loginEventRepo.save(LoginEvent.of(user.getId(), LoginEventType.OTP_VERIFIED, null));

        outboxService.publish("UserActivated", "UserAccount", user.getId(),
                """
                {"userId":"%s","roleCode":"LIVESTOCK_OWNER"}
                """.formatted(user.getId()));

        log.info("User activated userId={}", user.getId());
        return user;
    }

    @Transactional
    public void requestPasswordReset(String phoneE164) {
        String phoneLast4 = phoneE164.substring(phoneE164.length() - 4);
        var user = userRepo.findAll().stream()
                .filter(u -> phoneLast4.equals(u.getPhoneLast4())
                        && u.getAccountStatus() == UserStatus.ACTIVE)
                .findFirst()
                .orElseThrow(() -> new BusinessRuleViolationException("BR-IAM-016",
                        "No active account found for this phone number"));

        otpService.generateAndStore(user.getId(), OtpType.PASSWORD_RESET);
        loginEventRepo.save(LoginEvent.of(user.getId(), LoginEventType.PASSWORD_RESET_REQUESTED, null));
    }

    @Transactional
    public void resetPassword(String phoneE164, String otpCode, String newPassword) {
        String phoneLast4 = phoneE164.substring(phoneE164.length() - 4);
        var user = userRepo.findAll().stream()
                .filter(u -> phoneLast4.equals(u.getPhoneLast4())
                        && u.getAccountStatus() == UserStatus.ACTIVE)
                .findFirst()
                .orElseThrow(() -> new BusinessRuleViolationException("BR-IAM-016",
                        "No active account found for this phone number"));

        otpService.verify(user.getId(), otpCode, OtpType.PASSWORD_RESET);
        keycloakService.resetPassword(user.getKeycloakSubjectId(), newPassword);
        loginEventRepo.save(LoginEvent.of(user.getId(), LoginEventType.PASSWORD_RESET_COMPLETED, null));
    }

    private String fullNameOf(UserAccount user) {
        return user.getFullName() != null ? user.getFullName() : "Unknown";
    }
}
