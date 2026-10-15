package com.somlits.identityaccess.domain.model;

import com.somlits.identityaccess.domain.enums.InvitationStatus;
import com.somlits.identityaccess.domain.enums.RoleCode;
import com.somlits.identityaccess.domain.enums.TerritoryType;
import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

class InvitationTest {

    private static final UUID CREATOR = UUID.randomUUID();

    @Test
    void create_setsStatusToPendingAndExpires72Hours() {
        var inv = Invitation.create(RoleCode.VET_OFFICER, TerritoryType.DISTRICT,
                "BA", "BND", null, "hash123", CREATOR);

        assertThat(inv.getStatus()).isEqualTo(InvitationStatus.PENDING);
        assertThat(inv.getExpiresAt()).isAfter(java.time.Instant.now().plusSeconds(71 * 3600));
        assertThat(inv.getExpiresAt()).isBefore(java.time.Instant.now().plusSeconds(73 * 3600));
    }

    @Test
    void isExpired_returnsFalseForFreshInvitation() {
        var inv = Invitation.create(RoleCode.VET_OFFICER, TerritoryType.DISTRICT,
                "BA", "BND", null, "hash123", CREATOR);
        assertThat(inv.isExpired()).isFalse();
    }

    @Test
    void accept_setsStatusAndAcceptedByUser() {
        var inv = Invitation.create(RoleCode.VET_OFFICER, TerritoryType.DISTRICT,
                "BA", "BND", null, "hash123", CREATOR);
        UUID acceptorId = UUID.randomUUID();
        inv.accept(acceptorId);

        assertThat(inv.getStatus()).isEqualTo(InvitationStatus.ACCEPTED);
        assertThat(inv.getAcceptedByUserId()).isEqualTo(acceptorId);
        assertThat(inv.getAcceptedAt()).isNotNull();
    }
}
