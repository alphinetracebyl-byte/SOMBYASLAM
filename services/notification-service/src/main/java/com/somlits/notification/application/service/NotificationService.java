package com.somlits.notification.application.service;

import com.somlits.notification.api.v1.dto.request.SendNotificationRequest;
import com.somlits.notification.domain.enums.NotificationChannel;
import com.somlits.notification.domain.enums.NotificationStatus;
import com.somlits.notification.domain.exception.DomainNotFoundException;
import com.somlits.notification.domain.model.Notification;
import com.somlits.notification.domain.repository.NotificationRepository;
import com.somlits.notification.domain.repository.NotificationTemplateRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;
import java.util.UUID;

@Service
@Transactional
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final NotificationTemplateRepository notificationTemplateRepository;

    public NotificationService(NotificationRepository notificationRepository,
                               NotificationTemplateRepository notificationTemplateRepository) {
        this.notificationRepository = notificationRepository;
        this.notificationTemplateRepository = notificationTemplateRepository;
    }

    public Notification send(SendNotificationRequest req, UUID sentBy) {
        log.info("Sending notification to recipientId={} via channel={} category={}",
                req.recipientId(), req.channel(), req.eventCategory());

        int year = Year.now().getValue();
        long count = notificationRepository.count();
        String notificationCode = "NOT-" + year + "-" + String.format("%06d", count + 1);

        String resolvedSubject = req.subject();
        String resolvedBody = req.body();
        UUID templateId = null;

        if (req.templateCode() != null && !req.templateCode().isBlank()) {
            var templateOpt = notificationTemplateRepository.findByTemplateCode(req.templateCode());
            if (templateOpt.isPresent()) {
                var template = templateOpt.get();
                templateId = template.getId();
                if (resolvedSubject == null && template.getSubject() != null) {
                    resolvedSubject = template.getSubject();
                }
                if (resolvedBody == null || resolvedBody.isBlank()) {
                    resolvedBody = template.getBodyTemplate();
                }
                log.debug("Resolved template templateCode={} id={}", req.templateCode(), templateId);
            } else {
                log.warn("Template not found for templateCode={}, proceeding without template", req.templateCode());
            }
        }

        if (resolvedBody == null || resolvedBody.isBlank()) {
            resolvedBody = "";
        }

        Notification notification = Notification.create(
                notificationCode,
                req.recipientId(),
                req.recipientPhone(),
                req.recipientEmail(),
                req.channel(),
                req.eventCategory(),
                templateId,
                resolvedSubject,
                resolvedBody
        );

        notification = notificationRepository.save(notification);

        attemptDelivery(notification);

        notification = notificationRepository.save(notification);

        log.info("Notification persisted notificationCode={} status={}", notificationCode, notification.getStatus());
        return notification;
    }

    private void attemptDelivery(Notification notification) {
        NotificationChannel channel = notification.getChannel();
        try {
            switch (channel) {
                case SMS -> {
                    if (notification.getRecipientPhone() != null && !notification.getRecipientPhone().isBlank()) {
                        log.debug("Simulating SMS delivery to phone={}", notification.getRecipientPhone());
                        notification.markSent();
                    } else {
                        notification.markFailed("No recipient phone number provided for SMS channel");
                    }
                }
                case EMAIL -> {
                    if (notification.getRecipientEmail() != null && !notification.getRecipientEmail().isBlank()) {
                        log.debug("Simulating EMAIL delivery to email={}", notification.getRecipientEmail());
                        notification.markSent();
                    } else {
                        notification.markFailed("No recipient email address provided for EMAIL channel");
                    }
                }
                case IN_APP -> {
                    log.debug("Marking IN_APP notification as sent for recipientId={}", notification.getRecipientId());
                    notification.markSent();
                }
                case PUSH -> {
                    log.debug("Simulating PUSH delivery for recipientId={}", notification.getRecipientId());
                    notification.markSent();
                }
                default -> notification.markFailed("Unknown channel: " + channel);
            }
        } catch (Exception ex) {
            log.error("Delivery attempt failed for notificationCode={}: {}",
                    notification.getNotificationCode(), ex.getMessage(), ex);
            notification.markFailed("Delivery error: " + ex.getMessage());
        }
    }

    public Notification markRead(UUID notificationId, UUID userId) {
        log.info("Marking notification as read notificationId={} userId={}", notificationId, userId);
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new DomainNotFoundException(
                        "ERR-NOT-101",
                        "Notification not found: " + notificationId));

        if (!notification.getRecipientId().equals(userId)) {
            throw new DomainNotFoundException(
                    "ERR-NOT-102",
                    "Notification not found for this user: " + notificationId);
        }

        notification.markRead();
        return notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public Page<Notification> getMyNotifications(UUID userId, NotificationStatus status, Pageable pageable) {
        if (status != null) {
            return notificationRepository.findByRecipientIdAndStatusOrderByCreatedAtDesc(userId, status, pageable);
        }
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Transactional(readOnly = true)
    public long countUnread(UUID userId) {
        return notificationRepository.countByRecipientIdAndStatus(userId, NotificationStatus.PENDING);
    }
}
