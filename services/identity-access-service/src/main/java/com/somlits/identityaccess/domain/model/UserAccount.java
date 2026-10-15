package com.somlits.identityaccess.domain.model;

import com.somlits.identityaccess.domain.enums.UserStatus;
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
@Table(name = "user_account")
public class UserAccount {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "keycloak_subject_id", unique = true)
    private String keycloakSubjectId;

    @Column(name = "phone_number_encrypted")
    private byte[] phoneNumberEncrypted;

    @Column(name = "phone_last4", length = 4)
    private String phoneLast4;

    @Column(name = "full_name", length = 200)
    private String fullName;

    @Column(name = "email", length = 254)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_status", nullable = false, length = 30)
    private UserStatus accountStatus = UserStatus.PENDING_ACTIVATION;

    @Column(name = "invited_by_user_id")
    private UUID invitedByUserId;

    @Column(name = "invitation_id")
    private UUID invitationId;

    @Column(name = "failed_login_count", nullable = false)
    private int failedLoginCount = 0;

    @Column(name = "locked_at")
    private Instant lockedAt;

    @Column(name = "lock_expires_at")
    private Instant lockExpiresAt;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "owner_id")
    private UUID ownerId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

    public static UserAccount create(String phoneE164, String phoneLast4, String fullName) {
        var user = new UserAccount();
        user.id = UUID.randomUUID();
        user.phoneLast4 = phoneLast4;
        user.fullName = fullName;
        user.accountStatus = UserStatus.PENDING_ACTIVATION;
        user.failedLoginCount = 0;
        user.createdAt = Instant.now();
        user.updatedAt = Instant.now();
        return user;
    }

    public void activate(String keycloakSubjectId) {
        this.keycloakSubjectId = keycloakSubjectId;
        this.accountStatus = UserStatus.ACTIVE;
        this.updatedAt = Instant.now();
    }

    public void recordLoginFailure(int maxAttempts) {
        this.failedLoginCount++;
        this.updatedAt = Instant.now();
        if (this.failedLoginCount >= maxAttempts) {
            this.accountStatus = UserStatus.LOCKED;
            this.lockedAt = Instant.now();
            this.lockExpiresAt = Instant.now().plusSeconds(1800);
        }
    }

    public void recordLoginSuccess() {
        this.failedLoginCount = 0;
        this.lastLoginAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void unlock() {
        this.accountStatus = UserStatus.ACTIVE;
        this.failedLoginCount = 0;
        this.lockedAt = null;
        this.lockExpiresAt = null;
        this.updatedAt = Instant.now();
    }

    public boolean isLockExpired() {
        return lockExpiresAt != null && Instant.now().isAfter(lockExpiresAt);
    }

    public UUID getId() { return id; }
    public String getKeycloakSubjectId() { return keycloakSubjectId; }
    public byte[] getPhoneNumberEncrypted() { return phoneNumberEncrypted; }
    public void setPhoneNumberEncrypted(byte[] phoneNumberEncrypted) {
        this.phoneNumberEncrypted = phoneNumberEncrypted;
        this.updatedAt = Instant.now();
    }
    public String getPhoneLast4() { return phoneLast4; }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; this.updatedAt = Instant.now(); }
    public UserStatus getAccountStatus() { return accountStatus; }
    public void setAccountStatus(UserStatus status) { this.accountStatus = status; this.updatedAt = Instant.now(); }
    public UUID getInvitedByUserId() { return invitedByUserId; }
    public void setInvitedByUserId(UUID invitedByUserId) { this.invitedByUserId = invitedByUserId; }
    public UUID getInvitationId() { return invitationId; }
    public void setInvitationId(UUID invitationId) { this.invitationId = invitationId; }
    public int getFailedLoginCount() { return failedLoginCount; }
    public Instant getLockedAt() { return lockedAt; }
    public Instant getLockExpiresAt() { return lockExpiresAt; }
    public Instant getLastLoginAt() { return lastLoginAt; }
    public UUID getOwnerId() { return ownerId; }
    public void setOwnerId(UUID ownerId) { this.ownerId = ownerId; this.updatedAt = Instant.now(); }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public int getVersion() { return version; }
}
