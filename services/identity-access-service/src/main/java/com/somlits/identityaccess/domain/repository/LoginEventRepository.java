package com.somlits.identityaccess.domain.repository;

import com.somlits.identityaccess.domain.model.LoginEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface LoginEventRepository extends JpaRepository<LoginEvent, UUID> {

    Page<LoginEvent> findByUserIdOrderByOccurredAtDesc(UUID userId, Pageable pageable);
}
