package com.somlits.taginventory.domain.entity;

import com.somlits.taginventory.domain.enums.CustodyLevel;
import com.somlits.taginventory.domain.enums.TagTransferStatus;
import com.somlits.taginventory.domain.enums.TransferType;
import com.somlits.taginventory.domain.exception.BusinessRuleViolationException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tag_transfer")
public class TagTransfer {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "transfer_code", nullable = false, unique = true, length = 20, updatable = false)
    private String transferCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "transfer_type", nullable = false, length = 40)
    private TransferType transferType;

    @Column(name = "from_custodian_id", nullable = false)
    private UUID fromCustodianId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_custodian_level", nullable = false, length = 30)
    private CustodyLevel fromCustodianLevel;

    @Column(name = "to_custodian_id", nullable = false)
    private UUID toCustodianId;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_custodian_level", nullable = false, length = 30)
    private CustodyLevel toCustodianLevel;

    @Column(name = "bag_count", nullable = false)
    private Integer bagCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private TagTransferStatus status;

    @Column(name = "initiated_by", nullable = false)
    private UUID initiatedBy;

    @Column(name = "initiated_at", nullable = false)
    private Instant initiatedAt;

    @Column(name = "received_by")
    private UUID receivedBy;

    @Column(name = "received_at")
    private Instant receivedAt;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static TagTransfer create(String transferCode, TransferType transferType,
                                     UUID fromCustodianId, CustodyLevel fromCustodianLevel,
                                     UUID toCustodianId, CustodyLevel toCustodianLevel,
                                     Integer bagCount, UUID initiatedBy, String notes) {
        var t = new TagTransfer();
        t.id = UUID.randomUUID();
        t.transferCode = transferCode;
        t.transferType = transferType;
        t.fromCustodianId = fromCustodianId;
        t.fromCustodianLevel = fromCustodianLevel;
        t.toCustodianId = toCustodianId;
        t.toCustodianLevel = toCustodianLevel;
        t.bagCount = bagCount;
        t.status = TagTransferStatus.IN_TRANSIT;
        t.initiatedBy = initiatedBy;
        t.initiatedAt = Instant.now();
        t.notes = notes;
        t.createdAt = Instant.now();
        return t;
    }

    public void confirmReceipt(UUID receivedBy) {
        if (this.status != TagTransferStatus.IN_TRANSIT) {
            throw new BusinessRuleViolationException("ERR-TI-020",
                    "Transfer is not IN_TRANSIT (current: " + this.status + ")");
        }
        this.status = TagTransferStatus.RECEIVED;
        this.receivedBy = receivedBy;
        this.receivedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getTransferCode() { return transferCode; }
    public TransferType getTransferType() { return transferType; }
    public UUID getFromCustodianId() { return fromCustodianId; }
    public CustodyLevel getFromCustodianLevel() { return fromCustodianLevel; }
    public UUID getToCustodianId() { return toCustodianId; }
    public CustodyLevel getToCustodianLevel() { return toCustodianLevel; }
    public Integer getBagCount() { return bagCount; }
    public TagTransferStatus getStatus() { return status; }
    public UUID getInitiatedBy() { return initiatedBy; }
    public Instant getInitiatedAt() { return initiatedAt; }
    public UUID getReceivedBy() { return receivedBy; }
    public Instant getReceivedAt() { return receivedAt; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
}
