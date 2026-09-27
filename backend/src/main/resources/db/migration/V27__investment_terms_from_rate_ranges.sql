-- Los rangos de tasas pasan a ser la única fuente de verdad para el plazo permitido.
-- Los antiguos cortes 31, 60, 90... se reinterpretan como 1–31, 32–60, 61–90...
WITH ordered_rates AS (
    SELECT rate.id,
           COALESCE(
               LAG(rate.maximum_term_days) OVER (
                   PARTITION BY rate.product_id, rate.minimum_amount, rate.maximum_amount
                   ORDER BY rate.maximum_term_days, rate.position, rate.id
               ) + 1,
               1
           ) AS new_minimum,
           rate.maximum_term_days AS new_maximum
    FROM investment_product_rates rate
)
UPDATE investment_product_rates rate
SET minimum_term_days = ordered.new_minimum,
    maximum_term_days = ordered.new_maximum,
    minimum_term_value = ordered.new_minimum,
    maximum_term_value = ordered.new_maximum,
    label = CASE
        WHEN ordered.new_minimum = ordered.new_maximum THEN ordered.new_minimum || ' días'
        ELSE ordered.new_minimum || '–' || ordered.new_maximum || ' días'
    END
FROM ordered_rates ordered
WHERE ordered.id = rate.id
  AND ordered.new_minimum <= ordered.new_maximum;

DELETE FROM investment_product_term_options;

-- Si un producto antiguo tenía más de una unidad, se conserva una sola configuración interna.
DELETE FROM investment_product_term_configs duplicate
USING investment_product_term_configs keeper
WHERE duplicate.product_id = keeper.product_id
  AND duplicate.id > keeper.id;

UPDATE investment_product_term_configs config
SET unit = 'DAYS',
    selection = 'RANGE',
    minimum_value = bounds.minimum_days,
    maximum_value = bounds.maximum_days,
    increment_value = 1
FROM (
    SELECT product_id, MIN(minimum_term_days) AS minimum_days,
           MAX(maximum_term_days) AS maximum_days
    FROM investment_product_rates
    GROUP BY product_id
) bounds
WHERE bounds.product_id = config.product_id;

UPDATE investment_products product
SET term_unit = 'DAYS',
    term_selection = 'RANGE',
    minimum_term_value = bounds.minimum_days,
    maximum_term_value = bounds.maximum_days,
    term_increment = 1,
    minimum_term_days = bounds.minimum_days,
    maximum_term_days = bounds.maximum_days
FROM (
    SELECT product_id, MIN(minimum_term_days) AS minimum_days,
           MAX(maximum_term_days) AS maximum_days
    FROM investment_product_rates
    GROUP BY product_id
) bounds
WHERE bounds.product_id = product.id;
