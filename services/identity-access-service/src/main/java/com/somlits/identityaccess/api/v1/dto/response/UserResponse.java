package com.somlits.identityaccess.api.v1.dto.response;

import com.somlits.identityaccess.domain.enums.UserStatus;
import com.somlits.identityaccess.domain.model.UserAccount;
import com.somlits.identityaccess.domain.model.UserRoleAssignment;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UserResponse(
        UUID userId,
        String phoneLast4,
        String fullName,
        String email,
        UserStatus accountStatus,
        UUID ownerId,
        Instant lastLoginAt,
        Instant createdAt,
        List<RoleAssignmentResponse> roles
) {
    public static UserResponse from(UserAccount user, List<UserRoleAssignment> roles) {
        return new UserResponse(
                user.getId(),
                user.getPhoneLast4(),
                user.getFullName(),
                user.getEmail(),
                user.getAccountStatus(),
                user.getOwnerId(),
                user.getLastLoginAt(),
                user.getCreatedAt(),
                roles.stream().map(RoleAssignmentResponse::from).toList()
        );
    }
}
