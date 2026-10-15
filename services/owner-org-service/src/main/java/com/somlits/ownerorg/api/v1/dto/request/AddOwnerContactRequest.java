package com.somlits.ownerorg.api.v1.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AddOwnerContactRequest {

    @NotBlank(message = "contactName is required")
    @Size(max = 200)
    private String contactName;

    @NotBlank(message = "contactPhone is required")
    @Size(max = 30)
    private String contactPhone;

    @Size(max = 100)
    private String contactRole;

    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public String getContactRole() { return contactRole; }
    public void setContactRole(String contactRole) { this.contactRole = contactRole; }
}
