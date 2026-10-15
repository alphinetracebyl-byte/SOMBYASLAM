package com.somlits.notification.application.service;

import com.somlits.notification.api.v1.dto.request.CreateTemplateRequest;
import com.somlits.notification.domain.exception.BusinessRuleViolationException;
import com.somlits.notification.domain.exception.DomainNotFoundException;
import com.somlits.notification.domain.model.NotificationTemplate;
import com.somlits.notification.domain.repository.NotificationTemplateRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class TemplateService {

    private static final Logger log = LoggerFactory.getLogger(TemplateService.class);

    private final NotificationTemplateRepository templateRepository;

    public TemplateService(NotificationTemplateRepository templateRepository) {
        this.templateRepository = templateRepository;
    }

    public NotificationTemplate create(CreateTemplateRequest req, UUID createdBy) {
        log.info("Creating notification template templateCode={} createdBy={}", req.templateCode(), createdBy);
        if (templateRepository.findByTemplateCode(req.templateCode()).isPresent()) {
            throw new BusinessRuleViolationException(
                    "ERR-NOT-001",
                    "Template code already exists: " + req.templateCode());
        }
        NotificationTemplate template = NotificationTemplate.create(
                req.templateCode(),
                req.eventCategory(),
                req.channel(),
                req.language(),
                req.subject(),
                req.bodyTemplate(),
                createdBy
        );
        NotificationTemplate saved = templateRepository.save(template);
        log.info("Notification template created id={} templateCode={}", saved.getId(), saved.getTemplateCode());
        return saved;
    }

    public NotificationTemplate deactivate(UUID id) {
        log.info("Deactivating notification template id={}", id);
        NotificationTemplate template = getById(id);
        template.deactivate();
        return templateRepository.save(template);
    }

    public NotificationTemplate activate(UUID id) {
        log.info("Activating notification template id={}", id);
        NotificationTemplate template = getById(id);
        template.activate();
        return templateRepository.save(template);
    }

    @Transactional(readOnly = true)
    public List<NotificationTemplate> listActive() {
        return templateRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public NotificationTemplate getById(UUID id) {
        return templateRepository.findById(id)
                .orElseThrow(() -> new DomainNotFoundException(
                        "ERR-NOT-002",
                        "Notification template not found: " + id));
    }
}
