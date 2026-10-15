package com.somlits.quarantineexport.application.command;

import java.util.List;
import java.util.UUID;

public record AddAnimalsCommand(
        UUID consignmentId,
        List<AnimalItem> animals,
        UUID addedBy
) {
    public record AnimalItem(UUID animalId, String animalCode) {}
}
