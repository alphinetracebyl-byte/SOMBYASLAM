package com.somlits.animalregistry.domain;

import com.somlits.animalregistry.domain.enums.AnimalStatus;
import com.somlits.animalregistry.domain.enums.DobPrecision;
import com.somlits.animalregistry.domain.enums.Sex;
import com.somlits.animalregistry.domain.enums.Species;
import com.somlits.animalregistry.domain.enums.SubmissionType;
import com.somlits.animalregistry.domain.exception.BusinessRuleViolationException;
import com.somlits.animalregistry.domain.model.AnimalRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AnimalRecordTest {

    private AnimalRecord animal;

    @BeforeEach
    void setUp() {
        animal = AnimalRecord.create(
                "SOM-2026-000001", Species.CATTLE, "ZEBU", Sex.FEMALE,
                LocalDate.of(2023, 1, 15), DobPrecision.EXACT,
                "BLACK_WHITE", null,
                UUID.randomUUID(), UUID.randomUUID(),
                SubmissionType.BIRTH, UUID.randomUUID());
    }

    @Test
    void create_setsInitialDraftStatus() {
        assertThat(animal.getStatus()).isEqualTo(AnimalStatus.DRAFT);
        assertThat(animal.getId()).isNotNull();
        assertThat(animal.getAnimalCode()).isEqualTo("SOM-2026-000001");
    }

    @Test
    void applyTag_storesSerial() {
        animal.applyTag("TG-12345678");
        assertThat(animal.getActiveTagSerial()).isEqualTo("TG-12345678");
    }

    @Test
    void submit_transitionsToSubmitted() {
        animal.submit();
        assertThat(animal.getStatus()).isEqualTo(AnimalStatus.SUBMITTED);
    }

    @Test
    void verify_transitionsToActive() {
        animal.applyTag("TG-12345678");
        animal.submit();
        animal.verify("TG-12345678");
        assertThat(animal.getStatus()).isEqualTo(AnimalStatus.ACTIVE);
        assertThat(animal.getActiveTagSerial()).isEqualTo("TG-12345678");
    }

    @Test
    void reject_returnsBackToDraft() {
        animal.submit();
        animal.reject();
        assertThat(animal.getStatus()).isEqualTo(AnimalStatus.DRAFT);
    }

    @Test
    void markDead_setsDeadStatusAndClearsTag() {
        animal.applyTag("TG-00000001");
        animal.submit();
        animal.verify("TG-00000001");
        animal.markDead(java.time.Instant.now());
        assertThat(animal.getStatus()).isEqualTo(AnimalStatus.DEAD);
        assertThat(animal.getActiveTagSerial()).isNull();
        assertThat(animal.getTerminatedAt()).isNotNull();
    }

    @Test
    void isTerminal_returnsTrueForDeadSlaughteredExportedArchived() {
        animal.submit();
        animal.verify(null);
        animal.markDead(java.time.Instant.now());
        assertThat(animal.isTerminal()).isTrue();
    }

    @Test
    void isTerminal_returnsFalseForActive() {
        animal.submit();
        animal.verify(null);
        assertThat(animal.isTerminal()).isFalse();
    }

    @Test
    void applyTag_throwsForTerminalAnimal() {
        animal.submit();
        animal.verify(null);
        animal.markDead(java.time.Instant.now());
        assertThatThrownBy(() -> animal.applyTag("TG-99999999"))
                .isInstanceOf(BusinessRuleViolationException.class)
                .satisfies(e -> assertThat(((BusinessRuleViolationException) e).getErrorCode()).isEqualTo("ERR-AR-008"));
    }

    @Test
    void confiscate_andRelease() {
        animal.submit();
        animal.verify(null);
        animal.confiscate();
        assertThat(animal.getStatus()).isEqualTo(AnimalStatus.CONFISCATED);
        animal.release();
        assertThat(animal.getStatus()).isEqualTo(AnimalStatus.ACTIVE);
    }

    @Test
    void release_throwsWhenNotConfiscated() {
        animal.submit();
        animal.verify(null);
        assertThatThrownBy(() -> animal.release())
                .isInstanceOf(BusinessRuleViolationException.class);
    }

    @Test
    void transferOwner_updatesOwnerId() {
        animal.submit();
        animal.verify(null);
        UUID newOwner = UUID.randomUUID();
        animal.transferOwner(newOwner);
        assertThat(animal.getCurrentOwnerId()).isEqualTo(newOwner);
    }
}
