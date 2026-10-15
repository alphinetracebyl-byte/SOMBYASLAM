package com.somlits.quarantineexport.domain.repository;

import com.somlits.quarantineexport.domain.model.ExportClearance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExportClearanceRepository extends JpaRepository<ExportClearance, UUID> {

    List<ExportClearance> findByConsignmentId(UUID consignmentId);

    List<ExportClearance> findByAnimalId(UUID animalId);
}
