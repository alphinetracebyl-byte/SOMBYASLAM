package com.somlits.premises.domain.repository;

import com.somlits.premises.domain.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    @Query(value = "SELECT e FROM OutboxEvent e WHERE e.publishedAt IS NULL ORDER BY e.occurredAt ASC LIMIT :limit")
    List<OutboxEvent> findUnpublished(int limit);
}
