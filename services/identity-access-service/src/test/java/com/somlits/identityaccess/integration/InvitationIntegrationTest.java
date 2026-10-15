package com.somlits.identityaccess.integration;

import com.azure.messaging.servicebus.ServiceBusSenderClient;
import com.somlits.identityaccess.TestcontainersConfig;
import com.somlits.identityaccess.application.InvitationService;
import com.somlits.identityaccess.domain.enums.InvitationStatus;
import com.somlits.identityaccess.domain.enums.RoleCode;
import com.somlits.identityaccess.domain.enums.TerritoryType;
import com.somlits.identityaccess.domain.exception.DomainNotFoundException;
import com.somlits.identityaccess.domain.repository.InvitationRepository;
import com.somlits.identityaccess.domain.repository.OutboxEventRepository;
import com.somlits.identityaccess.infrastructure.keycloak.KeycloakUserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class InvitationIntegrationTest {

    @Autowired InvitationService invitationService;
    @Autowired InvitationRepository invitationRepo;
    @Autowired OutboxEventRepository outboxRepo;
    @MockBean KeycloakUserService keycloakService;
    @MockBean ServiceBusSenderClient serviceBusSenderClient;

    private static final UUID CREATOR_ID = UUID.fromString("00000000-0000-0000-0000-000000000099");

    @Test
    void createInvitation_savesWithPendingStatusAndPublishesEvent() {
        var invitation = invitationService.create(
                RoleCode.VET_OFFICER, TerritoryType.DISTRICT,
                "BA", "BND", null, "+252611000001", CREATOR_ID);

        assertThat(invitation.getId()).isNotNull();
        assertThat(invitation.getStatus()).isEqualTo(InvitationStatus.PENDING);
        assertThat(invitation.getIntendedRoleCode()).isEqualTo(RoleCode.VET_OFFICER);

        var outbox = outboxRepo.findAll().stream()
                .anyMatch(e -> "InvitationCreated".equals(e.getEventType())
                        && invitation.getId().equals(e.getAggregateId()));
        assertThat(outbox).isTrue();
    }

    @Test
    void acceptInvitation_withInvalidCode_throwsNotFound() {
        when(keycloakService.createUser(anyString(), anyString(), anyString())).thenReturn("kc-inv-test-1");

        invitationService.create(
                RoleCode.FIELD_SUPERVISOR, TerritoryType.DISTRICT,
                "MU", "GKR", null, "+252611000002", CREATOR_ID);

        // Raw invitation code is never exposed after creation (only the SHA-256 hash is stored).
        // Verify that an invalid code results in DomainNotFoundException.
        assertThrows(
                DomainNotFoundException.class,
                () -> invitationService.accept("invalid-code", "Password1!", "Test User", "+252611000003")
        );
    }

    @Test
    void createInvitation_forOwnerEmployee_setsOwnerId() {
        UUID ownerId = UUID.randomUUID();
        var invitation = invitationService.create(
                RoleCode.OWNER_EMPLOYEE, TerritoryType.OWNER,
                null, null, ownerId, "+252611000004", CREATOR_ID);

        assertThat(invitation.getIntendedOwnerId()).isEqualTo(ownerId);
    }
}
