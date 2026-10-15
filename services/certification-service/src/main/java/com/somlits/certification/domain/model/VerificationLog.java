package com.somlits.certification.domain.model;

import com.somlits.certification.domain.enums.VerificationResult;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "verification_log")
public class VerificationLog {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "certificate_id")
    private UUID certificateId;

    @Column(name = "qr_code", nullable = false, length = 50)
    private String qrCode;

    @Column(name = "verified_at", nullable = false, updatable = false)
    private Instant verifiedAt;

    @Column(name = "verifier_ip", length = 45)
    private String verifierIp;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_result", nullable = false, length = 20)
    private VerificationResult verificationResult;

    protected VerificationLog() {
        // JPA
    }

    public static VerificationLog log(UUID certId, String qrCode,
                                      String ip, VerificationResult result) {
        VerificationLog vl = new VerificationLog();
        vl.id = UUID.randomUUID();
        vl.certificateId = certId;
        vl.qrCode = qrCode;
        vl.verifierIp = ip;
        vl.verificationResult = result;
        vl.verifiedAt = Instant.now();
        return vl;
    }

    public UUID getId() { return id; }
    public UUID getCertificateId() { return certificateId; }
    public String getQrCode() { return qrCode; }
    public Instant getVerifiedAt() { return verifiedAt; }
    public String getVerifierIp() { return verifierIp; }
    public VerificationResult getVerificationResult() { return verificationResult; }
}
