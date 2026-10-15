package com.somlits.animalregistry.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.animalregistry.api.v1.dto.request.TagApplicationRequest;
import com.somlits.animalregistry.api.v1.dto.request.TagReplacementRequest;
import com.somlits.animalregistry.domain.enums.AnimalStatus;
import com.somlits.animalregistry.domain.enums.TagAssignmentStatus;
import com.somlits.animalregistry.domain.enums.TagCloseReason;
import com.somlits.animalregistry.domain.enums.TagReplacementReason;
import com.somlits.animalregistry.domain.exception.BusinessRuleViolationException;
import com.somlits.animalregistry.domain.exception.DomainConflictException;
import com.somlits.animalregistry.domain.exception.DomainNotFoundException;
import com.somlits.animalregistry.domain.model.AnimalRecord;
import com.somlits.animalregistry.domain.model.AnimalStatusHistory;
import com.somlits.animalregistry.domain.model.TagAssignment;
import com.somlits.animalregistry.domain.repository.AnimalRecordRepository;
import com.somlits.animalregistry.domain.repository.AnimalStatusHistoryRepository;
import com.somlits.animalregistry.domain.repository.TagAssignmentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TagManagementService {

    private static final Logger log = LoggerFactory.getLogger(TagManagementService.class);

    private final AnimalRecordRepository animalRepo;
    private final TagAssignmentRepository tagRepo;
    private final AnimalStatusHistoryRepository historyRepo;
    private final OutboxService outbox;
    private final ObjectMapper objectMapper;

    public TagManagementService(AnimalRecordRepository animalRepo, TagAssignmentRepository tagRepo,
                                 AnimalStatusHistoryRepository historyRepo, OutboxService outbox,
                                 ObjectMapper objectMapper) {
        this.animalRepo = animalRepo;
        this.tagRepo = tagRepo;
        this.historyRepo = historyRepo;
        this.outbox = outbox;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public TagAssignment applyTag(UUID animalId, TagApplicationRequest req, UUID callerUserId) {
        AnimalRecord animal = animalRepo.findById(animalId)
                .orElseThrow(() -> new DomainNotFoundException("Animal not found: " + animalId));

        if (animal.isTerminal()) {
            throw new BusinessRuleViolationException("ERR-AR-008",
                    "Cannot apply tag to animal in status " + animal.getStatus());
        }

        if (tagRepo.existsByTagSerialAndStatus(req.getTagSerial(), TagAssignmentStatus.ACTIVE)) {
            throw new DomainConflictException("ERR-AR-006",
                    "Tag serial " + req.getTagSerial() + " is already assigned to another animal");
        }

        if (tagRepo.findByAnimalIdAndStatus(animalId, TagAssignmentStatus.ACTIVE).isPresent()) {
            throw new BusinessRuleViolationException("ERR-AR-007",
                    "Animal already has an ACTIVE tag assignment");
        }

        animal.applyTag(req.getTagSerial());
        animalRepo.save(animal);

        TagAssignment assignment = TagAssignment.create(animalId, req.getTagSerial(),
                req.getAppliedBy() != null ? req.getAppliedBy() : callerUserId);
        tagRepo.save(assignment);

        publishEvent("TagAssignedToAnimalEvent", "AnimalRecord", animalId, Map.of(
                "animalId", animalId,
                "animalCode", animal.getAnimalCode(),
                "tagSerial", req.getTagSerial(),
                "ownerId", animal.getCurrentOwnerId()
        ));

        log.info("Tag applied: animal={} serial={}", animal.getAnimalCode(), req.getTagSerial());
        return assignment;
    }

    @Transactional
    public TagAssignment replaceTag(UUID animalId, TagReplacementRequest req, UUID callerUserId) {
        AnimalRecord animal = animalRepo.findById(animalId)
                .orElseThrow(() -> new DomainNotFoundException("Animal not found: " + animalId));

        if (animal.getStatus() != AnimalStatus.ACTIVE && animal.getStatus() != AnimalStatus.RESTRICTED) {
            throw new BusinessRuleViolationException("ERR-AR-008",
                    "Tag replacement only permitted for ACTIVE or RESTRICTED animals");
        }

        TagAssignment current = tagRepo.findByAnimalIdAndStatus(animalId, TagAssignmentStatus.ACTIVE)
                .orElseThrow(() -> new DomainNotFoundException("No ACTIVE tag assignment for animal " + animalId));

        if (tagRepo.existsByTagSerialAndStatus(req.getNewTagSerial(), TagAssignmentStatus.ACTIVE)) {
            throw new DomainConflictException("ERR-AR-006",
                    "New tag serial " + req.getNewTagSerial() + " is already assigned to another animal");
        }

        TagReplacementReason reason = TagReplacementReason.valueOf(req.getReason().toUpperCase());

        // Create new assignment first to get its ID for linking
        TagAssignment newAssignment = TagAssignment.create(animalId, req.getNewTagSerial(),
                req.getReplacedBy() != null ? req.getReplacedBy() : callerUserId);
        tagRepo.save(newAssignment);

        current.replace(reason, req.isNewTagSameNumber(), newAssignment.getId());
        tagRepo.save(current);

        animal.replaceTag(req.getNewTagSerial());
        animalRepo.save(animal);

        publishEvent("TagReplacedOnAnimalEvent", "AnimalRecord", animalId, Map.of(
                "animalId", animalId,
                "oldSerial", current.getTagSerial(),
                "newSerial", req.getNewTagSerial(),
                "reason", reason.name()
        ));

        publishEvent("TagReleasedEvent", "Tag", animalId, Map.of(
                "tagSerial", current.getTagSerial(),
                "animalId", animalId,
                "closeReason", TagCloseReason.REPLACED.name()
        ));

        log.info("Tag replaced on animal={}: {} → {}", animal.getAnimalCode(),
                current.getTagSerial(), req.getNewTagSerial());
        return newAssignment;
    }

    @Transactional(readOnly = true)
    public List<TagAssignment> listAssignments(UUID animalId) {
        return tagRepo.findByAnimalIdOrderByAssignedAtDesc(animalId);
    }

    private void publishEvent(String type, String aggType, UUID aggId, Map<String, Object> payload) {
        try {
            outbox.publish(type, aggType, aggId, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.error("Failed to serialize outbox event {}: {}", type, e.getMessage());
        }
    }
}
