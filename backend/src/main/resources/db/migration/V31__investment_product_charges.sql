-- Costos adicionales de un plan de inversión (seguros, comisiones, donaciones), separados de la retención
-- de Impuesto a la Renta: los define la institución, pueden ser varios y el cliente puede elegir los opcionales.
CREATE TABLE investment_product_charges (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES investment_products(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    charge_type VARCHAR(12) NOT NULL,
    value NUMERIC(14, 4) NOT NULL,
    base VARCHAR(20),
    frequency VARCHAR(12) NOT NULL DEFAULT 'ONCE',
    mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    position INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT ck_investment_charge_type CHECK (charge_type IN ('FIXED', 'PERCENTAGE')),
    CONSTRAINT ck_investment_charge_value CHECK (value > 0 AND (charge_type = 'FIXED' OR value <= 100)),
    CONSTRAINT ck_investment_charge_base CHECK (
        (charge_type = 'FIXED' AND base IS NULL)
        OR (charge_type = 'PERCENTAGE' AND base IN ('CAPITAL', 'GROSS_INTEREST'))),
    CONSTRAINT ck_investment_charge_frequency CHECK (frequency IN ('ONCE', 'PER_PAYMENT'))
);

CREATE INDEX idx_investment_charges_product ON investment_product_charges(product_id);
