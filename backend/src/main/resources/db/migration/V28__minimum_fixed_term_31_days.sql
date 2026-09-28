-- En Ecuador, un depósito a plazo se considera exigible después de más de 30 días.
-- Se adopta 31 días como mínimo entero para este producto.
DELETE FROM investment_product_rates
WHERE maximum_term_days < 31;

UPDATE investment_product_rates
SET minimum_term_days = GREATEST(minimum_term_days, 31),
    minimum_term_value = GREATEST(minimum_term_value, 31);

UPDATE investment_product_rates
SET label = CASE
        WHEN minimum_term_days = maximum_term_days THEN minimum_term_days || ' días'
        ELSE minimum_term_days || '–' || maximum_term_days || ' días'
    END;

UPDATE investment_product_term_configs config
SET minimum_value = bounds.minimum_days,
    maximum_value = bounds.maximum_days
FROM (
    SELECT product_id, MIN(minimum_term_days) AS minimum_days,
           MAX(maximum_term_days) AS maximum_days
    FROM investment_product_rates
    GROUP BY product_id
) bounds
WHERE bounds.product_id = config.product_id;

UPDATE investment_products product
SET minimum_term_days = bounds.minimum_days,
    maximum_term_days = bounds.maximum_days,
    minimum_term_value = bounds.minimum_days,
    maximum_term_value = bounds.maximum_days
FROM (
    SELECT product_id, MIN(minimum_term_days) AS minimum_days,
           MAX(maximum_term_days) AS maximum_days
    FROM investment_product_rates
    GROUP BY product_id
) bounds
WHERE bounds.product_id = product.id;
