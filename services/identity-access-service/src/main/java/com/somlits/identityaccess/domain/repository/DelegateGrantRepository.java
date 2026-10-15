package com.somlits.identityaccess.domain.repository;

import com.somlits.identityaccess.domain.model.DelegateGrant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface DelegateGrantRepository extends JpaRepository<DelegateGrant, UUID> {

    @Query("SELECT g FROM DelegateGrant g WHERE g.granteeUserId = :granteeUserId AND g.ownerId = :ownerId AND g.status = 'ACTIVE'")
    List<DelegateGrant> findActiveByGranteeAndOwner(UUID granteeUserId, UUID ownerId);

    List<DelegateGrant> findByGrantorUserIdAndStatus(UUID grantorUserId, String status);
}
