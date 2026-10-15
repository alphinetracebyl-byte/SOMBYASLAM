package com.somlits.identityaccess.infrastructure.keycloak;

import com.somlits.identityaccess.domain.enums.RoleCode;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.Map;

@Service
public class KeycloakUserService {

    private static final Logger log = LoggerFactory.getLogger(KeycloakUserService.class);

    private final Keycloak keycloak;
    private final String realm;

    public KeycloakUserService(Keycloak keycloak,
            @Value("${somlits.keycloak.realm}") String realm) {
        this.keycloak = keycloak;
        this.realm = realm;
    }

    public String createUser(String phoneE164, String fullName, String password) {
        var cred = new CredentialRepresentation();
        cred.setType(CredentialRepresentation.PASSWORD);
        cred.setValue(password);
        cred.setTemporary(false);

        var user = new UserRepresentation();
        user.setUsername(phoneE164);
        user.setEnabled(true);
        user.setFirstName(fullName);
        user.setAttributes(Map.of("phoneE164", List.of(phoneE164)));
        user.setCredentials(List.of(cred));

        try (Response response = keycloak.realm(realm).users().create(user)) {
            if (response.getStatus() != 201) {
                throw new IllegalStateException("Keycloak user creation failed: HTTP " + response.getStatus());
            }
            String location = response.getLocation().getPath();
            String keycloakId = location.substring(location.lastIndexOf('/') + 1);
            log.info("Keycloak user created keycloakId={}", keycloakId);
            return keycloakId;
        }
    }

    public void assignRole(String keycloakUserId, RoleCode roleCode) {
        var roleRep = keycloak.realm(realm).roles().get(roleCode.name()).toRepresentation();
        keycloak.realm(realm).users().get(keycloakUserId).roles().realmLevel().add(List.of(roleRep));
        log.info("Role {} assigned in Keycloak to keycloakUserId={}", roleCode, keycloakUserId);
    }

    public void resetPassword(String keycloakUserId, String newPassword) {
        var cred = new CredentialRepresentation();
        cred.setType(CredentialRepresentation.PASSWORD);
        cred.setValue(newPassword);
        cred.setTemporary(false);
        keycloak.realm(realm).users().get(keycloakUserId).resetPassword(cred);
        log.info("Password reset in Keycloak for keycloakUserId={}", keycloakUserId);
    }

    public void disableUser(String keycloakUserId) {
        var user = keycloak.realm(realm).users().get(keycloakUserId).toRepresentation();
        user.setEnabled(false);
        keycloak.realm(realm).users().get(keycloakUserId).update(user);
        log.info("User disabled in Keycloak keycloakUserId={}", keycloakUserId);
    }

    public void enableUser(String keycloakUserId) {
        var user = keycloak.realm(realm).users().get(keycloakUserId).toRepresentation();
        user.setEnabled(true);
        keycloak.realm(realm).users().get(keycloakUserId).update(user);
        log.info("User enabled in Keycloak keycloakUserId={}", keycloakUserId);
    }
}
