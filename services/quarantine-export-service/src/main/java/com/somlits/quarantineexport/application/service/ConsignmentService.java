package com.somlits.quarantineexport.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.quarantineexport.application.ConsignmentCodeGenerator;
import com.somlits.quarantineexport.application.ExportClearanceCodeGenerator;
import com.somlits.quarantineexport.application.OutboxService;
import com.somlits.quarantineexport.application.QuarantineLotCodeGenerator;
import com.somlits.quarantineexport.application.command.AddAnimalsCommand;
import com.somlits.quarantineexport.application.command.CancelConsignmentCommand;
import com.somlits.quarantineexport.application.command.ConfirmExportCommand;
import com.somlits.quarantineexport.application.command.CreateQuarantineLotCommand;
import com.somlits.quarantineexport.application.command.FailQuarantineLotCommand;
import com.somlits.quarantineexport.application.command.IssueClearanceCommand;
import com.somlits.quarantineexport.application.command.IssueExportClearanceCommand;
import com.somlits.quarantineexport.application.command.PassQuarantineLotCommand;
import com.somlits.quarantineexport.application.command.RegisterConsignmentCommand;
import com.somlits.quarantineexport.application.command.StartQuarantineCommand;
import com.somlits.quarantineexport.application.command.SubmitConsignmentCommand;
import com.somlits.quarantineexport.application.query.GetConsignmentByCodeQuery;
import com.somlits.quarantineexport.application.query.GetConsignmentQuery;
import com.somlits.quarantineexport.application.query.ListConsignmentsQuery;
import com.somlits.quarantineexport.domain.model.Consignment;
import com.somlits.quarantineexport.domain.model.ConsignmentAnimal;
import com.somlits.quarantineexport.domain.model.ExportClearance;
import com.somlits.quarantineexport.domain.model.QuarantineLot;
import com.somlits.quarantineexport.domain.exception.DomainNotFoundException;
import com.somlits.quarantineexport.domain.repository.ConsignmentAnimalRepository;
import com.somlits.quarantineexport.domain.repository.ConsignmentRepository;
import com.somlits.quarantineexport.domain.repository.ExportClearanceRepository;
import com.somlits.quarantineexport.domain.repository.QuarantineLotRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ConsignmentService {

    private static final Logger log = LoggerFactory.getLogger(ConsignmentService.class);

    private final ConsignmentRepository consignmentRepo;
    private final ConsignmentAnimalRepository animalRepo;
    private final QuarantineLotRepository lotRepo;
    private final ExportClearanceRepository clearanceRepo;
    private final ConsignmentCodeGenerator consignmentCodeGen;
    private final QuarantineLotCodeGenerator lotCodeGen;
    private final ExportClearanceCodeGenerator clearanceCodeGen;
    private final OutboxService outbox;
    private final ObjectMapper objectMapper;

    public ConsignmentService(ConsignmentRepository consignmentRepo,
                               ConsignmentAnimalRepository animalRepo,
                               QuarantineLotRepository lotRepo,
                               ExportClearanceRepository clearanceRepo,
                               ConsignmentCodeGenerator consignmentCodeGen,
                               QuarantineLotCodeGenerator lotCodeGen,
                               ExportClearanceCodeGenerator clearanceCodeGen,
                               OutboxService outbox,
                               ObjectMapper objectMapper) {
        this.consignmentRepo = consignmentRepo;
        this.animalRepo = animalRepo;
        this.lotRepo = lotRepo;
        this.clearanceRepo = clearanceRepo;
        this.consignmentCodeGen = consignmentCodeGen;
        this.lotCodeGen = lotCodeGen;
        this.clearanceCodeGen = clearanceCodeGen;
        this.outbox = outbox;
        this.objectMapper = objectMapper;
    }

    // ---- Consignment Commands ----

    @Transactional
    public Consignment register(RegisterConsignmentCommand cmd) {
        String code = consignmentCodeGen.next();
        Consignment c = Consignment.create(
                cmd.exporterOwnerId(), cmd.exporterOwnerCode(),
                cmd.destinationCountry(), code, cmd.createdBy());
        consignmentRepo.save(c);
        publishEvent("ConsignmentRegisteredEvent", "Consignment", c.getId(),
                Map.of("consignmentId", c.getId(), "consignmentCode", code,
                       "exporterOwnerId", c.getExporterOwnerId(),
                       "destinationCountry", c.getDestinationCountry()));
        log.info("Consignment registered: code={}", code);
        return c;
    }

    @Transactional
    public void submit(SubmitConsignmentCommand cmd) {
        Consignment c = requireConsignment(cmd.consignmentId());
        c.submit();
        consignmentRepo.save(c);
        publishEvent("ConsignmentSubmittedEvent", "Consignment", c.getId(),
                Map.of("consignmentId", c.getId(), "consignmentCode", c.getConsignmentCode()));
        log.info("Consignment submitted: id={}", cmd.consignmentId());
    }

    @Transactional
    public void addAnimals(AddAnimalsCommand cmd) {
        Consignment c = requireConsignment(cmd.consignmentId());
        List<ConsignmentAnimal> animals = cmd.animals().stream()
                .map(item -> ConsignmentAnimal.add(c.getId(), item.animalId(), item.animalCode(), cmd.addedBy()))
                .toList();
        animalRepo.saveAll(animals);
        c.incrementTotalAnimals(animals.size());
        consignmentRepo.save(c);
        log.info("Added {} animals to consignment id={}", animals.size(), cmd.consignmentId());
    }

    @Transactional
    public void startQuarantine(StartQuarantineCommand cmd) {
        Consignment c = requireConsignment(cmd.consignmentId());
        c.startQuarantine(cmd.quarantinePremisesId(), cmd.quarantinePremisesCode());
        consignmentRepo.save(c);
        publishEvent("QuarantineStartedEvent", "Consignment", c.getId(),
                Map.of("consignmentId", c.getId(), "consignmentCode", c.getConsignmentCode(),
                       "quarantinePremisesId", c.getQuarantinePremisesId()));
        log.info("Quarantine started for consignment id={}", cmd.consignmentId());
    }

    @Transactional
    public void issueClearance(IssueClearanceCommand cmd) {
        Consignment c = requireConsignment(cmd.consignmentId());
        c.issueClearance();
        consignmentRepo.save(c);
        publishEvent("ExportClearanceIssuedEvent", "Consignment", c.getId(),
                Map.of("consignmentId", c.getId(), "consignmentCode", c.getConsignmentCode(),
                       "issuedBy", cmd.issuedBy()));
        log.info("Export clearance issued for consignment id={}", cmd.consignmentId());
    }

    @Transactional
    public void confirmExport(ConfirmExportCommand cmd) {
        Consignment c = requireConsignment(cmd.consignmentId());
        c.export(Instant.now());
        consignmentRepo.save(c);
        publishEvent("ConsignmentExportedEvent", "Consignment", c.getId(),
                Map.of("consignmentId", c.getId(), "consignmentCode", c.getConsignmentCode(),
                       "exportedAt", c.getExportedAt().toString()));
        log.info("Consignment exported: id={}", cmd.consignmentId());
    }

    @Transactional
    public void cancel(CancelConsignmentCommand cmd) {
        Consignment c = requireConsignment(cmd.consignmentId());
        c.cancel(cmd.reason());
        consignmentRepo.save(c);
        publishEvent("ConsignmentCancelledEvent", "Consignment", c.getId(),
                Map.of("consignmentId", c.getId(), "consignmentCode", c.getConsignmentCode(),
                       "reason", cmd.reason()));
        log.info("Consignment cancelled: id={}", cmd.consignmentId());
    }

    // ---- Quarantine Lot Commands ----

    @Transactional
    public QuarantineLot createLot(CreateQuarantineLotCommand cmd) {
        requireConsignment(cmd.consignmentId());
        String code = lotCodeGen.next();
        QuarantineLot lot = QuarantineLot.create(code, cmd.consignmentId(), cmd.startDate(),
                cmd.requiredDays(), cmd.supervisingVetId(), cmd.testRequirements());
        lotRepo.save(lot);
        log.info("Quarantine lot created: code={} for consignment id={}", code, cmd.consignmentId());
        return lot;
    }

    @Transactional
    public void passLot(PassQuarantineLotCommand cmd) {
        QuarantineLot lot = requireLot(cmd.lotId());
        lot.pass(cmd.endDate());
        lotRepo.save(lot);
        log.info("Quarantine lot passed: id={}", cmd.lotId());
    }

    @Transactional
    public void failLot(FailQuarantineLotCommand cmd) {
        QuarantineLot lot = requireLot(cmd.lotId());
        lot.fail(cmd.endDate());
        lot.appendNotes(cmd.reason());
        lotRepo.save(lot);
        log.info("Quarantine lot failed: id={}", cmd.lotId());
    }

    // ---- Export Clearance Commands ----

    @Transactional
    public ExportClearance issueExportClearance(IssueExportClearanceCommand cmd) {
        requireConsignment(cmd.consignmentId());
        String code = clearanceCodeGen.next();
        ExportClearance ec = ExportClearance.issue(code, cmd.consignmentId(), cmd.animalId(),
                cmd.clearanceDate(), cmd.validUntil(), cmd.issuedBy());
        clearanceRepo.save(ec);
        log.info("Export clearance issued: code={} for consignment id={}", code, cmd.consignmentId());
        return ec;
    }

    @Transactional
    public void revokeClearance(UUID clearanceId, UUID revokedBy) {
        ExportClearance ec = clearanceRepo.findById(clearanceId)
                .orElseThrow(() -> new DomainNotFoundException("Export clearance not found: " + clearanceId));
        ec.revoke(revokedBy);
        clearanceRepo.save(ec);
        log.info("Export clearance revoked: id={}", clearanceId);
    }

    // ---- Queries ----

    @Transactional(readOnly = true)
    public Consignment getConsignment(GetConsignmentQuery query) {
        return requireConsignment(query.id());
    }

    @Transactional(readOnly = true)
    public Consignment getConsignmentByCode(GetConsignmentByCodeQuery query) {
        return consignmentRepo.findByConsignmentCode(query.code())
                .orElseThrow(() -> new DomainNotFoundException("Consignment not found: " + query.code()));
    }

    @Transactional(readOnly = true)
    public Page<Consignment> listConsignments(ListConsignmentsQuery query) {
        return consignmentRepo.search(query.status(), query.exporterOwnerId(),
                query.destinationCountry(), query.pageable());
    }

    @Transactional(readOnly = true)
    public List<ConsignmentAnimal> listAnimals(UUID consignmentId) {
        return animalRepo.findByConsignmentId(consignmentId);
    }

    @Transactional(readOnly = true)
    public List<QuarantineLot> listLots(UUID consignmentId) {
        return lotRepo.findByConsignmentId(consignmentId);
    }

    @Transactional(readOnly = true)
    public QuarantineLot getLot(UUID lotId) {
        return requireLot(lotId);
    }

    @Transactional(readOnly = true)
    public ExportClearance getClearance(UUID clearanceId) {
        return clearanceRepo.findById(clearanceId)
                .orElseThrow(() -> new DomainNotFoundException("Export clearance not found: " + clearanceId));
    }

    @Transactional(readOnly = true)
    public List<ExportClearance> listClearancesByConsignment(UUID consignmentId) {
        return clearanceRepo.findByConsignmentId(consignmentId);
    }

    // ---- Helpers ----

    private Consignment requireConsignment(UUID id) {
        return consignmentRepo.findById(id)
                .orElseThrow(() -> new DomainNotFoundException("Consignment not found: " + id));
    }

    private QuarantineLot requireLot(UUID id) {
        return lotRepo.findById(id)
                .orElseThrow(() -> new DomainNotFoundException("Quarantine lot not found: " + id));
    }

    private void publishEvent(String type, String aggregate, UUID aggId, Map<String, Object> payload) {
        try {
            outbox.publish(type, aggregate, aggId, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.error("Failed to serialize outbox event {}: {}", type, e.getMessage());
        }
    }
}
