package com.somlits.animalregistry.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class PhotoUploadUrlRequest {
    @NotBlank
    private String photoType; // PRIMARY, SUPPLEMENTARY, AMENDMENT_EVIDENCE, DEATH_EVIDENCE

    @NotBlank
    @Pattern(regexp = "jpg|jpeg|png", flags = Pattern.Flag.CASE_INSENSITIVE)
    private String fileExtension;

    @NotBlank
    @Pattern(regexp = "image/jpeg|image/png")
    private String contentType;

    public String getPhotoType() { return photoType; }
    public void setPhotoType(String v) { this.photoType = v; }
    public String getFileExtension() { return fileExtension; }
    public void setFileExtension(String v) { this.fileExtension = v; }
    public String getContentType() { return contentType; }
    public void setContentType(String v) { this.contentType = v; }
}
