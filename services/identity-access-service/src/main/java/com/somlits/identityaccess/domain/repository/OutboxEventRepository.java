package com.somlits.identityaccess.domain.repository;

import com.somlits.identityaccess.domain.model.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    @Query(value = "SELECT * FROM outbox_events WHERE published_at IS NULL ORDER BY occurred_at ASC LIMIT :batchSize",
           nativeQuery = true)
    List<OutboxEvent> findUnpublished(int batchSize);
}
