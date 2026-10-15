package com.somlits.premises.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.premises.application.command.ApprovePremisesCommand;
import com.somlits.premises.application.command.ClosePremisesCommand;
import com.somlits.premises.application.command.ReactivatePremisesCommand;
import com.somlits.premises.application.command.RegisterPremisesCommand;
import com.somlits.premises.application.command.RejectPremisesCommand;
import com.somlits.premises.application.command.SubmitPremisesCommand;
import com.somlits.premises.application.command.SuspendPremisesCommand;
import com.somlits.premises.application.command.UpdatePremisesCommand;
import com.somlits.premises.application.query.GetPremisesByIdQuery;
import com.somlits.premises.application.query.ListPremisesQuery;
import com.somlits.premises.domain.entity.Premises;
import com.somlits.premises.domain.entity.PremisesStatusHistory;
import com.somlits.premises.domain.enums.PremisesStatus;
import com.somlits.premises.domain.enums.PremisesType;
import com.somlits.premises.domain.exception.BusinessRuleViolationException;
import com.somlits.premises.domain.exception.DomainNotFoundException;
import com.somlits.premises.domain.repository.PremisesRepository;
import com.somlits.premises.domain.repository.PremisesStatusHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PremisesService {

    private static final Logger log = LoggerFactory.getLogger(PremisesService.class);
    private static final String AGGREGATE_TYPE = "Premises";

    private final PremisesRepository premisesRepo;
    private final PremisesStatusHistoryRepository historyRepo;
    private final PremisesCodeGenerator codeGenerator;
    private final OutboxService outbox;
    private final ObjectMapper objectMapper;

    public PremisesService(PremisesRepository premisesRepo,
                            PremisesStatusHistoryRepository historyRepo,
                            PremisesCodeGenerator codeGenerator,
                            OutboxService outbox,
                            ObjectMapper objectMapper) {
        this.premisesRepo = premisesRepo;
        this.historyRepo = historyRepo;
        this.codeGenerator = codeGenerator;
        this.outbox = outbox;
        this.objectMapper = objectMapper;
    }

    // ── Commands ──────────────────────────────────────────────────────────────

    @Transactional
    public Premises register(RegisterPremisesCommand cmd) {
        Premises premises = Premises.create(
                cmd.getPremisesType(), cmd.getPremisesName(),
                cmd.getOwnerId(), cmd.getOwnerCode(),
                cmd.getRegionCode(), cmd.getDistrictCode(),
                cmd.getPhysicalAddress(),
                cmd.getGpsLatitude(), cmd.getGpsLongitude(),
                cmd.getRegisteredBy());

        // Set optional fields
        premises.updateDetails(
                cmd.getPremisesName(), cmd.getRegionCode(), cmd.getDistrictCode(),
                cmd.getVillageOrSettlement(), cmd.getPhysicalAddress(),
                cmd.getGpsLatitude(), cmd.getGpsLongitude(),
                cmd.getAreaHectares(), cmd.getCapacityAnimals(),
                cmd.getAllowedSpecies(), cmd.getLicenseNumber(),
                cmd.getLicenseExpiryDate(), cmd.getIsTemporary(),
                cmd.getTemporaryEndDate(), null);

        // Generate premises code
        String code = codeGenerator.next();
        premises.setPremisesCode(code);

        premisesRepo.save(premises);

        historyRepo.save(PremisesStatusHistory.of(
                premises.getId(), null, PremisesStatus.DRAFT.name(),
                cmd.getRegisteredBy(), "Premises registered"));

        publishEvent("PremisesRegisteredEvent", premises.getId(), Map.of(
                "premisesId", premises.getId(),
                "premisesCode", code,
                "premisesType", premises.getPremisesType().name(),
                "ownerId", premises.getOwnerId(),
                "regionCode", premises.getRegionCode(),
                "status", premises.getStatus().name()));

        log.info("Premises registered: code={} type={}", code, premises.getPremisesType());
        return premises;
    }

    @Transactional
    public Premises update(UpdatePremisesCommand cmd) {
        Premises premises = findOrThrow(cmd.getPremisesId());

        if (premises.getStatus() != PremisesStatus.DRAFT
                && premises.getStatus() != PremisesStatus.REJECTED) {
            throw new BusinessRuleViolationException("ERR-PRM-010",
                    "Only DRAFT or REJECTED premises can be updated (current: " + premises.getStatus() + ")");
        }

        premises.updateDetails(
                cmd.getPremisesName(), cmd.getRegionCode(), cmd.getDistrictCode(),
                cmd.getVillageOrSettlement(), cmd.getPhysicalAddress(),
                cmd.getGpsLatitude(), cmd.getGpsLongitude(),
                cmd.getAreaHectares(), cmd.getCapacityAnimals(),
                cmd.getAllowedSpecies(), cmd.getLicenseNumber(),
                cmd.getLicenseExpiryDate(), cmd.getIsTemporary(),
                cmd.getTemporaryEndDate(), cmd.getOfficerNotes());

        premisesRepo.save(premises);
        log.info("Premises updated: id={}", premises.getId());
        return premises;
    }

    @Transactional
    public Premises submit(SubmitPremisesCommand cmd) {
        Premises premises = findOrThrow(cmd.premisesId());
        String fromStatus = premises.getStatus().name();
        premises.submit();
        premisesRepo.save(premises);

        historyRepo.save(PremisesStatusHistory.of(
                premises.getId(), fromStatus, PremisesStatus.SUBMITTED.name(),
                cmd.callerUserId(), "Premises submitted for review"));

        publishEvent("PremisesSubmittedEvent", premises.getId(), Map.of(
                "premisesId", premises.getId(),
                "premisesCode", premises.getPremisesCode(),
                "ownerId", premises.getOwnerId()));

        log.info("Premises submitted: id={}", premises.getId());
        return premises;
    }

    @Transactional
    public Premises approve(ApprovePremisesCommand cmd) {
        Premises premises = findOrThrow(cmd.premisesId());
        String fromStatus = premises.getStatus().name();
        premises.approve(cmd.callerUserId());
        premisesRepo.save(premises);

        historyRepo.save(PremisesStatusHistory.of(
                premises.getId(), fromStatus, PremisesStatus.APPROVED.name(),
                cmd.callerUserId(), "Premises approved"));

        publishEvent("PremisesApprovedEvent", premises.getId(), Map.of(
                "premisesId", premises.getId(),
                "premisesCode", premises.getPremisesCode(),
                "ownerId", premises.getOwnerId(),
                "regionCode", premises.getRegionCode()));

        log.info("Premises approved: id={}", premises.getId());
        return premises;
    }

    @Transactional
    public Premises reject(RejectPremisesCommand cmd) {
        Premises premises = findOrThrow(cmd.premisesId());
        String fromStatus = premises.getStatus().name();
        premises.reject(cmd.callerUserId(), cmd.reason());
        premisesRepo.save(premises);

        historyRepo.save(PremisesStatusHistory.of(
                premises.getId(), fromStatus, PremisesStatus.REJECTED.name(),
                cmd.callerUserId(), "Rejected: " + cmd.reason()));

        publishEvent("PremisesRejectedEvent", premises.getId(), Map.of(
                "premisesId", premises.getId(),
                "premisesCode", premises.getPremisesCode(),
                "reason", cmd.reason()));

        log.info("Premises rejected: id={}", premises.getId());
        return premises;
    }

    @Transactional
    public Premises suspend(SuspendPremisesCommand cmd) {
        Premises premises = findOrThrow(cmd.premisesId());
        String fromStatus = premises.getStatus().name();
        premises.suspend(cmd.reason());
        premisesRepo.save(premises);

        historyRepo.save(PremisesStatusHistory.of(
                premises.getId(), fromStatus, PremisesStatus.SUSPENDED.name(),
                cmd.callerUserId(), "Suspended: " + cmd.reason()));

        publishEvent("PremisesSuspendedEvent", premises.getId(), Map.of(
                "premisesId", premises.getId(),
                "premisesCode", premises.getPremisesCode(),
                "reason", cmd.reason()));

        log.info("Premises suspended: id={}", premises.getId());
        return premises;
    }

    @Transactional
    public Premises reactivate(ReactivatePremisesCommand cmd) {
        Premises premises = findOrThrow(cmd.premisesId());
        String fromStatus = premises.getStatus().name();
        premises.reactivate();
        premisesRepo.save(premises);

        historyRepo.save(PremisesStatusHistory.of(
                premises.getId(), fromStatus, PremisesStatus.APPROVED.name(),
                cmd.callerUserId(), "Premises reactivated"));

        publishEvent("PremisesReactivatedEvent", premises.getId(), Map.of(
                "premisesId", premises.getId(),
                "premisesCode", premises.getPremisesCode()));

        log.info("Premises reactivated: id={}", premises.getId());
        return premises;
    }

    @Transactional
    public Premises close(ClosePremisesCommand cmd) {
        Premises premises = findOrThrow(cmd.premisesId());
        String fromStatus = premises.getStatus().name();
        premises.close();
        premisesRepo.save(premises);

        historyRepo.save(PremisesStatusHistory.of(
                premises.getId(), fromStatus, PremisesStatus.CLOSED.name(),
                cmd.callerUserId(), "Premises closed"));

        publishEvent("PremisesClosedEvent", premises.getId(), Map.of(
                "premisesId", premises.getId(),
                "premisesCode", premises.getPremisesCode()));

        log.info("Premises closed: id={}", premises.getId());
        return premises;
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Premises getById(GetPremisesByIdQuery query) {
        return findOrThrow(query.premisesId());
    }

    @Transactional(readOnly = true)
    public Premises getByCode(String premisesCode) {
        return premisesRepo.findByPremisesCode(premisesCode)
                .orElseThrow(() -> new DomainNotFoundException("Premises not found with code: " + premisesCode));
    }

    @Transactional(readOnly = true)
    public List<Premises> getByOwner(UUID ownerId) {
        return premisesRepo.findByOwnerId(ownerId);
    }

    @Transactional(readOnly = true)
    public Page<Premises> list(ListPremisesQuery query) {
        PremisesType typeEnum = query.premisesType() != null
                ? parseEnum(PremisesType.class, query.premisesType(), "premisesType")
                : null;
        PremisesStatus statusEnum = query.status() != null
                ? parseEnum(PremisesStatus.class, query.status(), "status")
                : null;

        PageRequest pageable = PageRequest.of(query.page(), query.size(),
                Sort.by("createdAt").descending());
        return premisesRepo.search(query.ownerId(), query.regionCode(), query.districtCode(),
                typeEnum, statusEnum, pageable);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Premises findOrThrow(UUID id) {
        return premisesRepo.findById(id)
                .orElseThrow(() -> new DomainNotFoundException("Premises not found: " + id));
    }

    private <T extends Enum<T>> T parseEnum(Class<T> type, String value, String field) {
        try {
            return Enum.valueOf(type, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessRuleViolationException("ERR-PRM-020",
                    "Invalid value '" + value + "' for field " + field);
        }
    }

    private void publishEvent(String type, UUID aggregateId, Map<String, Object> payload) {
        try {
            outbox.publish(type, AGGREGATE_TYPE, aggregateId, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.error("Failed to serialize outbox event {}: {}", type, e.getMessage());
        }
    }
}
