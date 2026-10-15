package com.somlits.vethealth.domain.repository;

import com.somlits.vethealth.domain.entity.Sample;
import com.somlits.vethealth.domain.enums.SampleStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SampleRepository extends JpaRepository<Sample, UUID> {
    List<Sample> findByHealthEventId(UUID healthEventId);
    List<Sample> findByAnimalId(UUID animalId);
    List<Sample> findByStatus(SampleStatus status);
}
