package com.somlits.certification.domain.repository;

import com.somlits.certification.domain.enums.CertificateType;
import com.somlits.certification.domain.model.CertificateTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CertificateTemplateRepository extends JpaRepository<CertificateTemplate, UUID> {

    Optional<CertificateTemplate> findByTemplateCode(String templateCode);

    List<CertificateTemplate> findByIsActiveTrue();

    Optional<CertificateTemplate> findByCertificateTypeAndIsActiveTrue(CertificateType certificateType);
}
