package com.somlits.premises.api.v1.controller;

import com.somlits.premises.api.v1.dto.request.BatchOperationRequest;
import com.somlits.premises.api.v1.dto.request.CloseBatchRequest;
import com.somlits.premises.api.v1.dto.request.CreateBatchRequest;
import com.somlits.premises.api.v1.dto.response.BatchOperationLogResponse;
import com.somlits.premises.api.v1.dto.response.BatchResponse;
import com.somlits.premises.application.BatchService;
import com.somlits.premises.domain.enums.BatchOperationType;
import com.somlits.premises.domain.exception.BusinessRuleViolationException;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/internal/v1/premises/{premisesId}/batches")
public class BatchController {

    private final BatchService batchService;

    public BatchController(BatchService batchService) {
        this.batchService = batchService;
    }

    // ── Open a new batch ──────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<BatchResponse> openBatch(
            @PathVariable UUID premisesId,
            @RequestBody CreateBatchRequest req,
            @AuthenticationPrincipal Jwt jwt) {

        UUID callerId = UUID.fromString(jwt.getSubject());
        var batch = batchService.openBatch(premisesId, req.getSpecies(), req.getNotes(), callerId);
        return ResponseEntity
                .created(URI.create("/internal/v1/premises/" + premisesId + "/batches/" + batch.getId()))
                .body(BatchResponse.from(batch));
    }

    // ── List batches at premises ──────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<Page<BatchResponse>> list(
            @PathVariable UUID premisesId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return ResponseEntity.ok(
                batchService.listByPremises(premisesId, status, page, size)
                        .map(BatchResponse::from));
    }

    // ── Get single batch ──────────────────────────────────────────────────────

    @GetMapping("/{batchId}")
    public ResponseEntity<BatchResponse> getById(
            @PathVariable UUID premisesId,
            @PathVariable UUID batchId) {

        return ResponseEntity.ok(BatchResponse.from(batchService.getById(batchId)));
    }

    @GetMapping("/by-code/{batchCode}")
    public ResponseEntity<BatchResponse> getByCode(
            @PathVariable UUID premisesId,
            @PathVariable String batchCode) {

        return ResponseEntity.ok(BatchResponse.from(batchService.getByCode(batchCode)));
    }

    // ── Close a batch ─────────────────────────────────────────────────────────

    @PostMapping("/{batchId}/close")
    public ResponseEntity<BatchResponse> close(
            @PathVariable UUID premisesId,
            @PathVariable UUID batchId,
            @RequestBody(required = false) CloseBatchRequest req,
            @AuthenticationPrincipal Jwt jwt) {

        UUID callerId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(BatchResponse.from(batchService.closeBatch(batchId, callerId)));
    }

    // ── Record a batch operation ──────────────────────────────────────────────

    @PostMapping("/{batchId}/operations")
    public ResponseEntity<BatchOperationLogResponse> recordOperation(
            @PathVariable UUID premisesId,
            @PathVariable UUID batchId,
            @Valid @RequestBody BatchOperationRequest req,
            @AuthenticationPrincipal Jwt jwt) {

        UUID callerId = UUID.fromString(jwt.getSubject());

        BatchOperationType opType;
        try {
            opType = BatchOperationType.valueOf(req.getOperationType().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessRuleViolationException("ERR-BAT-030",
                    "Invalid operationType: " + req.getOperationType());
        }

        var batch = batchService.getById(batchId);
        var opLog = batchService.recordOperation(
                batchId, opType, batch.getAnimalCount(),
                req.getDetails(), req.getNotes(), callerId);

        return ResponseEntity
                .created(URI.create("/internal/v1/premises/" + premisesId +
                        "/batches/" + batchId + "/operations/" + opLog.getId()))
                .body(BatchOperationLogResponse.from(opLog));
    }

    // ── List operations for a batch ───────────────────────────────────────────

    @GetMapping("/{batchId}/operations")
    public ResponseEntity<Page<BatchOperationLogResponse>> listOperations(
            @PathVariable UUID premisesId,
            @PathVariable UUID batchId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return ResponseEntity.ok(
                batchService.listOperations(batchId, page, size)
                        .map(BatchOperationLogResponse::from));
    }
}
