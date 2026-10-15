package com.somlits.quarantineexport.domain.repository;

import com.somlits.quarantineexport.domain.model.QuarantineLot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QuarantineLotRepository extends JpaRepository<QuarantineLot, UUID> {

    List<QuarantineLot> findByConsignmentId(UUID consignmentId);
}
