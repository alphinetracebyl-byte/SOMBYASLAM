package com.somlits.animalregistry.domain.repository;

import com.somlits.animalregistry.domain.enums.PhotoStatus;
import com.somlits.animalregistry.domain.enums.PhotoType;
import com.somlits.animalregistry.domain.model.AnimalPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AnimalPhotoRepository extends JpaRepository<AnimalPhoto, UUID> {
    List<AnimalPhoto> findByAnimalIdOrderByUploadedAtDesc(UUID animalId);
    Optional<AnimalPhoto> findByAnimalIdAndPhotoTypeAndStatus(UUID animalId, PhotoType type, PhotoStatus status);
    List<AnimalPhoto> findByAnimalIdAndPhotoTypeAndStatusNot(UUID animalId, PhotoType type, PhotoStatus excludedStatus);
}
