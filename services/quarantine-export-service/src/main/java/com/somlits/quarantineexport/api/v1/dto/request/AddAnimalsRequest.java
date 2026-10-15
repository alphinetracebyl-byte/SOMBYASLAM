package com.somlits.quarantineexport.api.v1.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public class AddAnimalsRequest {

    @NotEmpty(message = "animals list must not be empty")
    @Valid
    private List<AnimalItemDto> animals;

    public List<AnimalItemDto> getAnimals() { return animals; }
    public void setAnimals(List<AnimalItemDto> animals) { this.animals = animals; }

    public static class AnimalItemDto {

        @NotNull(message = "animalId is required")
        private UUID animalId;

        @NotNull(message = "animalCode is required")
        private String animalCode;

        public UUID getAnimalId() { return animalId; }
        public void setAnimalId(UUID animalId) { this.animalId = animalId; }

        public String getAnimalCode() { return animalCode; }
        public void setAnimalCode(String animalCode) { this.animalCode = animalCode; }
    }
}
