ALTER TABLE investment_products
    ADD COLUMN calculation_method VARCHAR(24) NOT NULL DEFAULT 'SIMPLE',
    ADD COLUMN rate_type VARCHAR(24) NOT NULL DEFAULT 'NOMINAL_ANNUAL',
    ADD COLUMN capitalization_frequency VARCHAR(24);

CREATE TABLE investment_product_terms (
    product_id BIGINT NOT NULL REFERENCES investment_products(id) ON DELETE CASCADE,
    term_days INTEGER NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, term_days),
    CONSTRAINT ck_investment_product_term_days CHECK (term_days > 0)
);

ALTER TABLE investment_products
    ADD CONSTRAINT ck_investment_product_calculation
        CHECK (calculation_method IN ('SIMPLE', 'COMPOUND')),
    ADD CONSTRAINT ck_investment_product_rate_type
        CHECK (rate_type IN ('NOMINAL_ANNUAL', 'EFFECTIVE_ANNUAL')),
    ADD CONSTRAINT ck_investment_product_capitalization
        CHECK (capitalization_frequency IS NULL OR capitalization_frequency IN (
            'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL'
        ));

CREATE TABLE investment_product_payout_frequencies (
    product_id BIGINT NOT NULL REFERENCES investment_products(id) ON DELETE CASCADE,
    frequency VARCHAR(24) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, frequency),
    CONSTRAINT ck_investment_product_payout_frequency CHECK (
        frequency IN ('AT_MATURITY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL')
    )
);

INSERT INTO investment_product_payout_frequencies (product_id, frequency, position)
SELECT id, payout_frequency, 0
FROM investment_products;

INSERT INTO investment_product_terms (product_id, term_days, position)
SELECT id, minimum_term_days, 0 FROM investment_products
UNION
SELECT id, maximum_term_days, 1 FROM investment_products;

-- El producto inicial representa el depósito a plazo fijo analizado en clase.
-- Se habilitan alternativas que el cliente puede escoger sin cambiar el método simple.
INSERT INTO investment_product_payout_frequencies (product_id, frequency, position)
SELECT id, 'MONTHLY', 1
FROM investment_products
WHERE name = 'Depósito a plazo fijo'
ON CONFLICT DO NOTHING;

INSERT INTO investment_product_payout_frequencies (product_id, frequency, position)
SELECT id, 'QUARTERLY', 2
FROM investment_products
WHERE name = 'Depósito a plazo fijo'
ON CONFLICT DO NOTHING;

UPDATE investment_products
SET day_count_basis = 360
WHERE name = 'Depósito a plazo fijo'
  AND day_count_basis = 365;

INSERT INTO investment_product_terms (product_id, term_days, position)
SELECT id, term_days, position
FROM (
    SELECT id, 31 AS term_days, 0 AS position FROM investment_products WHERE name = 'Depósito a plazo fijo'
    UNION ALL SELECT id, 60, 1 FROM investment_products WHERE name = 'Depósito a plazo fijo'
    UNION ALL SELECT id, 90, 2 FROM investment_products WHERE name = 'Depósito a plazo fijo'
    UNION ALL SELECT id, 180, 3 FROM investment_products WHERE name = 'Depósito a plazo fijo'
    UNION ALL SELECT id, 360, 4 FROM investment_products WHERE name = 'Depósito a plazo fijo'
) terms
ON CONFLICT DO NOTHING;

DELETE FROM investment_product_terms
WHERE product_id IN (SELECT id FROM investment_products WHERE name = 'Depósito a plazo fijo')
  AND term_days NOT IN (31, 60, 90, 180, 360);

UPDATE investment_product_rates rate
SET minimum_term_days = seed.term_days,
    maximum_term_days = seed.term_days,
    label = 'Plazo de ' || seed.term_days || ' días',
    position = seed.position
FROM (
    SELECT product_id, 31 AS term_days, 0 AS position, 0.03700000::numeric AS annual_rate
    FROM investment_product_terms WHERE term_days = 31
    UNION ALL SELECT product_id, 60, 1, 0.03850000 FROM investment_product_terms WHERE term_days = 60
    UNION ALL SELECT product_id, 90, 2, 0.04000000 FROM investment_product_terms WHERE term_days = 90
    UNION ALL SELECT product_id, 180, 3, 0.04250000 FROM investment_product_terms WHERE term_days = 180
    UNION ALL SELECT product_id, 360, 4, 0.04500000 FROM investment_product_terms WHERE term_days = 360
) seed
WHERE rate.product_id = seed.product_id
  AND rate.position = seed.position;

UPDATE investment_product_rates rate
SET annual_rate = seed.annual_rate
FROM (
    SELECT product_id, 31 AS term_days, 0.03700000::numeric AS annual_rate
    FROM investment_product_terms WHERE term_days = 31
    UNION ALL SELECT product_id, 60, 0.03850000 FROM investment_product_terms WHERE term_days = 60
    UNION ALL SELECT product_id, 90, 0.04000000 FROM investment_product_terms WHERE term_days = 90
    UNION ALL SELECT product_id, 180, 0.04250000 FROM investment_product_terms WHERE term_days = 180
    UNION ALL SELECT product_id, 360, 0.04500000 FROM investment_product_terms WHERE term_days = 360
) seed
WHERE rate.product_id = seed.product_id
  AND rate.minimum_term_days = seed.term_days;

INSERT INTO investment_product_rates (
    product_id, label, minimum_amount, maximum_amount,
    minimum_term_days, maximum_term_days, annual_rate, position
)
SELECT id, 'Plazo de 180 días', minimum_amount, maximum_amount, 180, 180, 0.04250000, 3
FROM investment_products
WHERE name = 'Depósito a plazo fijo'
ON CONFLICT DO NOTHING;

INSERT INTO investment_product_rates (
    product_id, label, minimum_amount, maximum_amount,
    minimum_term_days, maximum_term_days, annual_rate, position
)
SELECT id, 'Plazo de 360 días', minimum_amount, maximum_amount, 360, 360, 0.04500000, 4
FROM investment_products
WHERE name = 'Depósito a plazo fijo'
ON CONFLICT DO NOTHING;

ALTER TABLE investment_products DROP CONSTRAINT ck_investment_product_payout;
ALTER TABLE investment_products DROP COLUMN payout_frequency;

CREATE INDEX idx_investment_payout_product
    ON investment_product_payout_frequencies(product_id, position);
