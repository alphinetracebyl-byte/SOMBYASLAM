package com.somlits.abattoir.domain.model;

import com.somlits.abattoir.domain.enums.SlaughterSessionStatus;
import com.somlits.abattoir.domain.exception.BusinessRuleViolationException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "slaughter_session")
public class SlaughterSession {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "session_code", nullable = false, unique = true, length = 25, updatable = false)
    private String sessionCode;

    @Column(name = "abattoir_premises_id", nullable = false, updatable = false)
    private UUID abattoirPremisesId;

    @Column(name = "abattoir_premises_code", nullable = false, length = 30, updatable = false)
    private String abattoirPremisesCode;

    @Column(name = "session_date", nullable = false, updatable = false)
    private LocalDate sessionDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private SlaughterSessionStatus status = SlaughterSessionStatus.OPEN;

    @Column(name = "supervising_vet_id")
    private UUID supervisingVetId;

    @Column(name = "opened_by", nullable = false, updatable = false)
    private UUID openedBy;

    @Column(name = "opened_at", nullable = false, updatable = false)
    private Instant openedAt;

    @Column(name = "closed_by")
    private UUID closedBy;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "total_animals", nullable = false)
    private Integer totalAnimals = 0;

    @Column(name = "slaughtered_count", nullable = false)
    private Integer slaughteredCount = 0;

    @Column(name = "condemned_count", nullable = false)
    private Integer condemnedCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    public static SlaughterSession create(String sessionCode, UUID abattoirPremisesId,
                                          String abattoirPremisesCode, LocalDate sessionDate,
                                          UUID supervisingVetId, UUID openedBy) {
        var s = new SlaughterSession();
        s.id = UUID.randomUUID();
        s.sessionCode = sessionCode;
        s.abattoirPremisesId = abattoirPremisesId;
        s.abattoirPremisesCode = abattoirPremisesCode;
        s.sessionDate = sessionDate;
        s.status = SlaughterSessionStatus.OPEN;
        s.supervisingVetId = supervisingVetId;
        s.openedBy = openedBy;
        s.openedAt = Instant.now();
        s.totalAnimals = 0;
        s.slaughteredCount = 0;
        s.condemnedCount = 0;
        s.createdAt = Instant.now();
        return s;
    }

    public void close(UUID closedBy) {
        if (this.status != SlaughterSessionStatus.OPEN) {
            throw new BusinessRuleViolationException("ERR-AB-001",
                    "Session is already CLOSED");
        }
        this.status = SlaughterSessionStatus.CLOSED;
        this.closedBy = closedBy;
        this.closedAt = Instant.now();
    }

    public void incrementTotalAnimals() {
        this.totalAnimals++;
    }

    public void incrementSlaughteredCount() {
        this.slaughteredCount++;
    }

    public void incrementCondemnedCount() {
        this.condemnedCount++;
    }

    public UUID getId() { return id; }
    public String getSessionCode() { return sessionCode; }
    public UUID getAbattoirPremisesId() { return abattoirPremisesId; }
    public String getAbattoirPremisesCode() { return abattoirPremisesCode; }
    public LocalDate getSessionDate() { return sessionDate; }
    public SlaughterSessionStatus getStatus() { return status; }
    public UUID getSupervisingVetId() { return supervisingVetId; }
    public UUID getOpenedBy() { return openedBy; }
    public Instant getOpenedAt() { return openedAt; }
    public UUID getClosedBy() { return closedBy; }
    public Instant getClosedAt() { return closedAt; }
    public Integer getTotalAnimals() { return totalAnimals; }
    public Integer getSlaughteredCount() { return slaughteredCount; }
    public Integer getCondemnedCount() { return condemnedCount; }
    public Instant getCreatedAt() { return createdAt; }
    public Long getVersion() { return version; }
}
