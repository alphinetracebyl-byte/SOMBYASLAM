package com.somlits.notification.domain.repository;

import com.somlits.notification.domain.enums.EventCategory;
import com.somlits.notification.domain.enums.NotificationChannel;
import com.somlits.notification.domain.model.NotificationTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationTemplateRepository extends JpaRepository<NotificationTemplate, UUID> {

    Optional<NotificationTemplate> findByTemplateCode(String templateCode);

    List<NotificationTemplate> findByEventCategoryAndChannelAndIsActiveTrue(
            EventCategory category, NotificationChannel channel);

    List<NotificationTemplate> findByIsActiveTrue();
}
