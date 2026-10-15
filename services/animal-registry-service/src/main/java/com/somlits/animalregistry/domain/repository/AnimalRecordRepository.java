package com.somlits.animalregistry.domain.repository;

import com.somlits.animalregistry.domain.enums.AnimalStatus;
import com.somlits.animalregistry.domain.model.AnimalRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface AnimalRecordRepository extends JpaRepository<AnimalRecord, UUID> {
    Optional<AnimalRecord> findByAnimalCode(String animalCode);
    Optional<AnimalRecord> findByActiveTagSerial(String tagSerial);
    boolean existsByAnimalCode(String animalCode);
    Page<AnimalRecord> findByCurrentOwnerId(UUID ownerId, Pageable pageable);
    Page<AnimalRecord> findByCurrentOwnerIdAndStatus(UUID ownerId, AnimalStatus status, Pageable pageable);

    @Query("SELECT a FROM AnimalRecord a WHERE " +
           "(:ownerId IS NULL OR a.currentOwnerId = :ownerId) AND " +
           "(:status IS NULL OR a.status = :status) AND " +
           "(:species IS NULL OR a.species = :species)")
    Page<AnimalRecord> search(UUID ownerId, AnimalStatus status,
                               com.somlits.animalregistry.domain.enums.Species species,
                               Pageable pageable);
}
