package com.somlits.animalregistry.api.v1.controller;

import com.somlits.animalregistry.api.v1.dto.request.RegistrationRequest;
import com.somlits.animalregistry.api.v1.dto.request.RejectRegistrationRequest;
import com.somlits.animalregistry.api.v1.dto.request.VerifyRegistrationRequest;
import com.somlits.animalregistry.api.v1.dto.response.AnimalResponse;
import com.somlits.animalregistry.api.v1.dto.response.RegistrationResponse;
import com.somlits.animalregistry.application.AnimalRegistrationService;
import com.somlits.animalregistry.domain.exception.DomainNotFoundException;
import com.somlits.animalregistry.domain.model.AnimalRecord;
import com.somlits.animalregistry.domain.model.RegistrationSubmission;
import com.somlits.animalregistry.domain.repository.AnimalRecordRepository;
import com.somlits.animalregistry.domain.repository.RegistrationSubmissionRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/internal/v1/animal-registrations")
public class AnimalRegistrationController {

    private final AnimalRegistrationService registrationService;
    private final RegistrationSubmissionRepository submissionRepo;
    private final AnimalRecordRepository animalRepo;

    public AnimalRegistrationController(AnimalRegistrationService registrationService,
                                        RegistrationSubmissionRepository submissionRepo,
                                        AnimalRecordRepository animalRepo) {
        this.registrationService = registrationService;
        this.submissionRepo = submissionRepo;
        this.animalRepo = animalRepo;
    }

    @PostMapping
    public ResponseEntity<RegistrationResponse> submitRegistration(
            @Valid @RequestBody RegistrationRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        RegistrationSubmission submission = registrationService.register(req, callerId);
        AnimalRecord animal = animalRepo.findById(submission.getAnimalId())
                .orElseThrow(() -> new DomainNotFoundException("Animal not found"));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(RegistrationResponse.from(submission, animal.getAnimalCode()));
    }

    @GetMapping("/{submissionId}")
    public ResponseEntity<RegistrationResponse> getSubmission(@PathVariable UUID submissionId) {
        RegistrationSubmission submission = submissionRepo.findById(submissionId)
                .orElseThrow(() -> new DomainNotFoundException("Submission not found: " + submissionId));
        AnimalRecord animal = animalRepo.findById(submission.getAnimalId())
                .orElseThrow(() -> new DomainNotFoundException("Animal not found"));
        return ResponseEntity.ok(RegistrationResponse.from(submission, animal.getAnimalCode()));
    }

    @PostMapping("/{submissionId}/verify")
    public ResponseEntity<AnimalResponse> verify(
            @PathVariable UUID submissionId,
            @Valid @RequestBody VerifyRegistrationRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        AnimalRecord animal = registrationService.verify(submissionId, req, callerId);
        return ResponseEntity.ok(AnimalResponse.from(animal));
    }

    @PostMapping("/{submissionId}/reject")
    public ResponseEntity<Void> reject(
            @PathVariable UUID submissionId,
            @Valid @RequestBody RejectRegistrationRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        registrationService.reject(submissionId, req, callerId);
        return ResponseEntity.noContent().build();
    }
}
