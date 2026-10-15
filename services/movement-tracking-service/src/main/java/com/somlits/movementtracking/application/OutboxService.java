package com.somlits.movementtracking.application;

import com.somlits.movementtracking.domain.model.OutboxEvent;
import com.somlits.movementtracking.domain.repository.OutboxEventRepository;
import com.somlits.movementtracking.infrastructure.web.CorrelationIdFilter;
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
