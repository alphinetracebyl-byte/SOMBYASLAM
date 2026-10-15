package com.somlits.identityaccess.integration;

import com.azure.messaging.servicebus.ServiceBusSenderClient;
import com.somlits.identityaccess.TestcontainersConfig;
import com.somlits.identityaccess.application.DelegationService;
import com.somlits.identityaccess.domain.enums.DelegateScope;
import com.somlits.identityaccess.domain.exception.BusinessRuleViolationException;
import com.somlits.identityaccess.domain.repository.DelegateGrantRepository;
import com.somlits.identityaccess.infrastructure.keycloak.KeycloakUserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class DelegationIntegrationTest {

    @Autowired DelegationService delegationService;
    @Autowired DelegateGrantRepository grantRepo;

    @MockBean KeycloakUserService keycloakService;
    @MockBean ServiceBusSenderClient serviceBusSenderClient;

    @Test
    void grantDelegation_persistsActiveGrant() {
        UUID grantor = UUID.randomUUID();
        UUID grantee = UUID.randomUUID();
        UUID owner = UUID.randomUUID();

        var grant = delegationService.grant(grantor, grantee, owner,
                DelegateScope.ANIMALS_READ,
                Instant.now().plus(30, ChronoUnit.DAYS), grantor);

        var saved = grantRepo.findById(grant.getId());
        assertThat(saved).isPresent();
        assertThat(saved.get().getStatus()).isEqualTo("ACTIVE");
        assertThat(saved.get().getScope()).isEqualTo(DelegateScope.ANIMALS_READ);
    }

    @Test
    void grantDelegation_exceedingMaxDays_throwsBusinessRuleViolation() {
        assertThrows(BusinessRuleViolationException.class, () ->
                delegationService.grant(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                        DelegateScope.FULL_OWNER_READ,
                        Instant.now().plus(366, ChronoUnit.DAYS), UUID.randomUUID())
        );
    }

    @Test
    void revokeDelegation_setsStatusRevoked() {
        UUID grantor = UUID.randomUUID();
        var grant = delegationService.grant(grantor, UUID.randomUUID(), UUID.randomUUID(),
                DelegateScope.MOVEMENTS_READ,
                Instant.now().plus(10, ChronoUnit.DAYS), grantor);

        delegationService.revoke(grant.getId(), grantor);

        var revoked = grantRepo.findById(grant.getId());
        assertThat(revoked.get().getStatus()).isEqualTo("REVOKED");
    }

    @Test
    void revokeAlreadyRevoked_throwsBusinessRuleViolation() {
        UUID grantor = UUID.randomUUID();
        var grant = delegationService.grant(grantor, UUID.randomUUID(), UUID.randomUUID(),
                DelegateScope.HEALTH_READ,
                Instant.now().plus(10, ChronoUnit.DAYS), grantor);

        delegationService.revoke(grant.getId(), grantor);

        assertThrows(BusinessRuleViolationException.class, () ->
                delegationService.revoke(grant.getId(), grantor));
    }
}
