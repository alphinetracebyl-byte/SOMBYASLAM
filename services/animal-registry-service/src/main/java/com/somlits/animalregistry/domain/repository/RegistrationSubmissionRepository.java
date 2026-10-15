package com.somlits.animalregistry.domain.repository;

import com.somlits.animalregistry.domain.model.RegistrationSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RegistrationSubmissionRepository extends JpaRepository<RegistrationSubmission, UUID> {
    Optional<RegistrationSubmission> findByIdempotencyKey(UUID idempotencyKey);
    List<RegistrationSubmission> findByAnimalIdOrderBySubmittedAtDesc(UUID animalId);
}
