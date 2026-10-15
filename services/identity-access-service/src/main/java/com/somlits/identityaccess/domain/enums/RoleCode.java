package com.somlits.identityaccess.domain.enums;

public enum RoleCode {
    NATIONAL_ADMIN,
    REGIONAL_ADMIN,
    DISTRICT_ADMIN,
    LIVESTOCK_OWNER,
    OWNER_ADMIN,
    OWNER_EMPLOYEE,
    VET_OFFICER,
    FIELD_SUPERVISOR,
    TAG_PREP_OFFICER,
    MARKET_OPERATOR,
    QUARANTINE_OFFICER,
    ABATTOIR_OFFICER,
    LAB_OFFICER,
    EXPORT_OFFICER,
    AUDITOR,
    READ_ONLY;

    public boolean isAdminRole() {
        return this == NATIONAL_ADMIN || this == REGIONAL_ADMIN || this == DISTRICT_ADMIN;
    }

    public boolean isOwnerRole() {
        return this == LIVESTOCK_OWNER || this == OWNER_ADMIN || this == OWNER_EMPLOYEE;
    }

    public boolean isFieldRole() {
        return this == VET_OFFICER || this == FIELD_SUPERVISOR || this == TAG_PREP_OFFICER;
    }
}
