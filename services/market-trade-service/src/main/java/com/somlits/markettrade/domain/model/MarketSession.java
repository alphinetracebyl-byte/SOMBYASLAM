package com.somlits.markettrade.domain.model;

import com.somlits.markettrade.domain.enums.MarketSessionStatus;
import com.somlits.markettrade.domain.exception.BusinessRuleViolationException;
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
@Table(name = "market_session")
public class MarketSession {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "session_code", nullable = false, unique = true, length = 25, updatable = false)
    private String sessionCode;

    @Column(name = "market_premises_id", nullable = false)
    private UUID marketPremisesId;

    @Column(name = "market_premises_code", nullable = false, length = 30)
    private String marketPremisesCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MarketSessionStatus status = MarketSessionStatus.PLANNED;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(name = "opened_at")
    private Instant openedAt;

    @Column(name = "opened_by")
    private UUID openedBy;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "closed_by")
    private UUID closedBy;

    @Column(name = "supervising_vet_id")
    private UUID supervisingVetId;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    public static MarketSession create(String sessionCode, UUID marketPremisesId, String marketPremisesCode,
                                       LocalDate sessionDate, UUID supervisingVetId, String notes, UUID createdBy) {
        var s = new MarketSession();
        s.id = UUID.randomUUID();
        s.sessionCode = sessionCode;
        s.marketPremisesId = marketPremisesId;
        s.marketPremisesCode = marketPremisesCode;
        s.status = MarketSessionStatus.PLANNED;
        s.sessionDate = sessionDate;
        s.supervisingVetId = supervisingVetId;
        s.notes = notes;
        s.createdBy = createdBy;
        s.createdAt = Instant.now();
        s.updatedAt = Instant.now();
        return s;
    }

    public void open(UUID openedBy) {
        if (this.status != MarketSessionStatus.PLANNED) {
            throw new BusinessRuleViolationException("ERR-MKT-001",
                    "Session can only be opened from PLANNED status. Current: " + this.status);
        }
        this.status = MarketSessionStatus.OPEN;
        this.openedAt = Instant.now();
        this.openedBy = openedBy;
        this.updatedAt = Instant.now();
    }

    public void close(UUID closedBy) {
        if (this.status != MarketSessionStatus.OPEN) {
            throw new BusinessRuleViolationException("ERR-MKT-002",
                    "Session can only be closed from OPEN status. Current: " + this.status);
        }
        this.status = MarketSessionStatus.CLOSED;
        this.closedAt = Instant.now();
        this.closedBy = closedBy;
        this.updatedAt = Instant.now();
    }

    public void cancel() {
        if (this.status == MarketSessionStatus.CLOSED || this.status == MarketSessionStatus.CANCELLED) {
            throw new BusinessRuleViolationException("ERR-MKT-003",
                    "Session cannot be cancelled. Current: " + this.status);
        }
        this.status = MarketSessionStatus.CANCELLED;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getSessionCode() { return sessionCode; }
    public UUID getMarketPremisesId() { return marketPremisesId; }
    public String getMarketPremisesCode() { return marketPremisesCode; }
    public MarketSessionStatus getStatus() { return status; }
    public LocalDate getSessionDate() { return sessionDate; }
    public Instant getOpenedAt() { return openedAt; }
    public UUID getOpenedBy() { return openedBy; }
    public Instant getClosedAt() { return closedAt; }
    public UUID getClosedBy() { return closedBy; }
    public UUID getSupervisingVetId() { return supervisingVetId; }
    public String getNotes() { return notes; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }
}
