package com.somlits.notification.api.v1.controller;

import com.somlits.notification.api.v1.dto.request.SendNotificationRequest;
import com.somlits.notification.api.v1.dto.response.NotificationResponse;
import com.somlits.notification.application.service.NotificationService;
import com.somlits.notification.domain.enums.NotificationStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/internal/v1/notifications")
@Tag(name = "Notifications", description = "Send and manage notifications for system users")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Send a notification", description = "Sends a notification to a recipient via the specified channel")
    public NotificationResponse send(
            @Valid @RequestBody SendNotificationRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return NotificationResponse.from(notificationService.send(request, userId));
    }

    @GetMapping("/my")
    @Operation(summary = "Get my notifications", description = "Returns a paginated list of notifications for the current user")
    public Page<NotificationResponse> getMyNotifications(
            @RequestParam(required = false) NotificationStatus status,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return notificationService.getMyNotifications(userId, status, pageable)
                .map(NotificationResponse::from);
    }

    @PostMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Mark notification as read", description = "Marks a specific notification as read for the current user")
    public ResponseEntity<Void> markRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        notificationService.markRead(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Count unread notifications", description = "Returns the number of unread (PENDING) notifications for the current user")
    public UnreadCountResponse countUnread(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        long count = notificationService.countUnread(userId);
        return new UnreadCountResponse(count);
    }

    public record UnreadCountResponse(long unreadCount) {}
}
