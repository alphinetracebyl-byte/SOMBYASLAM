package com.somlits.identityaccess;

import com.azure.messaging.servicebus.ServiceBusSenderClient;
import com.somlits.identityaccess.infrastructure.keycloak.KeycloakUserService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
class IdentityAccessApplicationTest {

    @MockBean KeycloakUserService keycloakUserService;
    @MockBean ServiceBusSenderClient serviceBusSenderClient;

    @Test
    void contextLoads() {
        // Passes if the Spring context starts without error
    }
}
