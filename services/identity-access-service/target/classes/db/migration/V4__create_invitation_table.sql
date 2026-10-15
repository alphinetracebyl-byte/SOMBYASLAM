CREATE TABLE invitation (
    id                       UUID         NOT NULL,
    invitation_code_hash     VARCHAR(255) NOT NULL,
    intended_role_code       VARCHAR(50)  NOT NULL,
    intended_territory_type  VARCHAR(20)  NOT NULL,
    intended_region_code     VARCHAR(10),
    intended_district_code   VARCHAR(10),
    intended_owner_id        UUID,
    intended_phone_last4     VARCHAR(4),
    created_by_user_id       UUID         NOT NULL,
    status                   VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    expires_at               TIMESTAMPTZ  NOT NULL,
    accepted_at              TIMESTAMPTZ,
    accepted_by_user_id      UUID,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_invitation PRIMARY KEY (id),
    CONSTRAINT fk_invitation_creator FOREIGN KEY (created_by_user_id) REFERENCES user_account(id)
);
