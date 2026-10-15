package com.somlits.identityaccess.domain.model;

import com.somlits.identityaccess.domain.enums.DelegateScope;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

class DelegateGrantTest {

    @Test
    void create_setsStatusActive() {
        var grant = DelegateGrant.create(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                DelegateScope.ANIMALS_READ, Instant.now().plus(30, ChronoUnit.DAYS), UUID.randomUUID());
        assertThat(grant.getStatus()).isEqualTo("ACTIVE");
        assertThat(grant.isActive()).isTrue();
    }

    @Test
    void revoke_setsStatusRevoked() {
        UUID revoker = UUID.randomUUID();
        var grant = DelegateGrant.create(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                DelegateScope.FULL_OWNER_READ, Instant.now().plus(30, ChronoUnit.DAYS), UUID.randomUUID());
        grant.revoke(revoker);
        assertThat(grant.getStatus()).isEqualTo("REVOKED");
        assertThat(grant.getRevokedByUserId()).isEqualTo(revoker);
        assertThat(grant.getRevokedAt()).isNotNull();
        assertThat(grant.isActive()).isFalse();
    }

    @Test
    void isActive_returnsFalseWhenExpired() {
        var grant = DelegateGrant.create(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                DelegateScope.ANIMALS_READ, Instant.now().minusSeconds(1), UUID.randomUUID());
        assertThat(grant.isActive()).isFalse();
    }
}
