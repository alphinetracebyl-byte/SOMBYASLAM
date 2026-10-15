CREATE TABLE delegate_grant (
    id                  UUID        NOT NULL,
    grantor_user_id     UUID        NOT NULL,
    grantee_user_id     UUID        NOT NULL,
    owner_id            UUID        NOT NULL,
    scope               VARCHAR(50) NOT NULL,
    valid_from          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until         TIMESTAMPTZ NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    granted_by_user_id  UUID        NOT NULL,
    revoked_at          TIMESTAMPTZ,
    revoked_by_user_id  UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version             INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT pk_delegate_grant PRIMARY KEY (id),
    CONSTRAINT fk_dg_grantor FOREIGN KEY (grantor_user_id) REFERENCES user_account(id),
    CONSTRAINT fk_dg_grantee FOREIGN KEY (grantee_user_id) REFERENCES user_account(id)
);
