-- Planes de ejemplo para mostrar alternativas de corto, largo plazo y educación.
-- No se crean retenciones por defecto; cada plan inicia con withholding_rate = 0.

INSERT INTO investment_products (
    name, description, currency, minimum_amount, maximum_amount,
    minimum_term_days, maximum_term_days, calculation_method, rate_type,
    capitalization_frequency, day_count_basis, withholding_rate, active
) VALUES
(
    'Plan Crece Corto Plazo',
    'Una alternativa para colocar tus ahorros durante periodos cortos y recibir intereses al vencimiento o de forma mensual.',
    'USD', 500.00, 100000.00,
    31, 180, 'SIMPLE', 'NOMINAL_ANNUAL',
    NULL, 360, 0, TRUE
),
(
    'Plan Futuro Largo Plazo',
    'Una inversión para metas de largo plazo con capitalización mensual y pago al vencimiento.',
    'USD', 1000.00, 500000.00,
    360, 1800, 'COMPOUND', 'EFFECTIVE_ANNUAL',
    'MONTHLY', 365, 0, TRUE
),
(
    'Plan Educación',
    'Una alternativa pensada para formar un fondo destinado a estudios y metas educativas.',
    'USD', 100.00, 50000.00,
    180, 1095, 'COMPOUND', 'EFFECTIVE_ANNUAL',
    'MONTHLY', 365, 0, TRUE
);

INSERT INTO investment_product_terms (product_id, term_days, position)
SELECT id, term_days, position
FROM investment_products
JOIN (
    VALUES
        ('Plan Crece Corto Plazo', 31, 0),
        ('Plan Crece Corto Plazo', 60, 1),
        ('Plan Crece Corto Plazo', 90, 2),
        ('Plan Crece Corto Plazo', 180, 3),
        ('Plan Futuro Largo Plazo', 360, 0),
        ('Plan Futuro Largo Plazo', 720, 1),
        ('Plan Futuro Largo Plazo', 1080, 2),
        ('Plan Futuro Largo Plazo', 1800, 3),
        ('Plan Educación', 180, 0),
        ('Plan Educación', 365, 1),
        ('Plan Educación', 730, 2),
        ('Plan Educación', 1095, 3)
) AS configured(name, term_days, position) ON configured.name = investment_products.name;

INSERT INTO investment_product_payout_frequencies (product_id, frequency, position)
SELECT id, frequency, position
FROM investment_products
JOIN (
    VALUES
        ('Plan Crece Corto Plazo', 'AT_MATURITY', 0),
        ('Plan Crece Corto Plazo', 'MONTHLY', 1),
        ('Plan Futuro Largo Plazo', 'AT_MATURITY', 0),
        ('Plan Educación', 'AT_MATURITY', 0)
) AS configured(name, frequency, position) ON configured.name = investment_products.name;

INSERT INTO investment_product_rates (
    product_id, label, minimum_amount, maximum_amount,
    minimum_term_days, maximum_term_days, annual_rate, position
)
SELECT products.id, configured.label, products.minimum_amount, products.maximum_amount,
       configured.term_days, configured.term_days, configured.annual_rate, configured.position
FROM investment_products products
JOIN (
    VALUES
        ('Plan Crece Corto Plazo', '31 días', 31, 0.03250000::numeric, 0),
        ('Plan Crece Corto Plazo', '60 días', 60, 0.03500000::numeric, 1),
        ('Plan Crece Corto Plazo', '90 días', 90, 0.03750000::numeric, 2),
        ('Plan Crece Corto Plazo', '180 días', 180, 0.04000000::numeric, 3),
        ('Plan Futuro Largo Plazo', '360 días', 360, 0.04750000::numeric, 0),
        ('Plan Futuro Largo Plazo', '720 días', 720, 0.05250000::numeric, 1),
        ('Plan Futuro Largo Plazo', '1080 días', 1080, 0.05750000::numeric, 2),
        ('Plan Futuro Largo Plazo', '1800 días', 1800, 0.06250000::numeric, 3),
        ('Plan Educación', '180 días', 180, 0.04250000::numeric, 0),
        ('Plan Educación', '365 días', 365, 0.04750000::numeric, 1),
        ('Plan Educación', '730 días', 730, 0.05250000::numeric, 2),
        ('Plan Educación', '1095 días', 1095, 0.05750000::numeric, 3)
) AS configured(name, label, term_days, annual_rate, position)
    ON configured.name = products.name;
