CREATE TABLE user_role_assignment (
    id                  UUID         NOT NULL,
    user_id             UUID         NOT NULL,
    role_code           VARCHAR(50)  NOT NULL,
    territory_type      VARCHAR(20)  NOT NULL,
    region_code         VARCHAR(10),
    district_code       VARCHAR(10),
    premises_id         UUID,
    owner_id            UUID,
    assigned_by_user_id UUID         NOT NULL,
    valid_from          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    valid_until         TIMESTAMPTZ,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    removed_at          TIMESTAMPTZ,
    removed_by_user_id  UUID,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_user_role_assignment PRIMARY KEY (id),
    CONSTRAINT fk_ura_user FOREIGN KEY (user_id) REFERENCES user_account(id)
);
