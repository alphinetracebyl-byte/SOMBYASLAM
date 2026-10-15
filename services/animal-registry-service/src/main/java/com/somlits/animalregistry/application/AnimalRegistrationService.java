package com.somlits.animalregistry.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.animalregistry.api.v1.dto.request.RegistrationRequest;
import com.somlits.animalregistry.api.v1.dto.request.RejectRegistrationRequest;
import com.somlits.animalregistry.api.v1.dto.request.VerifyRegistrationRequest;
import com.somlits.animalregistry.domain.BreedValidator;
import com.somlits.animalregistry.domain.enums.AnimalStatus;
import com.somlits.animalregistry.domain.enums.DobPrecision;
import com.somlits.animalregistry.domain.enums.Sex;
import com.somlits.animalregistry.domain.enums.SourceType;
import com.somlits.animalregistry.domain.enums.Species;
import com.somlits.animalregistry.domain.enums.SubmissionStatus;
import com.somlits.animalregistry.domain.enums.SubmissionType;
import com.somlits.animalregistry.domain.enums.TagAssignmentStatus;
import com.somlits.animalregistry.domain.exception.BusinessRuleViolationException;
import com.somlits.animalregistry.domain.exception.DomainConflictException;
import com.somlits.animalregistry.domain.exception.DomainNotFoundException;
import com.somlits.animalregistry.domain.model.AnimalRecord;
import com.somlits.animalregistry.domain.model.AnimalStatusHistory;
import com.somlits.animalregistry.domain.model.OwnershipRecord;
import com.somlits.animalregistry.domain.model.PremisesAssignment;
import com.somlits.animalregistry.domain.model.RegistrationSubmission;
import com.somlits.animalregistry.domain.model.TagAssignment;
import com.somlits.animalregistry.domain.repository.AnimalRecordRepository;
import com.somlits.animalregistry.domain.repository.AnimalStatusHistoryRepository;
import com.somlits.animalregistry.domain.repository.OwnershipRecordRepository;
import com.somlits.animalregistry.domain.repository.PremisesAssignmentRepository;
import com.somlits.animalregistry.domain.repository.RegistrationSubmissionRepository;
import com.somlits.animalregistry.domain.repository.TagAssignmentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Service
public class AnimalRegistrationService {

    private static final Logger log = LoggerFactory.getLogger(AnimalRegistrationService.class);

    private final AnimalRecordRepository animalRepo;
    private final RegistrationSubmissionRepository submissionRepo;
    private final TagAssignmentRepository tagAssignmentRepo;
    private final OwnershipRecordRepository ownershipRepo;
    private final PremisesAssignmentRepository premisesRepo;
    private final AnimalStatusHistoryRepository historyRepo;
    private final AnimalCodeGenerator codeGenerator;
    private final OutboxService outbox;
    private final ObjectMapper objectMapper;

    public AnimalRegistrationService(
            AnimalRecordRepository animalRepo,
            RegistrationSubmissionRepository submissionRepo,
            TagAssignmentRepository tagAssignmentRepo,
            OwnershipRecordRepository ownershipRepo,
            PremisesAssignmentRepository premisesRepo,
            AnimalStatusHistoryRepository historyRepo,
            AnimalCodeGenerator codeGenerator,
            OutboxService outbox,
            ObjectMapper objectMapper) {
        this.animalRepo = animalRepo;
        this.submissionRepo = submissionRepo;
        this.tagAssignmentRepo = tagAssignmentRepo;
        this.ownershipRepo = ownershipRepo;
        this.premisesRepo = premisesRepo;
        this.historyRepo = historyRepo;
        this.codeGenerator = codeGenerator;
        this.outbox = outbox;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public RegistrationSubmission register(RegistrationRequest req, UUID callerUserId) {
        // Idempotency check
        var existing = submissionRepo.findByIdempotencyKey(req.getIdempotencyKey());
        if (existing.isPresent()) {
            return existing.get();
        }

        // Validate enums
        Species species = parseEnum(Species.class, req.getSpecies(), "species");
        Sex sex = parseEnum(Sex.class, req.getSex(), "sex");
        SubmissionType submissionType = parseEnum(SubmissionType.class, req.getSubmissionType(), "submissionType");
        DobPrecision dobPrecision = req.getDobPrecision() != null
                ? parseEnum(DobPrecision.class, req.getDobPrecision(), "dobPrecision")
                : DobPrecision.UNKNOWN;

        // Validate breed
        if (!BreedValidator.isValid(species, req.getBreed())) {
            throw new BusinessRuleViolationException("ERR-AR-003",
                    "Breed '" + req.getBreed() + "' is not valid for species " + species);
        }

        // Validate DOB not future
        if (req.getDob() != null && req.getDob().isAfter(LocalDate.now())) {
            throw new BusinessRuleViolationException("ERR-AR-004", "Date of birth cannot be in the future");
        }

        // IMPORT requires permit
        if (submissionType == SubmissionType.IMPORT
                && (req.getImportPermitNumber() == null || req.getImportPermitNumber().isBlank())) {
            throw new BusinessRuleViolationException("ERR-AR-011",
                    "Import permit number is required for IMPORT registrations");
        }

        // Tag must not already be assigned
        if (tagAssignmentRepo.existsByTagSerialAndStatus(req.getTagSerial(), TagAssignmentStatus.ACTIVE)) {
            throw new DomainConflictException("ERR-AR-006",
                    "Tag serial " + req.getTagSerial() + " is already ASSIGNED_TO_ANIMAL");
        }

        String animalCode = codeGenerator.next();

        AnimalRecord animal = AnimalRecord.create(
                animalCode, species, req.getBreed().toUpperCase(), sex,
                req.getDob(), dobPrecision,
                req.getCoatColor(), req.getDistinguishingMarks(),
                req.getOwnerId(), req.getPremisesId(),
                submissionType, callerUserId,
                req.getBatchId(), req.getBatchCode());
        animal.applyTag(req.getTagSerial());
        animalRepo.save(animal);

        // Create submission code
        String submissionCode = "REG-" + animalCode.substring(4);

        RegistrationSubmission submission = RegistrationSubmission.create(
                submissionCode, animal.getId(), submissionType, callerUserId, req.getIdempotencyKey());

        if (submissionType == SubmissionType.PURCHASE && req.getSourceType() != null) {
            submission.setSourceType(parseEnum(SourceType.class, req.getSourceType(), "sourceType"));
            submission.setSourceDescription(req.getSourceDescription());
        }
        if (submissionType == SubmissionType.IMPORT) {
            submission.setImportPermitNumber(req.getImportPermitNumber());
            submission.setCountryOfOrigin(req.getCountryOfOrigin());
            submission.setForeignIdNumber(req.getForeignIdNumber());
        }
        submissionRepo.save(submission);

        // Ownership history
        ownershipRepo.save(OwnershipRecord.create(animal.getId(), req.getOwnerId(), callerUserId));

        // Premises history
        premisesRepo.save(PremisesAssignment.create(animal.getId(), req.getPremisesId(), callerUserId));

        // Status history
        historyRepo.save(AnimalStatusHistory.of(animal.getId(), null, AnimalStatus.DRAFT.name(),
                "Registration submitted", submission.getId(), callerUserId));

        // Publish outbox event
        var eventPayload = new java.util.HashMap<String, Object>(Map.of(
                "submissionId", submission.getId(),
                "animalId", animal.getId(),
                "animalCode", animalCode,
                "ownerId", req.getOwnerId(),
                "premisesId", req.getPremisesId(),
                "species", species.name(),
                "submissionType", submissionType.name()
        ));
        if (req.getBatchCode() != null) {
            eventPayload.put("batchCode", req.getBatchCode());
            eventPayload.put("batchId", req.getBatchId());
        }
        publishEvent("AnimalRegistrationSubmittedEvent", "AnimalRecord", animal.getId(), eventPayload);

        log.info("Animal registration submitted: code={} type={}", animalCode, submissionType);
        return submission;
    }

    @Transactional
    public AnimalRecord verify(UUID submissionId, VerifyRegistrationRequest req, UUID officerUserId) {
        RegistrationSubmission sub = submissionRepo.findById(submissionId)
                .orElseThrow(() -> new DomainNotFoundException("Submission not found: " + submissionId));

        if (sub.getStatus() != SubmissionStatus.SUBMITTED) {
            throw new BusinessRuleViolationException("ERR-AR-008",
                    "Submission is not in SUBMITTED status (current: " + sub.getStatus() + ")");
        }

        AnimalRecord animal = animalRepo.findById(sub.getAnimalId())
                .orElseThrow(() -> new DomainNotFoundException("Animal not found: " + sub.getAnimalId()));

        String previousStatus = animal.getStatus().name();

        sub.verify(officerUserId, req.getOfficerNotes());
        submissionRepo.save(sub);

        String tagSerial = animal.getActiveTagSerial();
        animal.submit();
        animal.verify(tagSerial);
        animalRepo.save(animal);

        if (tagSerial != null) {
            tagAssignmentRepo.save(TagAssignment.create(animal.getId(), tagSerial, officerUserId));
        }

        historyRepo.save(AnimalStatusHistory.of(animal.getId(), previousStatus, AnimalStatus.ACTIVE.name(),
                "Registration verified by officer", sub.getId(), officerUserId));

        publishEvent("AnimalRegisteredEvent", "AnimalRecord", animal.getId(), Map.of(
                "animalId", animal.getId(),
                "animalCode", animal.getAnimalCode(),
                "ownerId", animal.getCurrentOwnerId(),
                "premisesId", animal.getCurrentPremisesId(),
                "species", animal.getSpecies().name(),
                "breed", animal.getBreed()
        ));

        log.info("Animal verified: code={}", animal.getAnimalCode());
        return animal;
    }

    @Transactional
    public void reject(UUID submissionId, RejectRegistrationRequest req, UUID officerUserId) {
        RegistrationSubmission sub = submissionRepo.findById(submissionId)
                .orElseThrow(() -> new DomainNotFoundException("Submission not found: " + submissionId));

        if (sub.getStatus() != SubmissionStatus.SUBMITTED) {
            throw new BusinessRuleViolationException("ERR-AR-008",
                    "Submission is not in SUBMITTED status");
        }

        sub.reject(officerUserId, req.getRejectionReason());
        submissionRepo.save(sub);

        AnimalRecord animal = animalRepo.findById(sub.getAnimalId())
                .orElseThrow(() -> new DomainNotFoundException("Animal not found: " + sub.getAnimalId()));
        animal.reject();
        animalRepo.save(animal);

        historyRepo.save(AnimalStatusHistory.of(animal.getId(), AnimalStatus.SUBMITTED.name(),
                AnimalStatus.DRAFT.name(), "Registration rejected: " + req.getRejectionReason(),
                sub.getId(), officerUserId));

        log.info("Animal registration rejected: submissionId={}", submissionId);
    }

    private <T extends Enum<T>> T parseEnum(Class<T> type, String value, String field) {
        try {
            return Enum.valueOf(type, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessRuleViolationException("ERR-AR-003",
                    "Invalid value '" + value + "' for field " + field);
        }
    }

    private void publishEvent(String type, String aggType, UUID aggId, Map<String, Object> payload) {
        try {
            outbox.publish(type, aggType, aggId, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.error("Failed to serialize outbox event {}: {}", type, e.getMessage());
        }
    }
}
