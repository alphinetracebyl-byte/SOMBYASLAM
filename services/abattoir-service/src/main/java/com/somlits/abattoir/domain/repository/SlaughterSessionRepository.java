package com.somlits.abattoir.domain.repository;

import com.somlits.abattoir.domain.enums.SlaughterSessionStatus;
import com.somlits.abattoir.domain.model.SlaughterSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface SlaughterSessionRepository extends JpaRepository<SlaughterSession, UUID> {

    Optional<SlaughterSession> findBySessionCode(String sessionCode);

    boolean existsBySessionCodeAndStatus(String sessionCode, SlaughterSessionStatus status);

    Page<SlaughterSession> findByAbattoirPremisesId(UUID premisesId, Pageable pageable);

    Page<SlaughterSession> findByStatus(SlaughterSessionStatus status, Pageable pageable);

    Page<SlaughterSession> findBySessionDate(LocalDate date, Pageable pageable);

    boolean existsByAbattoirPremisesIdAndSessionDateAndStatus(
            UUID abattoirPremisesId, LocalDate sessionDate, SlaughterSessionStatus status);

    long countByAbattoirPremisesId(UUID abattoirPremisesId);
}
