package com.somlits.taginventory.domain.entity;

import com.somlits.taginventory.domain.enums.CustodyLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tag_custody_event")
public class TagCustodyEvent {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "tag_serial_or_bag_code", nullable = false, length = 50)
    private String tagSerialOrBagCode;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(name = "from_custodian_id")
    private UUID fromCustodianId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_custodian_level", length = 30)
    private CustodyLevel fromCustodianLevel;

    @Column(name = "to_custodian_id")
    private UUID toCustodianId;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_custodian_level", length = 30)
    private CustodyLevel toCustodianLevel;

    @Column(name = "performed_by", nullable = false)
    private UUID performedBy;

    @Column(name = "performed_at", nullable = false, updatable = false)
    private Instant performedAt;

    @Column(name = "notes")
    private String notes;

    public static TagCustodyEvent of(String tagSerialOrBagCode, String eventType,
                                     UUID fromCustodianId, CustodyLevel fromCustodianLevel,
                                     UUID toCustodianId, CustodyLevel toCustodianLevel,
                                     UUID performedBy, String notes) {
        var e = new TagCustodyEvent();
        e.id = UUID.randomUUID();
        e.tagSerialOrBagCode = tagSerialOrBagCode;
        e.eventType = eventType;
        e.fromCustodianId = fromCustodianId;
        e.fromCustodianLevel = fromCustodianLevel;
        e.toCustodianId = toCustodianId;
        e.toCustodianLevel = toCustodianLevel;
        e.performedBy = performedBy;
        e.performedAt = Instant.now();
        e.notes = notes;
        return e;
    }

    public UUID getId() { return id; }
    public String getTagSerialOrBagCode() { return tagSerialOrBagCode; }
    public String getEventType() { return eventType; }
    public UUID getFromCustodianId() { return fromCustodianId; }
    public CustodyLevel getFromCustodianLevel() { return fromCustodianLevel; }
    public UUID getToCustodianId() { return toCustodianId; }
    public CustodyLevel getToCustodianLevel() { return toCustodianLevel; }
    public UUID getPerformedBy() { return performedBy; }
    public Instant getPerformedAt() { return performedAt; }
    public String getNotes() { return notes; }
}
