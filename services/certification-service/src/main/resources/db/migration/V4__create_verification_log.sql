CREATE TABLE verification_log (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id      UUID        REFERENCES certificate(id),
    qr_code             VARCHAR(50) NOT NULL,
    verified_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verifier_ip         VARCHAR(45),
    verification_result VARCHAR(20) NOT NULL
);

CREATE INDEX idx_verif_cert ON verification_log(certificate_id);
