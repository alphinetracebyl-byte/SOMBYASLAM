package com.somlits.movementtracking.application;

import com.somlits.movementtracking.domain.repository.MovementRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Component
public class PermitExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(PermitExpiryScheduler.class);

    private final MovementRepository movementRepo;
    private final OutboxService outbox;

    public PermitExpiryScheduler(MovementRepository movementRepo, OutboxService outbox) {
        this.movementRepo = movementRepo;
        this.outbox = outbox;
    }

    @Scheduled(fixedDelay = 300_000)
    @Transactional
    public void expireOverduePermits() {
        var expired = movementRepo.findExpiredPermits(Instant.now());
        expired.forEach(m -> {
            m.expire();
            outbox.publish("MovementPermitExpired", "Movement", m.getId(),
                    "{\"movementCode\":\"" + m.getMovementCode() + "\"}");
            log.info("Permit expired for movement {}", m.getMovementCode());
        });
        if (!expired.isEmpty()) {
            log.info("Expired {} overdue movement permits", expired.size());
        }
    }
}
