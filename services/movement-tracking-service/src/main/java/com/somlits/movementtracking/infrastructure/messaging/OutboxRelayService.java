package com.somlits.movementtracking.infrastructure.messaging;

import com.azure.messaging.servicebus.ServiceBusMessage;
import com.azure.messaging.servicebus.ServiceBusSenderClient;
import com.somlits.movementtracking.domain.model.OutboxEvent;
import com.somlits.movementtracking.domain.repository.OutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OutboxRelayService {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelayService.class);

    private final OutboxEventRepository outboxRepo;
    private final ServiceBusSenderClient senderClient;
    private final int batchSize;

    public OutboxRelayService(OutboxEventRepository outboxRepo,
                               ServiceBusSenderClient senderClient,
                               @Value("${somlits.outbox.relay.batch-size:100}") int batchSize) {
        this.outboxRepo = outboxRepo;
        this.senderClient = senderClient;
        this.batchSize = batchSize;
    }

    @Scheduled(fixedDelayString = "${somlits.outbox.relay.poll-interval-ms:1000}")
    @Transactional
    public void relay() {
        var unpublished = outboxRepo.findUnpublished(batchSize);
        if (unpublished.isEmpty()) return;

        for (OutboxEvent event : unpublished) {
            try {
                var message = new ServiceBusMessage(event.getPayload());
                message.setMessageId(event.getId().toString());
                message.getApplicationProperties().put("eventType", event.getEventType());
                message.getApplicationProperties().put("aggregateType", event.getAggregateType());
                message.getApplicationProperties().put("aggregateId", event.getAggregateId().toString());
                if (event.getCorrelationId() != null) {
                    message.setCorrelationId(event.getCorrelationId().toString());
                }
                message.setContentType("application/json");

                senderClient.sendMessage(message);
                event.markPublished();
                outboxRepo.save(event);

            } catch (Exception e) {
                log.error("Failed to publish outbox event id={} type={}: {}",
                        event.getId(), event.getEventType(), e.getMessage());
            }
        }

        log.debug("Outbox relay published {} events", unpublished.size());
    }
}
