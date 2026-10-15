CREATE SEQUENCE audit_event_code_seq START 1;

CREATE TABLE audit_event (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  event_code     VARCHAR(30)   NOT NULL UNIQUE,
  correlation_id UUID,
  service_source VARCHAR(50)   NOT NULL,
  event_type     VARCHAR(100)  NOT NULL,
  aggregate_type VARCHAR(50)   NOT NULL,
  aggregate_id   UUID          NOT NULL,
  aggregate_code VARCHAR(50),
  performed_by   UUID,
  performed_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  payload        JSONB         NOT NULL,
  ip_address     VARCHAR(45),
  user_agent     VARCHAR(200)
);

CREATE INDEX idx_audit_aggregate    ON audit_event(aggregate_id);
CREATE INDEX idx_audit_performed_at ON audit_event(performed_at DESC);
CREATE INDEX idx_audit_event_type   ON audit_event(event_type);
CREATE INDEX idx_audit_performed_by ON audit_event(performed_by);
CREATE INDEX idx_audit_correlation  ON audit_event(correlation_id);
CREATE INDEX idx_audit_service      ON audit_event(service_source);
