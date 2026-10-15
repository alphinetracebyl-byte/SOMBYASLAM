package com.somlits.identityaccess.domain.repository;

import com.somlits.identityaccess.domain.enums.OtpType;
import com.somlits.identityaccess.domain.model.OtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;
import java.util.UUID;

public interface OtpVerificationRepository extends JpaRepository<OtpVerification, UUID> {

    @Query("SELECT o FROM OtpVerification o WHERE o.userId = :userId AND o.otpType = :type AND o.usedAt IS NULL ORDER BY o.createdAt DESC LIMIT 1")
    Optional<OtpVerification> findLatestUnusedByUserAndType(UUID userId, OtpType type);
}
