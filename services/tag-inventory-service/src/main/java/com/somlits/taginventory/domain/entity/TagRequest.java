package com.somlits.taginventory.domain.entity;

import com.somlits.taginventory.domain.enums.TagRequestStatus;
import com.somlits.taginventory.domain.exception.BusinessRuleViolationException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tag_request")
public class TagRequest {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "request_code", nullable = false, unique = true, length = 20, updatable = false)
    private String requestCode;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "owner_code", nullable = false, length = 20)
    private String ownerCode;

    @Column(name = "requested_bag_count", nullable = false)
    private Integer requestedBagCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private TagRequestStatus status;

    @Column(name = "requested_by", nullable = false)
    private UUID requestedBy;

    @Column(name = "requested_at", nullable = false)
    private Instant requestedAt;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "fulfilled_at")
    private Instant fulfilledAt;

    @Column(name = "notes")
    private String notes;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static TagRequest create(String requestCode, UUID ownerId, String ownerCode,
                                    Integer requestedBagCount, UUID requestedBy, String notes) {
        var r = new TagRequest();
        r.id = UUID.randomUUID();
        r.requestCode = requestCode;
        r.ownerId = ownerId;
        r.ownerCode = ownerCode;
        r.requestedBagCount = requestedBagCount;
        r.status = TagRequestStatus.PENDING;
        r.requestedBy = requestedBy;
        r.requestedAt = Instant.now();
        r.notes = notes;
        r.createdAt = Instant.now();
        r.updatedAt = Instant.now();
        return r;
    }

    public void approve(UUID reviewedBy) {
        if (this.status != TagRequestStatus.PENDING) {
            throw new BusinessRuleViolationException("ERR-TI-010",
                    "Request is not in PENDING status: " + this.status);
        }
        this.status = TagRequestStatus.APPROVED;
        this.reviewedBy = reviewedBy;
        this.reviewedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void reject(UUID reviewedBy, String reason) {
        if (this.status != TagRequestStatus.PENDING) {
            throw new BusinessRuleViolationException("ERR-TI-010",
                    "Request is not in PENDING status: " + this.status);
        }
        this.status = TagRequestStatus.REJECTED;
        this.reviewedBy = reviewedBy;
        this.reviewedAt = Instant.now();
        this.rejectionReason = reason;
        this.updatedAt = Instant.now();
    }

    public void markFulfilled() {
        this.status = TagRequestStatus.FULFILLED;
        this.fulfilledAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public int getRequestedTagCount() {
        return requestedBagCount != null ? requestedBagCount * 25 : 0;
    }

    public UUID getId() { return id; }
    public String getRequestCode() { return requestCode; }
    public UUID getOwnerId() { return ownerId; }
    public String getOwnerCode() { return ownerCode; }
    public Integer getRequestedBagCount() { return requestedBagCount; }
    public TagRequestStatus getStatus() { return status; }
    public UUID getRequestedBy() { return requestedBy; }
    public Instant getRequestedAt() { return requestedAt; }
    public UUID getReviewedBy() { return reviewedBy; }
    public Instant getReviewedAt() { return reviewedAt; }
    public String getRejectionReason() { return rejectionReason; }
    public Instant getFulfilledAt() { return fulfilledAt; }
    public String getNotes() { return notes; }
    public Long getVersion() { return version; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
