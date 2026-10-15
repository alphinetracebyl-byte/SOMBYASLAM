package com.somlits.ownerorg.application.command;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.ownerorg.application.OutboxService;
import com.somlits.ownerorg.application.OwnerCodeGenerator;
import com.somlits.ownerorg.domain.entity.Owner;
import com.somlits.ownerorg.domain.entity.OwnerStatusHistory;
import com.somlits.ownerorg.domain.exception.DomainConflictException;
import com.somlits.ownerorg.domain.repository.OwnerRepository;
import com.somlits.ownerorg.domain.repository.OwnerStatusHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class RegisterOwnerCommandHandler {

    private static final Logger log = LoggerFactory.getLogger(RegisterOwnerCommandHandler.class);

    private final OwnerRepository ownerRepo;
    private final OwnerStatusHistoryRepository historyRepo;
    private final OwnerCodeGenerator codeGenerator;
    private final OutboxService outbox;
    private final ObjectMapper objectMapper;

    public RegisterOwnerCommandHandler(OwnerRepository ownerRepo,
                                       OwnerStatusHistoryRepository historyRepo,
                                       OwnerCodeGenerator codeGenerator,
                                       OutboxService outbox,
                                       ObjectMapper objectMapper) {
        this.ownerRepo = ownerRepo;
        this.historyRepo = historyRepo;
        this.codeGenerator = codeGenerator;
        this.outbox = outbox;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Owner handle(RegisterOwnerCommand cmd) {
        if (ownerRepo.existsByNationalIdNumber(cmd.nationalIdNumber())) {
            throw new DomainConflictException("ERR-OO-002",
                    "An owner with national ID number '" + cmd.nationalIdNumber() + "' already exists");
        }

        Owner owner = Owner.create(
                cmd.ownerType(),
                cmd.fullName(),
                cmd.nationalIdType(),
                cmd.nationalIdNumber(),
                cmd.primaryPhone(),
                cmd.regionCode(),
                cmd.districtCode(),
                cmd.registeredBy()
        );

        owner.updateProfile(
                cmd.fullName(),
                cmd.tradingName(),
                cmd.primaryPhone(),
                cmd.alternativePhone(),
                cmd.emailAddress(),
                cmd.regionCode(),
                cmd.districtCode(),
                cmd.villageOrSettlement(),
                cmd.gpsLatitude(),
                cmd.gpsLongitude()
        );

        String ownerCode = codeGenerator.next();
        owner.assignOwnerCode(ownerCode);
        ownerRepo.save(owner);

        historyRepo.save(OwnerStatusHistory.of(
                owner.getId(), null, owner.getStatus().name(),
                cmd.registeredBy(), "Owner registered"));

        publishEvent("OwnerRegisteredEvent", owner.getId(), Map.of(
                "ownerId", owner.getId(),
                "ownerCode", ownerCode,
                "ownerType", owner.getOwnerType().name(),
                "fullName", owner.getFullName(),
                "regionCode", owner.getRegionCode(),
                "districtCode", owner.getDistrictCode()
        ));

        log.info("Owner registered: code={} type={}", ownerCode, owner.getOwnerType());
        return owner;
    }

    private void publishEvent(String type, java.util.UUID aggId, Map<String, Object> payload) {
        try {
            outbox.publish(type, "Owner", aggId, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.error("Failed to serialize outbox event {}: {}", type, e.getMessage());
        }
    }
}
