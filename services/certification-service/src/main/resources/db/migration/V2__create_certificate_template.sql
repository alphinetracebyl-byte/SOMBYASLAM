CREATE SEQUENCE cert_template_code_seq START 1;

CREATE TABLE certificate_template (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code    VARCHAR(20)  NOT NULL UNIQUE,
    certificate_type VARCHAR(40)  NOT NULL,
    template_name    VARCHAR(200) NOT NULL,
    template_version VARCHAR(20)  NOT NULL,
    body_template    TEXT         NOT NULL,
    required_fields  TEXT,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by       UUID         NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deactivated_at   TIMESTAMPTZ
);

CREATE INDEX idx_cert_tmpl_type ON certificate_template(certificate_type);
