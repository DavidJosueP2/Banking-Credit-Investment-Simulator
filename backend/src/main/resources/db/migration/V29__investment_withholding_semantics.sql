ALTER TABLE investment_product_tax_rules
    ADD COLUMN exempt_from_term_days INTEGER;

ALTER TABLE investment_product_tax_rules
    ADD CONSTRAINT ck_investment_tax_exemption_days
        CHECK (exempt_from_term_days IS NULL OR exempt_from_term_days >= 180);

UPDATE investment_product_tax_rules
SET name = CASE WHEN name = 'Nueva regla' THEN 'Retención de Impuesto a la Renta' ELSE name END,
    rule_type = 'PERCENTAGE',
    value = CASE WHEN value = 0 THEN 3 ELSE LEAST(value, 10) END,
    base = 'GROSS_INTEREST',
    exempt_from_term_days = 180;

