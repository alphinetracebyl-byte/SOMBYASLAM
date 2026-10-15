package com.somlits.quarantineexport.domain.repository;

import com.somlits.quarantineexport.domain.model.ConsignmentAnimal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ConsignmentAnimalRepository extends JpaRepository<ConsignmentAnimal, UUID> {

    List<ConsignmentAnimal> findByConsignmentId(UUID consignmentId);

    List<ConsignmentAnimal> findByAnimalId(UUID animalId);
}
