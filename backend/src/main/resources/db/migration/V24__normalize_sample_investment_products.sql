-- Los cuatro productos permanecen visibles, pero cada uno conserva un propósito
-- diferente y rangos continuos acordes con su horizonte original.
WITH corrected(product_name, position, minimum_days, maximum_days) AS (
    VALUES
        ('Plan Futuro Largo Plazo', 0, 360, 719),
        ('Plan Futuro Largo Plazo', 1, 720, 1079),
        ('Plan Futuro Largo Plazo', 2, 1080, 1799),
        ('Plan Futuro Largo Plazo', 3, 1800, 1800),
        ('Plan Educación', 0, 180, 364),
        ('Plan Educación', 1, 365, 729),
        ('Plan Educación', 2, 730, 1094),
        ('Plan Educación', 3, 1095, 1095)
)
UPDATE investment_product_rates rate
SET minimum_term_days = corrected.minimum_days,
    maximum_term_days = corrected.maximum_days,
    minimum_term_value = corrected.minimum_days,
    maximum_term_value = corrected.maximum_days,
    label = CASE
        WHEN corrected.minimum_days = corrected.maximum_days THEN corrected.minimum_days || ' días'
        ELSE corrected.minimum_days || '–' || corrected.maximum_days || ' días'
    END
FROM investment_products product, corrected
WHERE rate.product_id = product.id
  AND product.name = corrected.product_name
  AND rate.position = corrected.position;

UPDATE investment_product_term_configs config
SET minimum_value = bounds.minimum_days,
    maximum_value = bounds.maximum_days,
    unit = 'DAYS',
    selection = 'RANGE',
    increment_value = 1
FROM (
    SELECT product_id, MIN(minimum_term_days) AS minimum_days,
           MAX(maximum_term_days) AS maximum_days
    FROM investment_product_rates
    GROUP BY product_id
) bounds
WHERE config.product_id = bounds.product_id;

UPDATE investment_products product
SET minimum_term_days = bounds.minimum_days,
    maximum_term_days = bounds.maximum_days,
    minimum_term_value = bounds.minimum_days,
    maximum_term_value = bounds.maximum_days,
    term_unit = 'DAYS',
    term_selection = 'RANGE',
    term_increment = 1,
    active = TRUE,
    updated_at = CURRENT_TIMESTAMP
FROM (
    SELECT product_id, MIN(minimum_term_days) AS minimum_days,
           MAX(maximum_term_days) AS maximum_days
    FROM investment_product_rates
    GROUP BY product_id
) bounds
WHERE product.id = bounds.product_id;

DELETE FROM investment_product_terms
WHERE product_id IN (SELECT id FROM investment_products);

INSERT INTO investment_product_terms (product_id, term_days, term_value, position)
SELECT id, minimum_term_days, minimum_term_days, 0 FROM investment_products
UNION ALL
SELECT id, maximum_term_days, maximum_term_days, 1 FROM investment_products
WHERE maximum_term_days <> minimum_term_days;

INSERT INTO investment_product_tax_rules (
    product_id, name, rule_type, value, base, active, exempt_from_term_days, position
)
SELECT product.id, 'Retención de Impuesto a la Renta', 'PERCENTAGE', 3,
       'GROSS_INTEREST', TRUE, 180, 0
FROM investment_products product
WHERE NOT EXISTS (
    SELECT 1 FROM investment_product_tax_rules rule WHERE rule.product_id = product.id
);
