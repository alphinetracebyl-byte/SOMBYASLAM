package com.somlits.animalregistry.domain.repository;

import com.somlits.animalregistry.domain.model.AnimalStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AnimalStatusHistoryRepository extends JpaRepository<AnimalStatusHistory, UUID> {
    List<AnimalStatusHistory> findByAnimalIdOrderByOccurredAtDesc(UUID animalId);
}
