package com.somlits.identityaccess.domain.repository;

import com.somlits.identityaccess.domain.enums.UserStatus;
import com.somlits.identityaccess.domain.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;
import java.util.UUID;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {

    Optional<UserAccount> findByKeycloakSubjectId(String keycloakSubjectId);

    boolean existsByPhoneLast4AndAccountStatusIn(String phoneLast4, java.util.List<UserStatus> statuses);

    @Query("SELECT u FROM UserAccount u WHERE u.ownerId = :ownerId AND u.accountStatus = 'ACTIVE'")
    java.util.List<UserAccount> findActiveByOwnerId(UUID ownerId);
}
