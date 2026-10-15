package com.somlits.identityaccess.domain.model;

import com.somlits.identityaccess.domain.enums.RoleCode;
import com.somlits.identityaccess.domain.enums.TerritoryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_role_assignment")
public class UserRoleAssignment {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_code", nullable = false, length = 50)
    private RoleCode roleCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "territory_type", nullable = false, length = 20)
    private TerritoryType territoryType;

    @Column(name = "region_code", length = 10)
    private String regionCode;

    @Column(name = "district_code", length = 10)
    private String districtCode;

    @Column(name = "premises_id")
    private UUID premisesId;

    @Column(name = "owner_id")
    private UUID ownerId;

    @Column(name = "assigned_by_user_id", nullable = false)
    private UUID assignedByUserId;

    @Column(name = "valid_from", nullable = false)
    private Instant validFrom;

    @Column(name = "valid_until")
    private Instant validUntil;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "removed_at")
    private Instant removedAt;

    @Column(name = "removed_by_user_id")
    private UUID removedByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static UserRoleAssignment create(UUID userId, RoleCode roleCode, TerritoryType territoryType,
            String regionCode, String districtCode, UUID assignedByUserId) {
        var assignment = new UserRoleAssignment();
        assignment.id = UUID.randomUUID();
        assignment.userId = userId;
        assignment.roleCode = roleCode;
        assignment.territoryType = territoryType;
        assignment.regionCode = regionCode;
        assignment.districtCode = districtCode;
        assignment.assignedByUserId = assignedByUserId;
        assignment.validFrom = Instant.now();
        assignment.active = true;
        assignment.createdAt = Instant.now();
        return assignment;
    }

    public void revoke(UUID revokedByUserId) {
        this.active = false;
        this.removedAt = Instant.now();
        this.removedByUserId = revokedByUserId;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public RoleCode getRoleCode() { return roleCode; }
    public TerritoryType getTerritoryType() { return territoryType; }
    public String getRegionCode() { return regionCode; }
    public String getDistrictCode() { return districtCode; }
    public UUID getPremisesId() { return premisesId; }
    public void setPremisesId(UUID premisesId) { this.premisesId = premisesId; }
    public UUID getOwnerId() { return ownerId; }
    public void setOwnerId(UUID ownerId) { this.ownerId = ownerId; }
    public UUID getAssignedByUserId() { return assignedByUserId; }
    public Instant getValidFrom() { return validFrom; }
    public Instant getValidUntil() { return validUntil; }
    public void setValidUntil(Instant validUntil) { this.validUntil = validUntil; }
    public boolean isActive() { return active; }
    public Instant getRemovedAt() { return removedAt; }
    public UUID getRemovedByUserId() { return removedByUserId; }
    public Instant getCreatedAt() { return createdAt; }
}
