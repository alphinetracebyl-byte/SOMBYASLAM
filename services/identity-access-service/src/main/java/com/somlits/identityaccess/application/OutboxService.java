package com.somlits.identityaccess.application;

import com.somlits.identityaccess.domain.model.OutboxEvent;
import com.somlits.identityaccess.domain.repository.OutboxEventRepository;
import com.somlits.identityaccess.infrastructure.web.CorrelationIdFilter;
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
        String correlationIdStr = MDC.get(CorrelationIdFilter.MDC_KEY);
        UUID correlationId = correlationIdStr != null ? UUID.fromString(correlationIdStr) : UUID.randomUUID();
        var event = OutboxEvent.of(eventType, aggregateType, aggregateId, payload.strip(), correlationId);
        outboxRepo.save(event);
    }
}
