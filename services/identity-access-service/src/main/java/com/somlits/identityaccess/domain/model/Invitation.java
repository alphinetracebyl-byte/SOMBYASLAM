package com.somlits.identityaccess.domain.model;

import com.somlits.identityaccess.domain.enums.InvitationStatus;
import com.somlits.identityaccess.domain.enums.RoleCode;
import com.somlits.identityaccess.domain.enums.TerritoryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "invitation")
public class Invitation {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "invitation_code_hash", nullable = false)
    private String invitationCodeHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "intended_role_code", nullable = false, length = 50)
    private RoleCode intendedRoleCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "intended_territory_type", nullable = false, length = 20)
    private TerritoryType intendedTerritoryType;

    @Column(name = "intended_region_code", length = 10)
    private String intendedRegionCode;

    @Column(name = "intended_district_code", length = 10)
    private String intendedDistrictCode;

    @Column(name = "intended_owner_id")
    private UUID intendedOwnerId;

    @Column(name = "intended_phone_last4", length = 4)
    private String intendedPhoneLast4;

    @Column(name = "created_by_user_id", nullable = false, updatable = false)
    private UUID createdByUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private InvitationStatus status = InvitationStatus.PENDING;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @Column(name = "accepted_by_user_id")
    private UUID acceptedByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static Invitation create(RoleCode roleCode, TerritoryType territoryType,
            String regionCode, String districtCode, UUID ownerId,
            String codeHash, UUID createdByUserId) {
        var inv = new Invitation();
        inv.id = UUID.randomUUID();
        inv.intendedRoleCode = roleCode;
        inv.intendedTerritoryType = territoryType;
        inv.intendedRegionCode = regionCode;
        inv.intendedDistrictCode = districtCode;
        inv.intendedOwnerId = ownerId;
        inv.invitationCodeHash = codeHash;
        inv.createdByUserId = createdByUserId;
        inv.status = InvitationStatus.PENDING;
        inv.expiresAt = Instant.now().plusSeconds(72 * 3600);
        inv.createdAt = Instant.now();
        return inv;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public void accept(UUID acceptedByUserId) {
        this.status = InvitationStatus.ACCEPTED;
        this.acceptedAt = Instant.now();
        this.acceptedByUserId = acceptedByUserId;
    }

    public void expire() {
        this.status = InvitationStatus.EXPIRED;
    }

    public UUID getId() { return id; }
    public String getInvitationCodeHash() { return invitationCodeHash; }
    public RoleCode getIntendedRoleCode() { return intendedRoleCode; }
    public TerritoryType getIntendedTerritoryType() { return intendedTerritoryType; }
    public String getIntendedRegionCode() { return intendedRegionCode; }
    public String getIntendedDistrictCode() { return intendedDistrictCode; }
    public UUID getIntendedOwnerId() { return intendedOwnerId; }
    public String getIntendedPhoneLast4() { return intendedPhoneLast4; }
    public void setIntendedPhoneLast4(String phoneLast4) { this.intendedPhoneLast4 = phoneLast4; }
    public UUID getCreatedByUserId() { return createdByUserId; }
    public InvitationStatus getStatus() { return status; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getAcceptedAt() { return acceptedAt; }
    public UUID getAcceptedByUserId() { return acceptedByUserId; }
    public Instant getCreatedAt() { return createdAt; }
}
