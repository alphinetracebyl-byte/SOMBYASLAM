package com.somlits.certification.domain.repository;

import com.somlits.certification.domain.model.VerificationLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface VerificationLogRepository extends JpaRepository<VerificationLog, UUID> {

    List<VerificationLog> findByCertificateId(UUID certificateId);
}
