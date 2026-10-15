package com.somlits.identityaccess.domain.repository;

import com.somlits.identityaccess.domain.enums.InvitationStatus;
import com.somlits.identityaccess.domain.model.Invitation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface InvitationRepository extends JpaRepository<Invitation, UUID> {

    Optional<Invitation> findByInvitationCodeHashAndStatus(String codeHash, InvitationStatus status);
}
