ALTER TABLE investment_products
    ADD COLUMN term_unit VARCHAR(12) NOT NULL DEFAULT 'DAYS',
    ADD COLUMN term_selection VARCHAR(16) NOT NULL DEFAULT 'PREDEFINED',
    ADD COLUMN minimum_term_value INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN maximum_term_value INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN term_increment INTEGER NOT NULL DEFAULT 1;

ALTER TABLE investment_products
    ADD CONSTRAINT ck_investment_product_term_unit
        CHECK (term_unit IN ('DAYS', 'MONTHS', 'YEARS')),
    ADD CONSTRAINT ck_investment_product_term_selection
        CHECK (term_selection IN ('PREDEFINED', 'RANGE')),
    ADD CONSTRAINT ck_investment_product_term_values
        CHECK (minimum_term_value > 0 AND maximum_term_value >= minimum_term_value
            AND term_increment > 0);

UPDATE investment_products
SET minimum_term_value = minimum_term_days,
    maximum_term_value = maximum_term_days,
    term_increment = 1
WHERE term_unit = 'DAYS';

CREATE TABLE investment_product_tax_rules (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES investment_products(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    rule_type VARCHAR(12) NOT NULL,
    value NUMERIC(14, 7) NOT NULL,
    base VARCHAR(20) NOT NULL DEFAULT 'GROSS_INTEREST',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    position INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT ck_investment_tax_type CHECK (rule_type IN ('PERCENTAGE', 'FIXED')),
    CONSTRAINT ck_investment_tax_value CHECK (value >= 0),
    CONSTRAINT ck_investment_tax_base CHECK (base IN ('GROSS_INTEREST', 'CAPITAL', 'TOTAL'))
);

CREATE INDEX idx_investment_tax_product
    ON investment_product_tax_rules(product_id, position);
