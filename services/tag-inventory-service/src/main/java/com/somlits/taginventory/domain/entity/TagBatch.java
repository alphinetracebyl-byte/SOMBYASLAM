package com.somlits.taginventory.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tag_batch")
public class TagBatch {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "batch_code", nullable = false, unique = true, length = 30, updatable = false)
    private String batchCode;

    @Column(name = "manufacturer_name", nullable = false, length = 200)
    private String manufacturerName;

    @Column(name = "manufacturer_country", length = 100)
    private String manufacturerCountry;

    @Column(name = "total_bags", nullable = false)
    private Integer totalBags;

    @Column(name = "tags_per_bag", nullable = false)
    private Integer tagsPerBag;

    @Column(name = "batch_received_at", nullable = false, updatable = false)
    private Instant batchReceivedAt;

    @Column(name = "received_by", nullable = false)
    private UUID receivedBy;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static TagBatch create(String batchCode, String manufacturerName, String manufacturerCountry,
                                  Integer totalBags, Integer tagsPerBag, Instant batchReceivedAt,
                                  UUID receivedBy, String notes) {
        var b = new TagBatch();
        b.id = UUID.randomUUID();
        b.batchCode = batchCode;
        b.manufacturerName = manufacturerName;
        b.manufacturerCountry = manufacturerCountry;
        b.totalBags = totalBags;
        b.tagsPerBag = tagsPerBag != null ? tagsPerBag : 25;
        b.batchReceivedAt = batchReceivedAt != null ? batchReceivedAt : Instant.now();
        b.receivedBy = receivedBy;
        b.notes = notes;
        b.createdAt = Instant.now();
        return b;
    }

    public UUID getId() { return id; }
    public String getBatchCode() { return batchCode; }
    public String getManufacturerName() { return manufacturerName; }
    public String getManufacturerCountry() { return manufacturerCountry; }
    public Integer getTotalBags() { return totalBags; }
    public Integer getTagsPerBag() { return tagsPerBag; }
    public Instant getBatchReceivedAt() { return batchReceivedAt; }
    public UUID getReceivedBy() { return receivedBy; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
}
