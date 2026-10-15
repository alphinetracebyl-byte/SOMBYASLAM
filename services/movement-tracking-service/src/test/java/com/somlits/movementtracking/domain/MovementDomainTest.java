package com.somlits.movementtracking.domain;

import com.somlits.movementtracking.domain.enums.DestinationType;
import com.somlits.movementtracking.domain.enums.MovementInitiatorRole;
import com.somlits.movementtracking.domain.enums.MovementPurpose;
import com.somlits.movementtracking.domain.enums.MovementStatus;
import com.somlits.movementtracking.domain.exception.BusinessRuleViolationException;
import com.somlits.movementtracking.domain.model.Movement;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MovementDomainTest {

    private Movement movement;

    @BeforeEach
    void setUp() {
        movement = Movement.create(
                "MV-260729-000001", "idem-001",
                MovementInitiatorRole.OWNER, UUID.randomUUID(),
                null, UUID.randomUUID(), "FARM",
                UUID.randomUUID(), DestinationType.MARKET,
                "Mogadishu Livestock Market", "Banadir", "Hodan", "SO",
                MovementPurpose.SALE, UUID.randomUUID(), 10,
                "AB-1234", "Hassan Transports", "LIC-001",
                Instant.now().plus(1, ChronoUnit.HOURS),
                Instant.now().plus(5, ChronoUnit.HOURS),
                "Via main road", false, null, false);
    }

    @Test
    void create_setsInitialDraftStatus() {
        assertThat(movement.getStatus()).isEqualTo(MovementStatus.DRAFT);
        assertThat(movement.getId()).isNotNull();
        assertThat(movement.getMovementCode()).isEqualTo("MV-260729-000001");
    }

    @Test
    void submit_transitionsFromDraft() {
        movement.submit();
        assertThat(movement.getStatus()).isEqualTo(MovementStatus.SUBMITTED);
    }

    @Test
    void submit_throwsWhenNotDraft() {
        movement.submit();
        assertThatThrownBy(() -> movement.submit())
                .isInstanceOf(BusinessRuleViolationException.class)
                .satisfies(e -> assertThat(((BusinessRuleViolationException) e).getErrorCode()).isEqualTo("ERR-MT-002"));
    }

    @Test
    void approve_fromSubmitted() {
        UUID vetId = UUID.randomUUID();
        movement.submit();
        movement.approve(vetId, "Looks good");
        assertThat(movement.getStatus()).isEqualTo(MovementStatus.APPROVED);
        assertThat(movement.getVetReviewerId()).isEqualTo(vetId);
        assertThat(movement.getVetReviewNotes()).isEqualTo("Looks good");
    }

    @Test
    void approve_fromUnderReview() {
        movement.submit();
        movement.routeForVetReview();
        movement.approve(UUID.randomUUID(), "Vet-approved");
        assertThat(movement.getStatus()).isEqualTo(MovementStatus.APPROVED);
    }

    @Test
    void reject_setsRejectedStatus() {
        movement.submit();
        movement.reject(UUID.randomUUID(), "Disease risk");
        assertThat(movement.getStatus()).isEqualTo(MovementStatus.REJECTED);
        assertThat(movement.getRejectionReason()).isEqualTo("Disease risk");
    }

    @Test
    void issuePermit_setsPermitFieldsAndStatus() {
        movement.submit();
        movement.approve(UUID.randomUUID(), "OK");
        movement.issuePermit("PRM-260729-000001", 72);
        assertThat(movement.getStatus()).isEqualTo(MovementStatus.PERMIT_ISSUED);
        assertThat(movement.getPermitNumber()).isEqualTo("PRM-260729-000001");
        assertThat(movement.getPermitValidUntil()).isNotNull();
        assertThat(movement.isPermitValid()).isTrue();
    }

    @Test
    void confirmDeparture_requiresPermitIssued() {
        movement.submit();
        assertThatThrownBy(() -> movement.confirmDeparture(Instant.now(), null, null, false))
                .isInstanceOf(BusinessRuleViolationException.class);
    }

    @Test
    void confirmDeparture_setsStatusAndActualTime() {
        movement.submit();
        movement.approve(UUID.randomUUID(), "OK");
        movement.issuePermit("PRM-001", 72);
        Instant dep = Instant.now();
        movement.confirmDeparture(dep, null, null, false);
        assertThat(movement.getStatus()).isEqualTo(MovementStatus.DEPARTURE_CONFIRMED);
        assertThat(movement.getActualDepartureAt()).isEqualTo(dep);
    }

    @Test
    void recordCheckpointPass_movesToInTransit() {
        movement.submit();
        movement.approve(UUID.randomUUID(), "OK");
        movement.issuePermit("PRM-001", 72);
        movement.confirmDeparture(null, null, null, false);
        movement.recordCheckpointPass();
        assertThat(movement.getStatus()).isEqualTo(MovementStatus.IN_TRANSIT);
    }

    @Test
    void confirmArrivalFull_setsArrivedCountAndMissingZero() {
        arriveAt();
        movement.confirmArrivalFull(Instant.now(), false);
        assertThat(movement.getStatus()).isEqualTo(MovementStatus.ARRIVAL_CONFIRMED);
        assertThat(movement.getArrivedCount()).isEqualTo(10);
        assertThat(movement.getMissingCount()).isEqualTo(0);
    }

    @Test
    void confirmArrivalPartial_setsCorrectCounts() {
        arriveAt();
        movement.confirmArrivalPartial(8, Instant.now(), false);
        assertThat(movement.getStatus()).isEqualTo(MovementStatus.ARRIVAL_PARTIALLY_CONFIRMED);
        assertThat(movement.getArrivedCount()).isEqualTo(8);
        assertThat(movement.getMissingCount()).isEqualTo(2);
    }

    @Test
    void confirmArrivalPartial_throwsWhenCountEqualsTotal() {
        arriveAt();
        assertThatThrownBy(() -> movement.confirmArrivalPartial(10, Instant.now(), false))
                .isInstanceOf(BusinessRuleViolationException.class)
                .satisfies(e -> assertThat(((BusinessRuleViolationException) e).getErrorCode()).isEqualTo("ERR-MT-003"));
    }

    @Test
    void complete_fromArrivalConfirmed() {
        arriveAt();
        movement.confirmArrivalFull(null, false);
        movement.complete();
        assertThat(movement.getStatus()).isEqualTo(MovementStatus.COMPLETED);
        assertThat(movement.getCompletedAt()).isNotNull();
        assertThat(movement.isTerminal()).isTrue();
    }

    @Test
    void cancel_throwsForTerminalMovement() {
        arriveAt();
        movement.confirmArrivalFull(null, false);
        movement.complete();
        assertThatThrownBy(() -> movement.cancel("Too late"))
                .isInstanceOf(BusinessRuleViolationException.class)
                .satisfies(e -> assertThat(((BusinessRuleViolationException) e).getErrorCode()).isEqualTo("ERR-MT-001"));
    }

    @Test
    void cancel_fromDraft() {
        movement.cancel("Changed mind");
        assertThat(movement.getStatus()).isEqualTo(MovementStatus.CANCELLED);
        assertThat(movement.isTerminal()).isTrue();
    }

    @Test
    void expire_fromPermitIssued() {
        movement.submit();
        movement.approve(UUID.randomUUID(), "OK");
        movement.issuePermit("PRM-001", 72);
        movement.expire();
        assertThat(movement.getStatus()).isEqualTo(MovementStatus.EXPIRED);
        assertThat(movement.isTerminal()).isTrue();
    }

    @Test
    void expire_noOpForCompletedMovement() {
        arriveAt();
        movement.confirmArrivalFull(null, false);
        movement.complete();
        movement.expire();
        assertThat(movement.getStatus()).isEqualTo(MovementStatus.COMPLETED);
    }

    private void arriveAt() {
        movement.submit();
        movement.approve(UUID.randomUUID(), "OK");
        movement.issuePermit("PRM-001", 72);
        movement.confirmDeparture(null, null, null, false);
    }
}
