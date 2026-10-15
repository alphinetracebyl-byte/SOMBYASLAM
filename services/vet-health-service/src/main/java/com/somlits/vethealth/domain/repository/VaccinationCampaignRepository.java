package com.somlits.vethealth.domain.repository;

import com.somlits.vethealth.domain.entity.VaccinationCampaign;
import com.somlits.vethealth.domain.enums.CampaignStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface VaccinationCampaignRepository extends JpaRepository<VaccinationCampaign, UUID> {
    Page<VaccinationCampaign> findByStatus(CampaignStatus status, Pageable pageable);
    List<VaccinationCampaign> findByTargetRegionCode(String targetRegionCode);
    Page<VaccinationCampaign> findByStatusAndTargetRegionCode(CampaignStatus status, String regionCode, Pageable pageable);
    Page<VaccinationCampaign> findByTargetRegionCode(String targetRegionCode, Pageable pageable);
}
