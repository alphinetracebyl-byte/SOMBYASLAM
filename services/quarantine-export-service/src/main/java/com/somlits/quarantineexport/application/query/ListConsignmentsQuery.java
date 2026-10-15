package com.somlits.quarantineexport.application.query;

import com.somlits.quarantineexport.domain.enums.ConsignmentStatus;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public record ListConsignmentsQuery(
        ConsignmentStatus status,
        UUID exporterOwnerId,
        String destinationCountry,
        Pageable pageable
) {}
