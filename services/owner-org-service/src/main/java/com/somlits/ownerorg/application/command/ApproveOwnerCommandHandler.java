package com.somlits.ownerorg.application.command;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.ownerorg.application.OutboxService;
import com.somlits.ownerorg.domain.entity.Owner;
import com.somlits.ownerorg.domain.entity.OwnerStatusHistory;
import com.somlits.ownerorg.domain.exception.DomainNotFoundException;
import com.somlits.ownerorg.domain.repository.OwnerRepository;
import com.somlits.ownerorg.domain.repository.OwnerStatusHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class ApproveOwnerCommandHandler {

    private static final Logger log = LoggerFactory.getLogger(ApproveOwnerCommandHandler.class);

    private final OwnerRepository ownerRepo;
    private final OwnerStatusHistoryRepository historyRepo;
    private final OutboxService outbox;
    private final ObjectMapper objectMapper;

    public ApproveOwnerCommandHandler(OwnerRepository ownerRepo,
                                      OwnerStatusHistoryRepository historyRepo,
                                      OutboxService outbox,
                                      ObjectMapper objectMapper) {
        this.ownerRepo = ownerRepo;
        this.historyRepo = historyRepo;
        this.outbox = outbox;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Owner handle(ApproveOwnerCommand cmd) {
        Owner owner = ownerRepo.findById(cmd.ownerId())
                .orElseThrow(() -> new DomainNotFoundException("Owner not found: " + cmd.ownerId()));

        String fromStatus = owner.getStatus().name();
        if (cmd.officerNotes() != null && !cmd.officerNotes().isBlank()) {
            owner.setOfficerNotes(cmd.officerNotes());
        }
        owner.approve(cmd.reviewedBy());
        ownerRepo.save(owner);

        historyRepo.save(OwnerStatusHistory.of(
                owner.getId(), fromStatus, owner.getStatus().name(),
                cmd.reviewedBy(), "Owner approved"));

        publishEvent("OwnerApprovedEvent", owner, Map.of(
                "ownerId", owner.getId(),
                "ownerCode", owner.getOwnerCode(),
                "ownerType", owner.getOwnerType().name(),
                "fullName", owner.getFullName()
        ));

        log.info("Owner approved: code={}", owner.getOwnerCode());
        return owner;
    }

    private void publishEvent(String type, Owner owner, Map<String, Object> payload) {
        try {
            outbox.publish(type, "Owner", owner.getId(), objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.error("Failed to serialize outbox event {}: {}", type, e.getMessage());
        }
    }
}
