package com.somlits.identityaccess.domain.model;

import com.somlits.identityaccess.domain.enums.DelegateScope;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "delegate_grant")
public class DelegateGrant {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "grantor_user_id", nullable = false, updatable = false)
    private UUID grantorUserId;

    @Column(name = "grantee_user_id", nullable = false, updatable = false)
    private UUID granteeUserId;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private UUID ownerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false, length = 50)
    private DelegateScope scope;

    @Column(name = "valid_from", nullable = false)
    private Instant validFrom;

    @Column(name = "valid_until", nullable = false)
    private Instant validUntil;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "granted_by_user_id", nullable = false, updatable = false)
    private UUID grantedByUserId;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "revoked_by_user_id")
    private UUID revokedByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

    public static DelegateGrant create(UUID grantorUserId, UUID granteeUserId, UUID ownerId,
            DelegateScope scope, Instant validUntil, UUID grantedByUserId) {
        var grant = new DelegateGrant();
        grant.id = UUID.randomUUID();
        grant.grantorUserId = grantorUserId;
        grant.granteeUserId = granteeUserId;
        grant.ownerId = ownerId;
        grant.scope = scope;
        grant.validFrom = Instant.now();
        grant.validUntil = validUntil;
        grant.status = "ACTIVE";
        grant.grantedByUserId = grantedByUserId;
        grant.createdAt = Instant.now();
        return grant;
    }

    public void revoke(UUID revokedByUserId) {
        this.status = "REVOKED";
        this.revokedAt = Instant.now();
        this.revokedByUserId = revokedByUserId;
    }

    public boolean isActive() {
        return "ACTIVE".equals(status) && Instant.now().isBefore(validUntil);
    }

    public UUID getId() { return id; }
    public UUID getGrantorUserId() { return grantorUserId; }
    public UUID getGranteeUserId() { return granteeUserId; }
    public UUID getOwnerId() { return ownerId; }
    public DelegateScope getScope() { return scope; }
    public Instant getValidFrom() { return validFrom; }
    public Instant getValidUntil() { return validUntil; }
    public String getStatus() { return status; }
    public UUID getGrantedByUserId() { return grantedByUserId; }
    public Instant getRevokedAt() { return revokedAt; }
    public UUID getRevokedByUserId() { return revokedByUserId; }
    public Instant getCreatedAt() { return createdAt; }
    public int getVersion() { return version; }
}
