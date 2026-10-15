package com.somlits.abattoir.domain.repository;

import com.somlits.abattoir.domain.enums.SlaughterRecordStatus;
import com.somlits.abattoir.domain.model.SlaughterRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SlaughterRecordRepository extends JpaRepository<SlaughterRecord, UUID> {

    Optional<SlaughterRecord> findByRecordCode(String recordCode);

    Page<SlaughterRecord> findBySessionId(UUID sessionId, Pageable pageable);

    List<SlaughterRecord> findByAnimalId(UUID animalId);

    boolean existsByAnimalIdAndSessionId(UUID animalId, UUID sessionId);

    Page<SlaughterRecord> findByStatus(SlaughterRecordStatus status, Pageable pageable);

    long countBySessionIdAndStatus(UUID sessionId, SlaughterRecordStatus status);

    long countBySessionId(UUID sessionId);
}
