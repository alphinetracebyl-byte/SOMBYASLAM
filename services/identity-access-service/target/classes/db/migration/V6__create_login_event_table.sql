CREATE TABLE login_event (
    id              UUID        NOT NULL,
    user_id         UUID        NOT NULL,
    event_type      VARCHAR(30) NOT NULL,
    failure_reason  VARCHAR(100),
    ip_address      VARCHAR(45),
    device_type     VARCHAR(50),
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_login_event PRIMARY KEY (id),
    CONSTRAINT fk_login_event_user FOREIGN KEY (user_id) REFERENCES user_account(id)
);

-- Index for time-range audit queries (replaces table partitioning — revisit when row count exceeds 10M)
CREATE INDEX idx_login_event_occurred_at ON login_event (occurred_at DESC);
CREATE INDEX idx_login_event_user_id     ON login_event (user_id, occurred_at DESC);
