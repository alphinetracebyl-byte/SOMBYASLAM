package com.somlits.vethealth.domain.repository;

import com.somlits.vethealth.domain.entity.HealthEvent;
import com.somlits.vethealth.domain.enums.HealthEventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface HealthEventRepository extends JpaRepository<HealthEvent, UUID> {
    Page<HealthEvent> findByAnimalId(UUID animalId, Pageable pageable);
    List<HealthEvent> findByPremisesId(UUID premisesId);
    List<HealthEvent> findByEventType(HealthEventType eventType);
    Page<HealthEvent> findByResponsibleVetId(UUID responsibleVetId, Pageable pageable);
}
