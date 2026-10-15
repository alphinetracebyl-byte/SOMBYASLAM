package com.somlits.markettrade.domain.repository;

import com.somlits.markettrade.domain.model.MarketEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MarketEntryRepository extends JpaRepository<MarketEntry, UUID> {
    Page<MarketEntry> findBySessionId(UUID sessionId, Pageable pageable);
    List<MarketEntry> findByAnimalId(UUID animalId);
    List<MarketEntry> findByOwnerId(UUID ownerId);
    Optional<MarketEntry> findByAnimalIdAndSessionId(UUID animalId, UUID sessionId);
}
