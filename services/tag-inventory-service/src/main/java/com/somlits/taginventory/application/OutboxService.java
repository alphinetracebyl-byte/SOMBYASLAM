package com.somlits.taginventory.application;

import com.somlits.taginventory.domain.entity.OutboxEvent;
import com.somlits.taginventory.domain.repository.OutboxEventRepository;
import com.somlits.taginventory.infrastructure.web.CorrelationIdFilter;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class OutboxService {

    private final OutboxEventRepository outboxRepo;

    public OutboxService(OutboxEventRepository outboxRepo) {
        this.outboxRepo = outboxRepo;
    }

    public void publish(String eventType, String aggregateType, UUID aggregateId, String payload) {
        String corrStr = MDC.get(CorrelationIdFilter.MDC_KEY);
        UUID correlationId = corrStr != null ? UUID.fromString(corrStr) : UUID.randomUUID();
        outboxRepo.save(OutboxEvent.of(eventType, aggregateType, aggregateId, payload, correlationId));
    }
}
