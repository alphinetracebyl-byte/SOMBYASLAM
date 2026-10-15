package com.somlits.ownerorg.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "owner_contact")
public class OwnerContact {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "contact_name", nullable = false, length = 200)
    private String contactName;

    @Column(name = "contact_phone", nullable = false, length = 30)
    private String contactPhone;

    @Column(name = "contact_role", length = 100)
    private String contactRole;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    @Column(name = "added_by", nullable = false)
    private UUID addedBy;

    @Column(name = "added_at", nullable = false)
    private Instant addedAt;

    protected OwnerContact() {
        // JPA
    }

    public static OwnerContact create(UUID ownerId, String contactName, String contactPhone,
                                      String contactRole, UUID addedBy) {
        OwnerContact c = new OwnerContact();
        c.id = UUID.randomUUID();
        c.ownerId = ownerId;
        c.contactName = contactName;
        c.contactPhone = contactPhone;
        c.contactRole = contactRole;
        c.isActive = true;
        c.addedBy = addedBy;
        c.addedAt = Instant.now();
        return c;
    }

    public UUID getId() { return id; }
    public UUID getOwnerId() { return ownerId; }
    public String getContactName() { return contactName; }
    public String getContactPhone() { return contactPhone; }
    public String getContactRole() { return contactRole; }
    public boolean isActive() { return isActive; }
    public UUID getAddedBy() { return addedBy; }
    public Instant getAddedAt() { return addedAt; }
}
