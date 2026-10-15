package com.somlits.animalregistry.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.animalregistry.api.v1.dto.request.ConfiscationRequest;
import com.somlits.animalregistry.api.v1.dto.request.DeathNotificationRequest;
import com.somlits.animalregistry.api.v1.dto.request.ExportDeclarationRequest;
import com.somlits.animalregistry.api.v1.dto.request.OwnerTransferRequest;
import com.somlits.animalregistry.api.v1.dto.request.SlaughterNotificationRequest;
import com.somlits.animalregistry.domain.enums.AnimalStatus;
import com.somlits.animalregistry.domain.enums.TagAssignmentStatus;
import com.somlits.animalregistry.domain.enums.TagCloseReason;
import com.somlits.animalregistry.domain.exception.DomainNotFoundException;
import com.somlits.animalregistry.domain.model.AnimalRecord;
import com.somlits.animalregistry.domain.model.AnimalStatusHistory;
import com.somlits.animalregistry.domain.model.ConfiscationEvent;
import com.somlits.animalregistry.domain.model.DeathEvent;
import com.somlits.animalregistry.domain.model.ExportEvent;
import com.somlits.animalregistry.domain.model.OwnershipRecord;
import com.somlits.animalregistry.domain.model.PremisesAssignment;
import com.somlits.animalregistry.domain.model.SlaughterEvent;
import com.somlits.animalregistry.domain.repository.AnimalRecordRepository;
import com.somlits.animalregistry.domain.repository.AnimalStatusHistoryRepository;
import com.somlits.animalregistry.domain.repository.OwnershipRecordRepository;
import com.somlits.animalregistry.domain.repository.PremisesAssignmentRepository;
import com.somlits.animalregistry.domain.repository.TagAssignmentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Service
public class AnimalLifecycleService {

    private static final Logger log = LoggerFactory.getLogger(AnimalLifecycleService.class);

    private final AnimalRecordRepository animalRepo;
    private final TagAssignmentRepository tagRepo;
    private final OwnershipRecordRepository ownershipRepo;
    private final PremisesAssignmentRepository premisesRepo;
    private final AnimalStatusHistoryRepository historyRepo;
    private final OutboxService outbox;
    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbc;

    public AnimalLifecycleService(AnimalRecordRepository animalRepo,
                                   TagAssignmentRepository tagRepo,
                                   OwnershipRecordRepository ownershipRepo,
                                   PremisesAssignmentRepository premisesRepo,
                                   AnimalStatusHistoryRepository historyRepo,
                                   OutboxService outbox,
                                   ObjectMapper objectMapper,
                                   JdbcTemplate jdbc) {
        this.animalRepo = animalRepo;
        this.tagRepo = tagRepo;
        this.ownershipRepo = ownershipRepo;
        this.premisesRepo = premisesRepo;
        this.historyRepo = historyRepo;
        this.outbox = outbox;
        this.objectMapper = objectMapper;
        this.jdbc = jdbc;
    }

    @Transactional
    public void notifyDeath(UUID animalId, DeathNotificationRequest req, UUID callerUserId) {
        AnimalRecord animal = requireAnimal(animalId);
        String prevStatus = animal.getStatus().name();
        String tagSerial = animal.getActiveTagSerial();

        animal.markDead(req.getDeathDate().atStartOfDay(java.time.ZoneOffset.UTC).toInstant());
        animalRepo.save(animal);

        // Retire active tag
        retireActiveTag(animalId, TagCloseReason.ANIMAL_DEAD);

        // Persist death event
        jdbc.update("""
            INSERT INTO death_event (id, animal_id, death_date, cause_of_death, location_description, notes, recorded_by, recorded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            """,
                UUID.randomUUID(), animalId, req.getDeathDate(), req.getCauseOfDeath(),
                req.getLocationDescription(), req.getNotes(), callerUserId);

        UUID eventId = UUID.randomUUID();
        historyRepo.save(AnimalStatusHistory.of(animalId, prevStatus, AnimalStatus.DEAD.name(),
                "Death notified: " + req.getCauseOfDeath(), eventId, callerUserId));

        publishEvent("AnimalDiedEvent", "AnimalRecord", animalId, Map.of(
                "animalId", animalId, "ownerId", animal.getCurrentOwnerId(),
                "tagSerial", tagSerial != null ? tagSerial : "", "deathDate", req.getDeathDate().toString()
        ));
        if (tagSerial != null) {
            publishEvent("TagRetiredEvent", "Tag", animalId, Map.of(
                    "tagSerial", tagSerial, "animalId", animalId, "retirementReason", "ANIMAL_DEAD"));
        }
        log.info("Death recorded: animal={}", animal.getAnimalCode());
    }

    @Transactional
    public void notifySlaughter(UUID animalId, SlaughterNotificationRequest req, UUID callerUserId) {
        AnimalRecord animal = requireAnimal(animalId);
        String prevStatus = animal.getStatus().name();
        String tagSerial = animal.getActiveTagSerial();

        animal.markSlaughtered(req.getSlaughterDate().atStartOfDay(java.time.ZoneOffset.UTC).toInstant());
        animalRepo.save(animal);

        retireActiveTag(animalId, TagCloseReason.ANIMAL_SLAUGHTERED);

        jdbc.update("""
            INSERT INTO slaughter_event (id, animal_id, slaughter_date, abattoir_id, slaughter_ref, recorded_by, recorded_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
            """,
                UUID.randomUUID(), animalId, req.getSlaughterDate(),
                req.getAbattoirId(), req.getSlaughterRef(), callerUserId);

        historyRepo.save(AnimalStatusHistory.of(animalId, prevStatus, AnimalStatus.SLAUGHTERED.name(),
                "Slaughter notified at abattoir " + req.getAbattoirId(), null, callerUserId));

        publishEvent("AnimalSlaughteredEvent", "AnimalRecord", animalId, Map.of(
                "animalId", animalId, "abattoirId", req.getAbattoirId(),
                "slaughterDate", req.getSlaughterDate().toString()
        ));
        if (tagSerial != null) {
            publishEvent("TagRetiredEvent", "Tag", animalId, Map.of(
                    "tagSerial", tagSerial, "animalId", animalId, "retirementReason", "ANIMAL_SLAUGHTERED"));
        }
        log.info("Slaughter recorded: animal={}", animal.getAnimalCode());
    }

    @Transactional
    public void declareExport(UUID animalId, ExportDeclarationRequest req, UUID callerUserId) {
        AnimalRecord animal = requireAnimal(animalId);
        String prevStatus = animal.getStatus().name();
        String tagSerial = animal.getActiveTagSerial();

        animal.markExported(req.getExportDate().atStartOfDay(java.time.ZoneOffset.UTC).toInstant());
        animalRepo.save(animal);

        retireActiveTag(animalId, TagCloseReason.ANIMAL_EXPORTED);

        jdbc.update("""
            INSERT INTO export_event (id, animal_id, export_date, border_post_id, export_permit_ref, destination_country, recorded_by, recorded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            """,
                UUID.randomUUID(), animalId, req.getExportDate(), req.getBorderPostId(),
                req.getExportPermitRef(), req.getDestinationCountry(), callerUserId);

        historyRepo.save(AnimalStatusHistory.of(animalId, prevStatus, AnimalStatus.EXPORTED.name(),
                "Export declared: permit " + req.getExportPermitRef(), null, callerUserId));

        publishEvent("AnimalExportedEvent", "AnimalRecord", animalId, Map.of(
                "animalId", animalId, "exportDate", req.getExportDate().toString(),
                "destinationCountry", req.getDestinationCountry()
        ));
        if (tagSerial != null) {
            publishEvent("TagRetiredEvent", "Tag", animalId, Map.of(
                    "tagSerial", tagSerial, "animalId", animalId, "retirementReason", "ANIMAL_EXPORTED"));
        }
        log.info("Export declared: animal={}", animal.getAnimalCode());
    }

    @Transactional
    public void confiscate(UUID animalId, ConfiscationRequest req, UUID officerUserId) {
        AnimalRecord animal = requireAnimal(animalId);
        String prevStatus = animal.getStatus().name();

        animal.confiscate();
        animalRepo.save(animal);

        jdbc.update("""
            INSERT INTO confiscation_event (id, animal_id, confiscation_date, reason, location_description, enforcement_order_ref, enforcement_officer_id, recorded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            """,
                UUID.randomUUID(), animalId, req.getConfiscationDate(), req.getReason(),
                req.getLocationDescription(), req.getEnforcementOrderRef(), officerUserId);

        historyRepo.save(AnimalStatusHistory.of(animalId, prevStatus, AnimalStatus.CONFISCATED.name(),
                "Confiscation: " + req.getEnforcementOrderRef(), null, officerUserId));

        publishEvent("AnimalConfiscatedEvent", "AnimalRecord", animalId, Map.of(
                "animalId", animalId, "enforcementOrderRef", req.getEnforcementOrderRef()));
        log.info("Confiscation recorded: animal={}", animal.getAnimalCode());
    }

    @Transactional
    public void releaseConfiscation(UUID animalId, String releaseReason, UUID adminUserId) {
        AnimalRecord animal = requireAnimal(animalId);
        animal.release();
        animalRepo.save(animal);

        historyRepo.save(AnimalStatusHistory.of(animalId, AnimalStatus.CONFISCATED.name(),
                AnimalStatus.ACTIVE.name(), "Released: " + releaseReason, null, adminUserId));

        publishEvent("AnimalReleasedFromConfiscationEvent", "AnimalRecord", animalId, Map.of(
                "animalId", animalId, "releasedBy", adminUserId, "releaseReason", releaseReason));
        log.info("Animal released from confiscation: animal={}", animal.getAnimalCode());
    }

    @Transactional
    public AnimalRecord transferOwner(UUID animalId, OwnerTransferRequest req, UUID callerUserId) {
        AnimalRecord animal = requireAnimal(animalId);
        UUID prevOwnerId = animal.getCurrentOwnerId();

        // Close current ownership
        ownershipRepo.findByAnimalIdAndEndedAtIsNull(animalId).ifPresent(o -> {
            o.close(req.getTransferReference(), req.getNotes());
            ownershipRepo.save(o);
        });

        // Close current premises
        premisesRepo.findByAnimalIdAndEndedAtIsNull(animalId).ifPresent(p -> {
            p.close("Owner transfer");
            premisesRepo.save(p);
        });

        // New ownership and premises
        ownershipRepo.save(OwnershipRecord.create(animalId, req.getNewOwnerId(), callerUserId));
        premisesRepo.save(PremisesAssignment.create(animalId, req.getNewPremisesId(), callerUserId));

        animal.transferOwner(req.getNewOwnerId());
        animal.assignPremises(req.getNewPremisesId());
        animalRepo.save(animal);

        publishEvent("AnimalOwnerTransferredEvent", "AnimalRecord", animalId, Map.of(
                "animalId", animalId,
                "previousOwnerId", prevOwnerId,
                "newOwnerId", req.getNewOwnerId()
        ));
        log.info("Owner transferred: animal={} from={} to={}", animal.getAnimalCode(), prevOwnerId, req.getNewOwnerId());
        return animal;
    }

    private AnimalRecord requireAnimal(UUID animalId) {
        return animalRepo.findById(animalId)
                .orElseThrow(() -> new DomainNotFoundException("Animal not found: " + animalId));
    }

    private void retireActiveTag(UUID animalId, TagCloseReason reason) {
        tagRepo.findByAnimalIdAndStatus(animalId, TagAssignmentStatus.ACTIVE).ifPresent(t -> {
            t.retire(reason);
            tagRepo.save(t);
        });
    }

    private void publishEvent(String type, String aggType, UUID aggId, Map<String, Object> payload) {
        try {
            outbox.publish(type, aggType, aggId, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.error("Failed to serialize outbox event {}: {}", type, e.getMessage());
        }
    }
}
