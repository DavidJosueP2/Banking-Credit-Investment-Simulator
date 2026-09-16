CREATE TABLE investment_products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(600) NOT NULL DEFAULT '',
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    minimum_amount NUMERIC(14, 2) NOT NULL,
    maximum_amount NUMERIC(14, 2) NOT NULL,
    minimum_term_days INTEGER NOT NULL,
    maximum_term_days INTEGER NOT NULL,
    payout_frequency VARCHAR(24) NOT NULL,
    day_count_basis INTEGER NOT NULL DEFAULT 365,
    withholding_rate NUMERIC(8, 7) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT REFERENCES app_users(id),
    CONSTRAINT ck_investment_product_amounts CHECK (
        minimum_amount > 0 AND maximum_amount >= minimum_amount
    ),
    CONSTRAINT ck_investment_product_terms CHECK (
        minimum_term_days > 0 AND maximum_term_days >= minimum_term_days
    ),
    CONSTRAINT ck_investment_product_basis CHECK (day_count_basis IN (360, 365)),
    CONSTRAINT ck_investment_product_withholding CHECK (
        withholding_rate >= 0 AND withholding_rate <= 1
    ),
    CONSTRAINT ck_investment_product_payout CHECK (
        payout_frequency IN ('AT_MATURITY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL')
    )
);

CREATE TABLE investment_product_rates (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES investment_products(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    minimum_amount NUMERIC(14, 2) NOT NULL,
    maximum_amount NUMERIC(14, 2) NOT NULL,
    minimum_term_days INTEGER NOT NULL,
    maximum_term_days INTEGER NOT NULL,
    annual_rate NUMERIC(9, 8) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT ck_investment_rate_amounts CHECK (
        minimum_amount > 0 AND maximum_amount >= minimum_amount
    ),
    CONSTRAINT ck_investment_rate_terms CHECK (
        minimum_term_days > 0 AND maximum_term_days >= minimum_term_days
    ),
    CONSTRAINT ck_investment_rate_value CHECK (annual_rate > 0 AND annual_rate <= 1)
);

CREATE INDEX idx_investment_products_active ON investment_products(active);
CREATE INDEX idx_investment_rates_product ON investment_product_rates(product_id, position);

INSERT INTO investment_products (
    name, description, minimum_amount, maximum_amount, minimum_term_days,
    maximum_term_days, payout_frequency, day_count_basis, withholding_rate, active
) VALUES (
    'Depósito a plazo fijo',
    'Inversión referencial con capital colocado durante un plazo definido.',
    500.00, 500000.00, 31, 720, 'AT_MATURITY', 365, 0, TRUE
);

INSERT INTO investment_product_rates (
    product_id, label, minimum_amount, maximum_amount,
    minimum_term_days, maximum_term_days, annual_rate, position
)
SELECT id, 'Plazo de 31 a 180 días', 500.00, 500000.00, 31, 180, 0.04000000, 0
FROM investment_products WHERE name = 'Depósito a plazo fijo';

INSERT INTO investment_product_rates (
    product_id, label, minimum_amount, maximum_amount,
    minimum_term_days, maximum_term_days, annual_rate, position
)
SELECT id, 'Plazo de 181 a 360 días', 500.00, 500000.00, 181, 360, 0.04500000, 1
FROM investment_products WHERE name = 'Depósito a plazo fijo';

INSERT INTO investment_product_rates (
    product_id, label, minimum_amount, maximum_amount,
    minimum_term_days, maximum_term_days, annual_rate, position
)
SELECT id, 'Plazo de 361 a 720 días', 500.00, 500000.00, 361, 720, 0.04700000, 2
FROM investment_products WHERE name = 'Depósito a plazo fijo';
