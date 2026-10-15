CREATE SEQUENCE consignment_code_seq START 1;

CREATE TABLE consignment (
    id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    consignment_code         VARCHAR(20)  NOT NULL UNIQUE,
    status                   VARCHAR(40)  NOT NULL DEFAULT 'DRAFT',
    exporter_owner_id        UUID         NOT NULL,
    exporter_owner_code      VARCHAR(20)  NOT NULL,
    destination_country      VARCHAR(100) NOT NULL,
    quarantine_premises_id   UUID,
    quarantine_premises_code VARCHAR(20),
    proposed_export_date     DATE,
    exit_point_premises_id   UUID,
    exit_point_code          VARCHAR(20),
    total_animals            INT          NOT NULL DEFAULT 0,
    animals_cleared          INT          NOT NULL DEFAULT 0,
    created_by               UUID         NOT NULL,
    submitted_at             TIMESTAMPTZ,
    quarantine_started_at    TIMESTAMPTZ,
    exported_at              TIMESTAMPTZ,
    cancellation_reason      TEXT,
    version                  BIGINT       NOT NULL DEFAULT 0,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consignment_exporter ON consignment(exporter_owner_id);
CREATE INDEX idx_consignment_status   ON consignment(status);
