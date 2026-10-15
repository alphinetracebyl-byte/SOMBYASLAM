package com.somlits.certification.domain.repository;

import com.somlits.certification.domain.model.Certificate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CertificateRepository extends JpaRepository<Certificate, UUID> {

    Optional<Certificate> findByCertificateNumber(String certificateNumber);

    Optional<Certificate> findByQrCode(String qrCode);

    List<Certificate> findBySubjectAnimalIdOrderByIssuedAtDesc(UUID subjectAnimalId);

    List<Certificate> findBySubjectConsignmentId(UUID subjectConsignmentId);

    Page<Certificate> findAll(Pageable pageable);
}
