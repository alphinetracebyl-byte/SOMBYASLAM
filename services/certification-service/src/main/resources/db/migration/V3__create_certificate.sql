CREATE SEQUENCE movement_permit_seq      START 1;
CREATE SEQUENCE animal_health_cert_seq   START 1;
CREATE SEQUENCE vaccination_cert_seq     START 1;
CREATE SEQUENCE quarantine_clearance_seq START 1;
CREATE SEQUENCE export_health_cert_seq   START 1;
CREATE SEQUENCE slaughter_fitness_seq    START 1;
CREATE SEQUENCE ownership_cert_seq       START 1;

CREATE TABLE certificate (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_number      VARCHAR(30)  NOT NULL UNIQUE,
    certificate_type        VARCHAR(40)  NOT NULL,
    status                  VARCHAR(20)  NOT NULL DEFAULT 'ISSUED',
    template_id             UUID         REFERENCES certificate_template(id),
    subject_animal_id       UUID,
    subject_animal_code     VARCHAR(30),
    subject_consignment_id  UUID,
    subject_movement_id     UUID,
    issued_by               UUID         NOT NULL,
    issued_by_name          VARCHAR(200) NOT NULL,
    issued_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    valid_from              DATE         NOT NULL,
    valid_until             DATE,
    qr_code                 VARCHAR(50)  NOT NULL UNIQUE,
    template_data           TEXT,
    digital_signature_hash  VARCHAR(200),
    revoked_by              UUID,
    revoked_at              TIMESTAMPTZ,
    revocation_reason       TEXT,
    replaced_by_cert_number VARCHAR(30),
    version                 BIGINT       NOT NULL DEFAULT 0,
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cert_animal      ON certificate(subject_animal_id);
CREATE INDEX idx_cert_consignment ON certificate(subject_consignment_id);
CREATE INDEX idx_cert_status      ON certificate(status);
CREATE INDEX idx_cert_qr          ON certificate(qr_code);
