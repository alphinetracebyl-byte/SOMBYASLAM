package com.somlits.premises.domain.repository;

import com.somlits.premises.domain.entity.PremisesStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PremisesStatusHistoryRepository extends JpaRepository<PremisesStatusHistory, UUID> {

    List<PremisesStatusHistory> findByPremisesIdOrderByChangedAtAsc(UUID premisesId);
}
