package com.somlits.identityaccess.domain.model;

import com.somlits.identityaccess.domain.enums.UserStatus;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class UserAccountTest {

    @Test
    void create_setsStatusToPendingActivation() {
        var user = UserAccount.create("+252612345678", "5678", "Hassan Ahmed");
        assertThat(user.getAccountStatus()).isEqualTo(UserStatus.PENDING_ACTIVATION);
        assertThat(user.getFailedLoginCount()).isZero();
        assertThat(user.getId()).isNotNull();
    }

    @Test
    void activate_setsStatusToActiveAndStoresKeycloakId() {
        var user = UserAccount.create("+252612345678", "5678", "Hassan Ahmed");
        user.activate("kc-subject-123");
        assertThat(user.getAccountStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(user.getKeycloakSubjectId()).isEqualTo("kc-subject-123");
    }

    @Test
    void recordLoginFailure_incrementsCount() {
        var user = UserAccount.create("+252612345678", "5678", "Hassan Ahmed");
        user.activate("kc-123");
        user.recordLoginFailure(5);
        assertThat(user.getFailedLoginCount()).isEqualTo(1);
        assertThat(user.getAccountStatus()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    void recordLoginFailure_locksAccountAfterMaxAttempts() {
        var user = UserAccount.create("+252612345678", "5678", "Hassan Ahmed");
        user.activate("kc-123");
        for (int i = 0; i < 5; i++) {
            user.recordLoginFailure(5);
        }
        assertThat(user.getAccountStatus()).isEqualTo(UserStatus.LOCKED);
        assertThat(user.getLockedAt()).isNotNull();
        assertThat(user.getLockExpiresAt()).isNotNull();
    }

    @Test
    void unlock_resetsCountAndRestoresActive() {
        var user = UserAccount.create("+252612345678", "5678", "Hassan Ahmed");
        user.activate("kc-123");
        for (int i = 0; i < 5; i++) user.recordLoginFailure(5);
        user.unlock();
        assertThat(user.getAccountStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(user.getFailedLoginCount()).isZero();
        assertThat(user.getLockedAt()).isNull();
    }

    @Test
    void recordLoginSuccess_resetsFailedCount() {
        var user = UserAccount.create("+252612345678", "5678", "Hassan Ahmed");
        user.activate("kc-123");
        user.recordLoginFailure(5);
        user.recordLoginSuccess();
        assertThat(user.getFailedLoginCount()).isZero();
        assertThat(user.getLastLoginAt()).isNotNull();
    }
}
