CREATE SEQUENCE sale_record_code_seq START 1 INCREMENT 1;

CREATE TABLE sale_record (
    id UUID PRIMARY KEY,
    sale_code VARCHAR(25) NOT NULL UNIQUE,
    session_id UUID NOT NULL REFERENCES market_session(id),
    market_entry_id UUID NOT NULL REFERENCES market_entry(id),
    animal_id UUID NOT NULL,
    animal_code VARCHAR(25) NOT NULL,
    seller_owner_id UUID NOT NULL,
    seller_owner_code VARCHAR(30) NOT NULL,
    buyer_owner_id UUID NOT NULL,
    buyer_owner_code VARCHAR(30) NOT NULL,
    sale_price NUMERIC(15,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    payment_reference VARCHAR(100),
    sale_confirmed_at TIMESTAMPTZ NOT NULL,
    sale_confirmed_by UUID NOT NULL,
    ownership_transfer_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    ownership_transferred_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_sale_session ON sale_record (session_id);
CREATE INDEX idx_sale_animal ON sale_record (animal_id);
CREATE INDEX idx_sale_buyer ON sale_record (buyer_owner_id);
