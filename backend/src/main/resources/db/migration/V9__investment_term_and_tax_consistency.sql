ALTER TABLE investment_products
    ADD COLUMN calendar_mode VARCHAR(16) NOT NULL DEFAULT 'FIXED_DAYS';

ALTER TABLE investment_products
    ADD CONSTRAINT ck_investment_product_calendar_mode
        CHECK (calendar_mode IN ('FIXED_DAYS', 'CALENDAR'));

ALTER TABLE investment_product_rates
    ADD COLUMN minimum_term_value INTEGER,
    ADD COLUMN maximum_term_value INTEGER;

UPDATE investment_product_rates rate
SET minimum_term_value = CASE product.term_unit
        WHEN 'MONTHS' THEN GREATEST(1, ROUND(rate.minimum_term_days / 30.0))
        WHEN 'YEARS' THEN GREATEST(1, ROUND(rate.minimum_term_days / 365.0))
        ELSE rate.minimum_term_days
    END,
    maximum_term_value = CASE product.term_unit
        WHEN 'MONTHS' THEN GREATEST(1, ROUND(rate.maximum_term_days / 30.0))
        WHEN 'YEARS' THEN GREATEST(1, ROUND(rate.maximum_term_days / 365.0))
        ELSE rate.maximum_term_days
    END
FROM investment_products product
WHERE rate.product_id = product.id;

ALTER TABLE investment_product_rates
    ALTER COLUMN minimum_term_value SET NOT NULL,
    ALTER COLUMN maximum_term_value SET NOT NULL,
    ADD CONSTRAINT ck_investment_rate_term_values CHECK (
        minimum_term_value > 0 AND maximum_term_value >= minimum_term_value
    );

INSERT INTO investment_product_tax_rules (
    product_id, name, rule_type, value, base, active, position
)
SELECT id, 'Retención configurada', 'PERCENTAGE', withholding_rate * 100,
       'GROSS_INTEREST', TRUE, 0
FROM investment_products
WHERE withholding_rate > 0
  AND NOT EXISTS (
      SELECT 1
      FROM investment_product_tax_rules rule
      WHERE rule.product_id = investment_products.id
        AND rule.name = 'Retención configurada'
  );

UPDATE investment_products
SET withholding_rate = 0
WHERE withholding_rate > 0;
