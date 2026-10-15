package com.somlits.taginventory.application.command;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.somlits.taginventory.application.CodeGenerator;
import com.somlits.taginventory.application.OutboxService;
import com.somlits.taginventory.domain.entity.TagBag;
import com.somlits.taginventory.domain.entity.TagBatch;
import com.somlits.taginventory.domain.entity.TagCustodyEvent;
import com.somlits.taginventory.domain.entity.TagRecord;
import com.somlits.taginventory.domain.enums.CustodyLevel;
import com.somlits.taginventory.domain.exception.DomainConflictException;
import com.somlits.taginventory.domain.repository.TagBagRepository;
import com.somlits.taginventory.domain.repository.TagBatchRepository;
import com.somlits.taginventory.domain.repository.TagCustodyEventRepository;
import com.somlits.taginventory.domain.repository.TagRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ReceiveBatchCommandHandler {

    private static final Logger log = LoggerFactory.getLogger(ReceiveBatchCommandHandler.class);
    private static final int TAGS_PER_BAG = 25;

    private final TagBatchRepository batchRepo;
    private final TagBagRepository bagRepo;
    private final TagRecordRepository tagRepo;
    private final TagCustodyEventRepository custodyEventRepo;
    private final CodeGenerator codeGen;
    private final OutboxService outbox;
    private final ObjectMapper objectMapper;

    public ReceiveBatchCommandHandler(TagBatchRepository batchRepo,
                                      TagBagRepository bagRepo,
                                      TagRecordRepository tagRepo,
                                      TagCustodyEventRepository custodyEventRepo,
                                      CodeGenerator codeGen,
                                      OutboxService outbox,
                                      ObjectMapper objectMapper) {
        this.batchRepo = batchRepo;
        this.bagRepo = bagRepo;
        this.tagRepo = tagRepo;
        this.custodyEventRepo = custodyEventRepo;
        this.codeGen = codeGen;
        this.outbox = outbox;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public TagBatch handle(ReceiveBatchCommand cmd) {
        // Duplicate batch code detection
        if (cmd.getBatchCode() != null && batchRepo.existsByBatchCode(cmd.getBatchCode())) {
            throw new DomainConflictException("ERR-TI-001",
                    "Batch code already exists: " + cmd.getBatchCode());
        }

        // Generate batch code if not provided
        String batchCode = cmd.getBatchCode() != null ? cmd.getBatchCode() : codeGen.nextBatchCode();

        TagBatch batch = TagBatch.create(
                batchCode,
                cmd.getManufacturerName(),
                cmd.getManufacturerCountry(),
                cmd.getTotalBags(),
                TAGS_PER_BAG,
                cmd.getBatchReceivedAt() != null ? cmd.getBatchReceivedAt() : Instant.now(),
                cmd.getReceivedBy(),
                cmd.getNotes()
        );
        batchRepo.save(batch);

        // Ministry custodian is the receiver
        CustodyLevel custodyLevel = CustodyLevel.MINISTRY;
        UUID custodianId = cmd.getReceivedBy();
        String custodianCode = "MINISTRY";

        List<TagBag> bags = new ArrayList<>();
        List<TagRecord> tags = new ArrayList<>();

        // Generate bags and tags
        for (int i = 1; i <= cmd.getTotalBags(); i++) {
            String bagCode = codeGen.nextBagCode(batchCode, i);

            // Compute first and last serial for this bag
            String firstSerial = computeSerial(cmd.getFirstSerialOfFirstBag(), (i - 1) * TAGS_PER_BAG);
            String lastSerial = computeSerial(cmd.getFirstSerialOfFirstBag(), i * TAGS_PER_BAG - 1);

            // Validate no serial already exists
            if (tagRepo.existsBySerialNumber(firstSerial)) {
                throw new DomainConflictException("ERR-TI-002",
                        "Tag serial already exists: " + firstSerial);
            }

            TagBag bag = TagBag.create(bagCode, batch.getId(), firstSerial, lastSerial,
                    custodyLevel, custodianId, custodianCode);
            bags.add(bag);

            // Create 25 tag records for this bag
            for (int j = 0; j < TAGS_PER_BAG; j++) {
                String serial = computeSerial(cmd.getFirstSerialOfFirstBag(), (i - 1) * TAGS_PER_BAG + j);
                tags.add(TagRecord.create(serial, bag.getId(), batch.getId(), custodyLevel, custodianId));
            }

            // Record custody event for bag
            custodyEventRepo.save(TagCustodyEvent.of(
                    bagCode, "RECEIVED",
                    null, null,
                    custodianId, custodyLevel,
                    cmd.getReceivedBy(), "Batch received from manufacturer"
            ));
        }

        bagRepo.saveAll(bags);
        tagRepo.saveAll(tags);

        publishEvent("TagBatchReceivedEvent", batch.getId(), Map.of(
                "batchId", batch.getId(),
                "batchCode", batchCode,
                "totalBags", cmd.getTotalBags(),
                "totalTags", cmd.getTotalBags() * TAGS_PER_BAG,
                "receivedBy", cmd.getReceivedBy()
        ));

        log.info("Tag batch received: code={} bags={} tags={}",
                batchCode, cmd.getTotalBags(), cmd.getTotalBags() * TAGS_PER_BAG);
        return batch;
    }

    /**
     * Compute serial by incrementing from a base serial by offset.
     * Supports numeric serials. Format: prefix + zero-padded-number
     */
    private String computeSerial(String baseSerial, int offset) {
        if (baseSerial == null) {
            throw new IllegalArgumentException("firstSerialOfFirstBag is required");
        }
        // Extract numeric suffix and prefix
        int numStart = 0;
        for (int i = baseSerial.length() - 1; i >= 0; i--) {
            if (!Character.isDigit(baseSerial.charAt(i))) {
                numStart = i + 1;
                break;
            }
        }
        String prefix = baseSerial.substring(0, numStart);
        String numPart = baseSerial.substring(numStart);
        long baseNum = Long.parseLong(numPart);
        String newNum = String.format("%0" + numPart.length() + "d", baseNum + offset);
        return prefix + newNum;
    }

    private void publishEvent(String type, UUID aggId, Map<String, Object> payload) {
        try {
            outbox.publish(type, "TagBatch", aggId, objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.error("Failed to serialize outbox event {}: {}", type, e.getMessage());
        }
    }
}
