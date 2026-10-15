package com.somlits.identityaccess.infrastructure.config;

import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class KeycloakAdminConfig {

    @Bean
    public Keycloak keycloakAdminClient(
            @Value("${somlits.keycloak.server-url}") String serverUrl,
            @Value("${somlits.keycloak.admin.username}") String adminUsername,
            @Value("${somlits.keycloak.admin.password}") String adminPassword,
            @Value("${somlits.keycloak.realm}") String realm) {
        return KeycloakBuilder.builder()
                .serverUrl(serverUrl)
                .realm("master")
                .clientId("admin-cli")
                .username(adminUsername)
                .password(adminPassword)
                .build();
    }
}
