package com.somlits.markettrade.domain.repository;

import com.somlits.markettrade.domain.model.SaleRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SaleRecordRepository extends JpaRepository<SaleRecord, UUID> {
    Page<SaleRecord> findBySessionId(UUID sessionId, Pageable pageable);
    List<SaleRecord> findByAnimalId(UUID animalId);
    List<SaleRecord> findBySellerOwnerId(UUID sellerOwnerId);
    List<SaleRecord> findByBuyerOwnerId(UUID buyerOwnerId);
    boolean existsByMarketEntryId(UUID marketEntryId);
}
