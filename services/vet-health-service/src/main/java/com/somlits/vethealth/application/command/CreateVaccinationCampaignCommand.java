package com.somlits.vethealth.application.command;

import java.time.LocalDate;
import java.util.UUID;

public record CreateVaccinationCampaignCommand(
        String campaignName,
        String targetSpecies,
        String targetRegionCode,
        String targetDistrictCode,
        String vaccineProduct,
        String vaccineBatchNumber,
        LocalDate plannedStartDate,
        LocalDate plannedEndDate,
        Integer plannedAnimalCount,
        UUID assignedVetId,
        UUID createdBy
) {}
