package com.somlits.notification.api.v1.controller;

import com.somlits.notification.api.v1.dto.request.CreateTemplateRequest;
import com.somlits.notification.api.v1.dto.response.NotificationTemplateResponse;
import com.somlits.notification.application.service.TemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/internal/v1/notification-templates")
@Tag(name = "Notification Templates", description = "Manage notification templates for multi-channel delivery")
public class TemplateController {

    private final TemplateService templateService;

    public TemplateController(TemplateService templateService) {
        this.templateService = templateService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('MINISTRY_OFFICER', 'ADMIN')")
    @Operation(summary = "Create a notification template", description = "Creates a new notification template (MINISTRY_OFFICER or ADMIN only)")
    public NotificationTemplateResponse create(
            @Valid @RequestBody CreateTemplateRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return NotificationTemplateResponse.from(templateService.create(request, userId));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('MINISTRY_OFFICER', 'ADMIN', 'SYSTEM')")
    @Operation(summary = "List active templates", description = "Returns all active notification templates")
    public List<NotificationTemplateResponse> listActive() {
        return templateService.listActive().stream()
                .map(NotificationTemplateResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MINISTRY_OFFICER', 'ADMIN', 'SYSTEM')")
    @Operation(summary = "Get template by ID", description = "Returns a specific notification template by its UUID")
    public NotificationTemplateResponse getById(@PathVariable UUID id) {
        return NotificationTemplateResponse.from(templateService.getById(id));
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('MINISTRY_OFFICER', 'ADMIN')")
    @Operation(summary = "Deactivate a template", description = "Deactivates a notification template so it is no longer used for dispatch")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        templateService.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('MINISTRY_OFFICER', 'ADMIN')")
    @Operation(summary = "Activate a template", description = "Re-activates a previously deactivated notification template")
    public ResponseEntity<Void> activate(@PathVariable UUID id) {
        templateService.activate(id);
        return ResponseEntity.noContent().build();
    }
}
