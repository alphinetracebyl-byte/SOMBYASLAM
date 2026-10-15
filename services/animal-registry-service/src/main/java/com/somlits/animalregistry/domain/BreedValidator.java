package com.somlits.animalregistry.domain;

import com.somlits.animalregistry.domain.enums.Species;

import java.util.List;
import java.util.Map;
import java.util.Set;

public final class BreedValidator {

    private static final Map<Species, Set<String>> BREEDS = Map.of(
        Species.CATTLE, Set.of(
            "ZEBU", "BORAN", "SOMALI_ZEBU", "CROSSBREED", "OTHER"
        ),
        Species.CAMEL, Set.of(
            "DROMEDARY", "CROSSBREED", "OTHER"
        ),
        Species.GOAT, Set.of(
            "SOMALI_GOAT", "GALLA", "BENADIR", "OTHER"
        ),
        Species.SHEEP, Set.of(
            "SOMALI_BLACKHEAD", "OGADEN", "BENADIR", "OTHER"
        )
    );

    private BreedValidator() {}

    public static boolean isValid(Species species, String breed) {
        if (species == null || breed == null) return false;
        Set<String> allowed = BREEDS.get(species);
        return allowed != null && allowed.contains(breed.toUpperCase());
    }

    public static List<String> breedsFor(Species species) {
        Set<String> allowed = BREEDS.get(species);
        return allowed == null ? List.of() : List.copyOf(allowed);
    }
}
