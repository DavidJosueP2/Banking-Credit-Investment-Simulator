CREATE TABLE investment_product_term_configs (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES investment_products(id) ON DELETE CASCADE,
    unit VARCHAR(12) NOT NULL,
    selection VARCHAR(16) NOT NULL,
    minimum_value INTEGER NOT NULL,
    maximum_value INTEGER NOT NULL,
    increment_value INTEGER NOT NULL DEFAULT 1,
    position INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_investment_term_config_unit UNIQUE (product_id, unit),
    CONSTRAINT ck_investment_term_config_unit CHECK (unit IN ('DAYS', 'MONTHS', 'YEARS')),
    CONSTRAINT ck_investment_term_config_selection CHECK (selection IN ('PREDEFINED', 'RANGE')),
    CONSTRAINT ck_investment_term_config_values CHECK (
        minimum_value > 0 AND maximum_value >= minimum_value AND increment_value > 0
    )
);

CREATE TABLE investment_product_term_options (
    config_id BIGINT NOT NULL REFERENCES investment_product_term_configs(id) ON DELETE CASCADE,
    value INTEGER NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (config_id, value),
    CONSTRAINT ck_investment_term_option_value CHECK (value > 0)
);

CREATE INDEX idx_investment_term_configs_product
    ON investment_product_term_configs(product_id, position);

INSERT INTO investment_product_term_configs (
    product_id, unit, selection, minimum_value, maximum_value, increment_value, position
)
SELECT id, term_unit, term_selection, minimum_term_value, maximum_term_value, term_increment, 0
FROM investment_products;

INSERT INTO investment_product_term_options (config_id, value, position)
SELECT config.id, term.term_value, term.position
FROM investment_product_term_configs config
JOIN investment_product_terms term ON term.product_id = config.product_id
WHERE config.selection = 'PREDEFINED';

-- Las tasas se comparan siempre contra una duración comercial normalizada en días.
UPDATE investment_product_rates rate
SET minimum_term_days = CASE product.term_unit
        WHEN 'MONTHS' THEN rate.minimum_term_value * 30
        WHEN 'YEARS' THEN rate.minimum_term_value * 360
        ELSE rate.minimum_term_value
    END,
    maximum_term_days = CASE product.term_unit
        WHEN 'MONTHS' THEN rate.maximum_term_value * 30
        WHEN 'YEARS' THEN rate.maximum_term_value * 360
        ELSE rate.maximum_term_value
    END
FROM investment_products product
WHERE rate.product_id = product.id;
