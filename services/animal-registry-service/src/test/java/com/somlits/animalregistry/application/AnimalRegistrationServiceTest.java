package com.somlits.animalregistry.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.animalregistry.api.v1.dto.request.RegistrationRequest;
import com.somlits.animalregistry.domain.enums.TagAssignmentStatus;
import com.somlits.animalregistry.domain.exception.BusinessRuleViolationException;
import com.somlits.animalregistry.domain.exception.DomainConflictException;
import com.somlits.animalregistry.domain.model.RegistrationSubmission;
import com.somlits.animalregistry.domain.repository.AnimalRecordRepository;
import com.somlits.animalregistry.domain.repository.AnimalStatusHistoryRepository;
import com.somlits.animalregistry.domain.repository.OutboxEventRepository;
import com.somlits.animalregistry.domain.repository.OwnershipRecordRepository;
import com.somlits.animalregistry.domain.repository.PremisesAssignmentRepository;
import com.somlits.animalregistry.domain.repository.RegistrationSubmissionRepository;
import com.somlits.animalregistry.domain.repository.TagAssignmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnimalRegistrationServiceTest {

    @Mock AnimalRecordRepository animalRepo;
    @Mock RegistrationSubmissionRepository submissionRepo;
    @Mock TagAssignmentRepository tagAssignmentRepo;
    @Mock OwnershipRecordRepository ownershipRepo;
    @Mock PremisesAssignmentRepository premisesRepo;
    @Mock AnimalStatusHistoryRepository historyRepo;
    @Mock AnimalCodeGenerator codeGenerator;
    @Mock OutboxEventRepository outboxRepo;

    AnimalRegistrationService service;

    @BeforeEach
    void setUp() {
        OutboxService outbox = new OutboxService(outboxRepo);
        service = new AnimalRegistrationService(
                animalRepo, submissionRepo, tagAssignmentRepo,
                ownershipRepo, premisesRepo, historyRepo,
                codeGenerator, outbox, new ObjectMapper());
    }

    @Test
    void register_returnsExistingSubmissionWhenIdempotencyKeyAlreadyExists() {
        UUID idempotencyKey = UUID.randomUUID();
        RegistrationSubmission existing = buildFakeSubmission(idempotencyKey);
        when(submissionRepo.findByIdempotencyKey(idempotencyKey)).thenReturn(Optional.of(existing));

        RegistrationRequest req = buildRequest(idempotencyKey);
        RegistrationSubmission result = service.register(req, UUID.randomUUID());

        assertThat(result).isSameAs(existing);
    }

    @Test
    void register_throwsWhenTagSerialAlreadyActive() {
        UUID idempotencyKey = UUID.randomUUID();
        when(submissionRepo.findByIdempotencyKey(idempotencyKey)).thenReturn(Optional.empty());
        when(tagAssignmentRepo.existsByTagSerialAndStatus("TG-DUPLICATE", TagAssignmentStatus.ACTIVE))
                .thenReturn(true);

        RegistrationRequest req = buildRequest(idempotencyKey);
        req.setTagSerial("TG-DUPLICATE");

        assertThatThrownBy(() -> service.register(req, UUID.randomUUID()))
                .isInstanceOf(DomainConflictException.class)
                .hasMessageContaining("TG-DUPLICATE");
    }

    @Test
    void register_throwsForFutureDob() {
        UUID idempotencyKey = UUID.randomUUID();
        when(submissionRepo.findByIdempotencyKey(idempotencyKey)).thenReturn(Optional.empty());

        RegistrationRequest req = buildRequest(idempotencyKey);
        req.setDob(LocalDate.now().plusDays(1));

        assertThatThrownBy(() -> service.register(req, UUID.randomUUID()))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("future");
    }

    @Test
    void register_throwsForInvalidBreed() {
        UUID idempotencyKey = UUID.randomUUID();
        when(submissionRepo.findByIdempotencyKey(idempotencyKey)).thenReturn(Optional.empty());

        RegistrationRequest req = buildRequest(idempotencyKey);
        req.setBreed("INVALID_BREED_XYZ");

        assertThatThrownBy(() -> service.register(req, UUID.randomUUID()))
                .isInstanceOf(BusinessRuleViolationException.class)
                .satisfies(e -> assertThat(((BusinessRuleViolationException) e).getErrorCode()).isEqualTo("ERR-AR-003"));
    }

    // Helpers

    private RegistrationRequest buildRequest(UUID idempotencyKey) {
        RegistrationRequest req = new RegistrationRequest();
        req.setIdempotencyKey(idempotencyKey);
        req.setSpecies("CATTLE");
        req.setSex("FEMALE");
        req.setBreed("ZEBU");
        req.setSubmissionType("BIRTH");
        req.setTagSerial("TG-00000001");
        req.setOwnerId(UUID.randomUUID());
        req.setPremisesId(UUID.randomUUID());
        req.setDob(LocalDate.of(2023, 6, 1));
        return req;
    }

    private RegistrationSubmission buildFakeSubmission(UUID idempotencyKey) {
        return RegistrationSubmission.create(
                "REG-2026-000001", UUID.randomUUID(),
                com.somlits.animalregistry.domain.enums.SubmissionType.BIRTH,
                UUID.randomUUID(), idempotencyKey);
    }
}
