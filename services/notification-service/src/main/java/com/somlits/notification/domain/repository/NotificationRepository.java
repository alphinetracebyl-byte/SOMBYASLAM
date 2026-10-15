package com.somlits.notification.domain.repository;

import com.somlits.notification.domain.enums.NotificationStatus;
import com.somlits.notification.domain.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Page<Notification> findByRecipientIdOrderByCreatedAtDesc(UUID recipientId, Pageable pageable);

    Page<Notification> findByRecipientIdAndStatusOrderByCreatedAtDesc(
            UUID recipientId, NotificationStatus status, Pageable pageable);

    List<Notification> findByStatusOrderByCreatedAtAsc(NotificationStatus status);

    long countByRecipientIdAndStatus(UUID recipientId, NotificationStatus status);
}
