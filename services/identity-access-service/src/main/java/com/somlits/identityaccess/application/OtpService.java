package com.somlits.identityaccess.application;

import com.somlits.identityaccess.domain.exception.BusinessRuleViolationException;
import com.somlits.identityaccess.domain.enums.OtpType;
import com.somlits.identityaccess.domain.model.OtpVerification;
import com.somlits.identityaccess.domain.repository.OtpVerificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    private static final int MAX_OTP_ATTEMPTS = 5;
    private final SecureRandom random = new SecureRandom();

    private final OtpVerificationRepository otpRepository;

    public OtpService(OtpVerificationRepository otpRepository) {
        this.otpRepository = otpRepository;
    }

    @Transactional
    public String generateAndStore(UUID userId, OtpType otpType) {
        String code = String.format("%06d", random.nextInt(1_000_000));
        String hash = sha256(code);
        var otp = OtpVerification.create(userId, hash, otpType);
        otpRepository.save(otp);

        // In local dev, log the OTP since notification-service is not yet deployed.
        // This line must NEVER reach production — remove once notification-service is live.
        log.info("[LOCAL-DEV-ONLY] OTP for user {} type {}: {}", userId, otpType, code);

        return code;
    }

    @Transactional
    public void verify(UUID userId, String submittedCode, OtpType otpType) {
        var otp = otpRepository.findLatestUnusedByUserAndType(userId, otpType)
                .orElseThrow(() -> new BusinessRuleViolationException("BR-IAM-014",
                        "No valid OTP found. Please request a new one."));

        if (otp.isExpired()) {
            throw new BusinessRuleViolationException("BR-IAM-014", "OTP has expired. Please request a new one.");
        }
        if (otp.isUsed()) {
            throw new BusinessRuleViolationException("BR-IAM-014", "OTP has already been used.");
        }
        if (!sha256(submittedCode).equals(otp.getOtpCodeHash())) {
            throw new BusinessRuleViolationException("BR-IAM-014", "Invalid OTP code.");
        }

        otp.markUsed();
        otpRepository.save(otp);
    }

    private String sha256(String input) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes());
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
