package com.somlits.reporting.api.v1.dto.response;

import java.util.List;

public record MinistryDashboardResponse(
        long totalAnimals,
        long activeAnimals,
        long todayRegistrations,
        long pendingSubmissions,
        long activeMovements,
        long openDiseaseCases,
        long vaccinationsDueThisWeek,
        long pendingCertifications,
        List<SpeciesCount> animalsBySpecies,
        List<StatusCount> movementsByStatus,
        List<Object> recentActivity
) {
    public record SpeciesCount(String species, long count) {}
    public record StatusCount(String status, long count) {}
}
