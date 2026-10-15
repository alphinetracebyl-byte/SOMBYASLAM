package com.somlits.movementtracking.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.movementtracking.domain.enums.DestinationType;
import com.somlits.movementtracking.domain.enums.MovementInitiatorRole;
import com.somlits.movementtracking.domain.enums.MovementPurpose;
import com.somlits.movementtracking.domain.enums.MovementStatus;
import com.somlits.movementtracking.domain.exception.BusinessRuleViolationException;
import com.somlits.movementtracking.domain.model.Movement;
import com.somlits.movementtracking.domain.model.MovementRule;
import com.somlits.movementtracking.domain.repository.MovementAnimalRepository;
import com.somlits.movementtracking.domain.repository.MovementRepository;
import com.somlits.movementtracking.domain.repository.MovementStatusHistoryRepository;
import com.somlits.movementtracking.domain.repository.OutboxEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MovementApplicationServiceTest {

    @Mock MovementRepository movementRepo;
    @Mock MovementAnimalRepository animalRepo;
    @Mock MovementStatusHistoryRepository historyRepo;
    @Mock MovementRuleService ruleService;
    @Mock MovementCodeGenerator codeGen;
    @Mock OutboxEventRepository outboxRepo;

    MovementApplicationService service;

    @BeforeEach
    void setUp() {
        OutboxService outbox = new OutboxService(outboxRepo);
        service = new MovementApplicationService(
                movementRepo, animalRepo, historyRepo,
                ruleService, codeGen, outbox, new ObjectMapper());
    }

    @Test
    void createDraft_returnsExistingMovementOnDuplicateIdempotencyKey() {
        String idemKey = "idem-dup-001";
        when(movementRepo.existsByIdempotencyKey(idemKey)).thenReturn(true);
        Movement existing = buildMovement(idemKey);
        when(movementRepo.findByIdempotencyKey(idemKey)).thenReturn(Optional.of(existing));

        var result = service.createDraft(idemKey, MovementInitiatorRole.OWNER,
                UUID.randomUUID(), null, UUID.randomUUID(), "FARM",
                UUID.randomUUID(), DestinationType.MARKET,
                "Market X", "Banadir", "Hodan", "SO",
                MovementPurpose.SALE, List.of(), null, null, null,
                Instant.now().plus(1, ChronoUnit.HOURS), null, null,
                false, null, false);

        assertThat(result).isSameAs(existing);
    }

    @Test
    void createDraft_throwsWhenMixedSpeciesNotAllowed() {
        String idemKey = "idem-mix-001";
        when(movementRepo.existsByIdempotencyKey(idemKey)).thenReturn(false);

        MovementRule rule = buildRule(false);
        when(ruleService.resolveRule(any(), any(), any())).thenReturn(rule);
        when(codeGen.next()).thenReturn("MV-260729-000002");

        List<MovementApplicationService.AnimalRef> animals = List.of(
                new MovementApplicationService.AnimalRef(UUID.randomUUID(), "A-001", "T-001", "CATTLE"),
                new MovementApplicationService.AnimalRef(UUID.randomUUID(), "A-002", "T-002", "CAMEL")
        );

        assertThatThrownBy(() -> service.createDraft(idemKey, MovementInitiatorRole.OWNER,
                UUID.randomUUID(), null, UUID.randomUUID(), "FARM",
                UUID.randomUUID(), DestinationType.MARKET,
                "Market X", "Banadir", "Hodan", "SO",
                MovementPurpose.SALE, animals, null, null, null,
                Instant.now().plus(1, ChronoUnit.HOURS), null, null,
                false, null, false))
                .isInstanceOf(BusinessRuleViolationException.class)
                .satisfies(e -> assertThat(((BusinessRuleViolationException) e).getErrorCode()).isEqualTo("ERR-MT-011"));
    }

    @Test
    void createDraft_savesMovementAndAnimals() {
        String idemKey = "idem-new-001";
        when(movementRepo.existsByIdempotencyKey(idemKey)).thenReturn(false);

        MovementRule rule = buildRule(true);
        when(ruleService.resolveRule(any(), any(), any())).thenReturn(rule);
        when(codeGen.next()).thenReturn("MV-260729-000003");
        when(movementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<MovementApplicationService.AnimalRef> animals = List.of(
                new MovementApplicationService.AnimalRef(UUID.randomUUID(), "A-001", "T-001", "CATTLE")
        );

        var result = service.createDraft(idemKey, MovementInitiatorRole.OWNER,
                UUID.randomUUID(), null, UUID.randomUUID(), "FARM",
                null, DestinationType.MARKET,
                "Market Y", "Banadir", "Hodan", "SO",
                MovementPurpose.SALE, animals, null, null, null,
                Instant.now().plus(2, ChronoUnit.HOURS), null, null,
                false, null, false);

        assertThat(result.getMovementCode()).isEqualTo("MV-260729-000003");
        assertThat(result.getStatus()).isEqualTo(MovementStatus.DRAFT);
        assertThat(result.getAnimalCount()).isEqualTo(1);
    }

    @Test
    void submit_autoApprovesWhenVetReviewNotRequired() {
        UUID movementId = UUID.randomUUID();
        Movement movement = buildMovement("idem-sub-001");
        when(movementRepo.findById(movementId)).thenReturn(Optional.of(movement));

        MovementRule rule = buildRule(true);
        when(ruleService.getById(any())).thenReturn(rule);
        when(codeGen.nextPermitNumber()).thenReturn("PRM-260729-000001");
        when(movementRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = service.submit(movementId, UUID.randomUUID(), "OWNER");

        assertThat(result.getStatus()).isEqualTo(MovementStatus.PERMIT_ISSUED);
        assertThat(result.getPermitNumber()).isEqualTo("PRM-260729-000001");
    }

    private MovementRule buildRule(boolean mixedSpeciesAllowed) {
        return MovementRule.create("RULE-001", "FARM", DestinationType.MARKET,
                MovementPurpose.SALE, true, false, 72,
                mixedSpeciesAllowed, false, null, UUID.randomUUID());
    }

    private Movement buildMovement(String idemKey) {
        return Movement.create("MV-260729-TEST", idemKey,
                MovementInitiatorRole.OWNER, UUID.randomUUID(),
                null, UUID.randomUUID(), "FARM",
                UUID.randomUUID(), DestinationType.MARKET,
                "Test Market", "Banadir", "Hodan", "SO",
                MovementPurpose.SALE, UUID.randomUUID(), 5,
                null, null, null,
                Instant.now().plus(1, ChronoUnit.HOURS), null, null,
                false, null, false);
    }
}
