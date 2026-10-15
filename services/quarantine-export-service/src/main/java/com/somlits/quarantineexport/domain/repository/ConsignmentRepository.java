package com.somlits.quarantineexport.domain.repository;

import com.somlits.quarantineexport.domain.enums.ConsignmentStatus;
import com.somlits.quarantineexport.domain.model.Consignment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConsignmentRepository extends JpaRepository<Consignment, UUID> {

    Optional<Consignment> findByConsignmentCode(String consignmentCode);

    List<Consignment> findByExporterOwnerIdOrderByCreatedAtDesc(UUID exporterOwnerId);

    List<Consignment> findByStatus(ConsignmentStatus status);

    @Query("SELECT c FROM Consignment c WHERE " +
           "(:status IS NULL OR c.status = :status) AND " +
           "(:exporterOwnerId IS NULL OR c.exporterOwnerId = :exporterOwnerId) AND " +
           "(:destinationCountry IS NULL OR c.destinationCountry = :destinationCountry)")
    Page<Consignment> search(ConsignmentStatus status, UUID exporterOwnerId,
                             String destinationCountry, Pageable pageable);
}
