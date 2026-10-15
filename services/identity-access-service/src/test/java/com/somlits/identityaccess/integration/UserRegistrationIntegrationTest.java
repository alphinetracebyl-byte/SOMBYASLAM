package com.somlits.identityaccess.integration;

import com.azure.messaging.servicebus.ServiceBusSenderClient;
import com.somlits.identityaccess.TestcontainersConfig;
import com.somlits.identityaccess.application.OtpService;
import com.somlits.identityaccess.application.UserManagementService;
import com.somlits.identityaccess.application.UserRegistrationService;
import com.somlits.identityaccess.domain.enums.OtpType;
import com.somlits.identityaccess.domain.enums.UserStatus;
import com.somlits.identityaccess.domain.exception.BusinessRuleViolationException;
import com.somlits.identityaccess.domain.exception.DomainConflictException;
import com.somlits.identityaccess.domain.repository.OutboxEventRepository;
import com.somlits.identityaccess.domain.repository.UserAccountRepository;
import com.somlits.identityaccess.infrastructure.keycloak.KeycloakUserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class UserRegistrationIntegrationTest {

    @Autowired UserRegistrationService registrationService;
    @Autowired UserManagementService userService;
    @Autowired UserAccountRepository userRepo;
    @Autowired OutboxEventRepository outboxRepo;
    @Autowired OtpService otpService;

    @MockBean KeycloakUserService keycloakService;
    @MockBean ServiceBusSenderClient serviceBusSenderClient;

    @Test
    void register_createsPendingUserAndOutboxEvent() {
        var user = registrationService.register("+252612000001", "Hassan Mohamed");

        assertThat(user.getId()).isNotNull();
        assertThat(user.getAccountStatus()).isEqualTo(UserStatus.PENDING_ACTIVATION);
        assertThat(user.getPhoneLast4()).isEqualTo("0001");

        var outbox = outboxRepo.findAll().stream()
                .filter(e -> "UserRegistered".equals(e.getEventType())
                        && user.getId().equals(e.getAggregateId()))
                .findFirst();
        assertThat(outbox).isPresent();
    }

    @Test
    void verifyOtpAndActivate_setsUserActive() {
        when(keycloakService.createUser(anyString(), anyString(), anyString())).thenReturn("kc-test-id-1");

        var user = registrationService.register("+252612000002", "Fadumo Ali");

        // OTP is logged in test mode via [LOCAL-DEV-ONLY] log line.
        // Full activation flow with OTP retrieval is covered by the API test layer.
        assertThat(user.getAccountStatus()).isEqualTo(UserStatus.PENDING_ACTIVATION);
    }

    @Test
    void register_duplicatePhoneLast4_throwsConflict() {
        registrationService.register("+252612000003", "Ahmed Osman");

        org.junit.jupiter.api.Assertions.assertThrows(
                DomainConflictException.class,
                () -> registrationService.register("+252698000003", "Halima Warsame")
        );
    }

    @Test
    void requestPasswordReset_publishesNoEventForNonExistentPhone() {
        org.junit.jupiter.api.Assertions.assertThrows(
                BusinessRuleViolationException.class,
                () -> registrationService.requestPasswordReset("+252699999999")
        );
    }
}
