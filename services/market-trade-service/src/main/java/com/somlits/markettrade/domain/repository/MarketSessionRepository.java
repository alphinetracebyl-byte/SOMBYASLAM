package com.somlits.markettrade.domain.repository;

import com.somlits.markettrade.domain.enums.MarketSessionStatus;
import com.somlits.markettrade.domain.model.MarketSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface MarketSessionRepository extends JpaRepository<MarketSession, UUID> {
    Page<MarketSession> findByMarketPremisesId(UUID marketPremisesId, Pageable pageable);
    Page<MarketSession> findByStatus(MarketSessionStatus status, Pageable pageable);
    Page<MarketSession> findBySessionDate(LocalDate sessionDate, Pageable pageable);
    Page<MarketSession> findByMarketPremisesIdAndStatus(UUID marketPremisesId, MarketSessionStatus status, Pageable pageable);
}
