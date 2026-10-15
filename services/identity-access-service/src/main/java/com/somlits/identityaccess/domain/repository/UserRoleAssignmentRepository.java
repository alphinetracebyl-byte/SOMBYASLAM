package com.somlits.identityaccess.domain.repository;

import com.somlits.identityaccess.domain.model.UserRoleAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface UserRoleAssignmentRepository extends JpaRepository<UserRoleAssignment, UUID> {

    List<UserRoleAssignment> findByUserIdAndActiveTrue(UUID userId);

    List<UserRoleAssignment> findByUserIdAndActiveTrueAndOwnerIdIsNotNull(UUID userId);

    void deleteByUserId(UUID userId);
}
