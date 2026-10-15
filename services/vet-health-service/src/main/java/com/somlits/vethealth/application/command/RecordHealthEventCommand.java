package com.somlits.vethealth.application.command;

import com.somlits.vethealth.domain.enums.FitnessDecision;
import com.somlits.vethealth.domain.enums.HealthEventType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record RecordHealthEventCommand(
        HealthEventType eventType,
        UUID animalId,
        String animalCode,
        UUID premisesId,
        String premisesCode,
        UUID responsibleVetId,
        String responsibleVetName,
        LocalDate eventDate,
        LocalTime eventTime,
        String diagnosis,
        String treatment,
        String vaccineProduct,
        String vaccineBatchNumber,
        LocalDate vaccineExpiryDate,
        BigDecimal doseMl,
        String routeOfAdministration,
        LocalDate nextDueDate,
        String clinicalNotes,
        FitnessDecision fitnessDecision,
        String fitnessNotes,
        UUID createdBy
) {}
