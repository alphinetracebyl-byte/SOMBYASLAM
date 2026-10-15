package com.somlits.animalregistry.application;

import com.somlits.animalregistry.api.v1.dto.request.PhotoConfirmRequest;
import com.somlits.animalregistry.api.v1.dto.request.PhotoUploadUrlRequest;
import com.somlits.animalregistry.api.v1.dto.response.PhotoUploadUrlResponse;
import com.somlits.animalregistry.domain.enums.PhotoStatus;
import com.somlits.animalregistry.domain.enums.PhotoType;
import com.somlits.animalregistry.domain.exception.BusinessRuleViolationException;
import com.somlits.animalregistry.domain.exception.DomainNotFoundException;
import com.somlits.animalregistry.domain.model.AnimalPhoto;
import com.somlits.animalregistry.domain.model.AnimalRecord;
import com.somlits.animalregistry.domain.repository.AnimalPhotoRepository;
import com.somlits.animalregistry.domain.repository.AnimalRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class PhotoService {

    private static final Logger log = LoggerFactory.getLogger(PhotoService.class);
    private static final long MAX_SIZE_BYTES = 10_485_760L;

    private final AnimalPhotoRepository photoRepo;
    private final AnimalRecordRepository animalRepo;
    private final OutboxService outbox;

    @Value("${somlits.photo.storage.base-url}")
    private String baseUrl;

    @Value("${somlits.photo.storage.container:animal-photos}")
    private String container;

    @Value("${somlits.photo.storage.sas-ttl-minutes:15}")
    private int sasTtlMinutes;

    public PhotoService(AnimalPhotoRepository photoRepo, AnimalRecordRepository animalRepo, OutboxService outbox) {
        this.photoRepo = photoRepo;
        this.animalRepo = animalRepo;
        this.outbox = outbox;
    }

    @Transactional
    public PhotoUploadUrlResponse requestUploadUrl(UUID animalId, PhotoUploadUrlRequest req, UUID uploadedBy) {
        AnimalRecord animal = animalRepo.findById(animalId)
                .orElseThrow(() -> new DomainNotFoundException("Animal not found: " + animalId));

        if (animal.isTerminal()) {
            throw new BusinessRuleViolationException("ERR-AR-008",
                    "Cannot upload photo for animal in status " + animal.getStatus());
        }

        PhotoType photoType = PhotoType.valueOf(req.getPhotoType().toUpperCase());

        UUID photoId = UUID.randomUUID();
        String blobPath = container + "/" + animalId + "/" + photoId + "." + req.getFileExtension().toLowerCase();
        String uploadUrl = baseUrl + "/" + blobPath + "?token=" + UUID.randomUUID() + "&expires=" + sasTtlMinutes;
        Instant expiresAt = Instant.now().plus(sasTtlMinutes, ChronoUnit.MINUTES);

        AnimalPhoto photo = AnimalPhoto.pending(animalId, photoType, blobPath,
                baseUrl + "/" + blobPath, req.getContentType(), uploadedBy);
        // Override id to use our generated one
        photoRepo.save(photo);

        log.info("Upload URL issued: animal={} photoType={}", animal.getAnimalCode(), photoType);
        return new PhotoUploadUrlResponse(photo.getId(), uploadUrl, expiresAt, MAX_SIZE_BYTES);
    }

    @Transactional
    public AnimalPhoto confirmUpload(UUID animalId, UUID photoId, PhotoConfirmRequest req, UUID callerUserId) {
        AnimalPhoto photo = photoRepo.findById(photoId)
                .orElseThrow(() -> new DomainNotFoundException("Photo not found: " + photoId));

        if (!photo.getAnimalId().equals(animalId)) {
            throw new DomainNotFoundException("Photo " + photoId + " does not belong to animal " + animalId);
        }

        if (photo.getStatus() != PhotoStatus.PENDING_UPLOAD) {
            throw new BusinessRuleViolationException("ERR-AR-013",
                    "Photo is not in PENDING_UPLOAD status (current: " + photo.getStatus() + ")");
        }

        if (req.getFileSizeBytes() > MAX_SIZE_BYTES) {
            throw new BusinessRuleViolationException("ERR-AR-013",
                    "File size " + req.getFileSizeBytes() + " exceeds maximum of " + MAX_SIZE_BYTES + " bytes");
        }

        if (req.getCaption() != null) {
            photo.setCaption(req.getCaption());
        }

        // If PRIMARY, supersede previous primary
        if (photo.getPhotoType() == PhotoType.PRIMARY) {
            photoRepo.findByAnimalIdAndPhotoTypeAndStatus(animalId, PhotoType.PRIMARY, PhotoStatus.ACTIVE)
                    .ifPresent(prev -> {
                        prev.supersede();
                        photoRepo.save(prev);
                    });

            // Update animal's primary photo reference
            AnimalRecord animal = animalRepo.findById(animalId)
                    .orElseThrow(() -> new DomainNotFoundException("Animal not found: " + animalId));
            animal.setPrimaryPhoto(photoId);
            animalRepo.save(animal);
        }

        photo.confirm(req.getFileSizeBytes(), req.getTakenAt());
        photoRepo.save(photo);

        try {
            outbox.publish("AnimalPhotoAddedEvent", "AnimalRecord", animalId,
                    String.format("{\"animalId\":\"%s\",\"photoId\":\"%s\",\"photoType\":\"%s\"}",
                            animalId, photoId, photo.getPhotoType()));
        } catch (Exception e) {
            log.error("Failed to publish photo event: {}", e.getMessage());
        }

        log.info("Photo confirmed: animal={} photoId={}", animalId, photoId);
        return photo;
    }

    @Transactional(readOnly = true)
    public List<AnimalPhoto> listPhotos(UUID animalId) {
        return photoRepo.findByAnimalIdOrderByUploadedAtDesc(animalId);
    }

    @Transactional(readOnly = true)
    public AnimalPhoto getPhoto(UUID animalId, UUID photoId) {
        AnimalPhoto photo = photoRepo.findById(photoId)
                .orElseThrow(() -> new DomainNotFoundException("Photo not found: " + photoId));
        if (!photo.getAnimalId().equals(animalId)) {
            throw new DomainNotFoundException("Photo " + photoId + " does not belong to animal " + animalId);
        }
        return photo;
    }
}
