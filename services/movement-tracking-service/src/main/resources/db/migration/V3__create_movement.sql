CREATE SEQUENCE movement_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE permit_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE movement (
    id                      UUID            NOT NULL,
    movement_code           VARCHAR(30)     NOT NULL,
    idempotency_key         VARCHAR(80)     NOT NULL,
    status                  VARCHAR(40)     NOT NULL DEFAULT 'DRAFT',
    initiator_role          VARCHAR(40)     NOT NULL,
    initiator_id            UUID            NOT NULL,
    on_behalf_of_owner_id   UUID,
    origin_premises_id      UUID            NOT NULL,
    origin_premises_type    VARCHAR(40)     NOT NULL,
    destination_premises_id UUID,
    destination_type        VARCHAR(40)     NOT NULL,
    destination_name        VARCHAR(200)    NOT NULL,
    destination_region      VARCHAR(60),
    destination_district    VARCHAR(100),
    destination_country     VARCHAR(60),
    movement_purpose        VARCHAR(40)     NOT NULL,
    movement_rule_id        UUID,
    animal_count            INTEGER         NOT NULL,
    vehicle_registration    VARCHAR(30),
    transporter_name        VARCHAR(150),
    transporter_licence     VARCHAR(50),
    planned_departure_at    TIMESTAMPTZ,
    planned_arrival_at      TIMESTAMPTZ,
    route_description       VARCHAR(500),
    is_emergency            BOOLEAN         NOT NULL DEFAULT FALSE,
    emergency_reason        VARCHAR(300),
    is_cross_border         BOOLEAN         NOT NULL DEFAULT FALSE,
    is_illegal_movement     BOOLEAN         NOT NULL DEFAULT FALSE,
    illegal_movement_notes  VARCHAR(500),
    vet_reviewer_id         UUID,
    vet_review_notes        VARCHAR(500),
    rejection_reason        VARCHAR(500),
    permit_number           VARCHAR(40),
    permit_issued_at        TIMESTAMPTZ,
    permit_valid_until      TIMESTAMPTZ,
    actual_departure_at     TIMESTAMPTZ,
    actual_arrival_at       TIMESTAMPTZ,
    arrived_count           INTEGER,
    missing_count           INTEGER,
    offline_departure       BOOLEAN         NOT NULL DEFAULT FALSE,
    offline_arrival         BOOLEAN         NOT NULL DEFAULT FALSE,
    completed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    version                 INTEGER         NOT NULL DEFAULT 0,

    CONSTRAINT pk_movement PRIMARY KEY (id),
    CONSTRAINT uq_movement_code UNIQUE (movement_code),
    CONSTRAINT uq_movement_idempotency_key UNIQUE (idempotency_key),
    CONSTRAINT uq_movement_permit_number UNIQUE (permit_number)
);

COMMENT ON TABLE movement IS 'Core movement record — one row per livestock movement permit lifecycle';
