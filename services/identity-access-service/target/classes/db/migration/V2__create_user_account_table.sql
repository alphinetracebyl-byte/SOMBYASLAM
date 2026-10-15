CREATE TABLE user_account (
    id                      UUID         NOT NULL,
    keycloak_subject_id     VARCHAR(255) UNIQUE,
    phone_number_encrypted  BYTEA,
    phone_last4             VARCHAR(4),
    full_name               VARCHAR(200),
    email                   VARCHAR(254),
    account_status          VARCHAR(30)  NOT NULL DEFAULT 'PENDING_ACTIVATION',
    invited_by_user_id      UUID,
    invitation_id           UUID,
    failed_login_count      INTEGER      NOT NULL DEFAULT 0,
    locked_at               TIMESTAMPTZ,
    lock_expires_at         TIMESTAMPTZ,
    last_login_at           TIMESTAMPTZ,
    owner_id                UUID,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version                 INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT pk_user_account PRIMARY KEY (id),
    CONSTRAINT uq_user_account_keycloak_subject UNIQUE (keycloak_subject_id)
);

CREATE TABLE otp_verification (
    id              UUID        NOT NULL,
    user_id         UUID        NOT NULL,
    otp_code_hash   VARCHAR(64) NOT NULL,
    otp_type        VARCHAR(30) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_otp_verification PRIMARY KEY (id),
    CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES user_account(id)
);
