package com.somlits.identityaccess.domain.model;

import com.somlits.identityaccess.domain.enums.OtpType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "otp_verification")
public class OtpVerification {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "otp_code_hash", nullable = false, length = 64)
    private String otpCodeHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "otp_type", nullable = false, length = 30)
    private OtpType otpType;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static OtpVerification create(UUID userId, String otpCodeHash, OtpType otpType) {
        var otp = new OtpVerification();
        otp.id = UUID.randomUUID();
        otp.userId = userId;
        otp.otpCodeHash = otpCodeHash;
        otp.otpType = otpType;
        otp.expiresAt = Instant.now().plusSeconds(600);
        otp.createdAt = Instant.now();
        return otp;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isUsed() {
        return usedAt != null;
    }

    public void markUsed() {
        this.usedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getOtpCodeHash() { return otpCodeHash; }
    public OtpType getOtpType() { return otpType; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getUsedAt() { return usedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
