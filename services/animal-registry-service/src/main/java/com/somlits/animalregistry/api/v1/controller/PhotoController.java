package com.somlits.animalregistry.api.v1.controller;

import com.somlits.animalregistry.api.v1.dto.request.PhotoConfirmRequest;
import com.somlits.animalregistry.api.v1.dto.request.PhotoUploadUrlRequest;
import com.somlits.animalregistry.api.v1.dto.response.PhotoResponse;
import com.somlits.animalregistry.api.v1.dto.response.PhotoUploadUrlResponse;
import com.somlits.animalregistry.application.PhotoService;
import com.somlits.animalregistry.domain.model.AnimalPhoto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/internal/v1/animals/{animalId}/photos")
public class PhotoController {

    private final PhotoService photoService;

    public PhotoController(PhotoService photoService) {
        this.photoService = photoService;
    }

    @PostMapping("/upload-url")
    public ResponseEntity<PhotoUploadUrlResponse> requestUploadUrl(
            @PathVariable UUID animalId,
            @Valid @RequestBody PhotoUploadUrlRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        PhotoUploadUrlResponse response = photoService.requestUploadUrl(animalId, req, callerId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{photoId}/confirm")
    public ResponseEntity<PhotoResponse> confirmUpload(
            @PathVariable UUID animalId,
            @PathVariable UUID photoId,
            @Valid @RequestBody PhotoConfirmRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        AnimalPhoto photo = photoService.confirmUpload(animalId, photoId, req, callerId);
        return ResponseEntity.ok(PhotoResponse.from(photo));
    }

    @GetMapping
    public ResponseEntity<List<PhotoResponse>> listPhotos(@PathVariable UUID animalId) {
        List<PhotoResponse> photos = photoService.listPhotos(animalId).stream()
                .map(PhotoResponse::from)
                .toList();
        return ResponseEntity.ok(photos);
    }

    @GetMapping("/{photoId}")
    public ResponseEntity<PhotoResponse> getPhoto(
            @PathVariable UUID animalId,
            @PathVariable UUID photoId) {
        AnimalPhoto photo = photoService.getPhoto(animalId, photoId);
        return ResponseEntity.ok(PhotoResponse.from(photo));
    }
}
