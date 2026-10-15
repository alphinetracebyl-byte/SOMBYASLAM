package com.somlits.traceability.domain.repository;

import com.somlits.traceability.domain.model.AuditEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

    List<AuditEvent> findByAggregateId(UUID aggregateId);

    List<AuditEvent> findByCorrelationId(UUID correlationId);

    Page<AuditEvent> findByPerformedBy(UUID performedBy, Pageable pageable);

    Page<AuditEvent> findByEventType(String eventType, Pageable pageable);

    Page<AuditEvent> findByAggregateType(String aggregateType, Pageable pageable);
}
