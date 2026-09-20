ALTER TABLE investment_product_terms
    ADD COLUMN term_value INTEGER;

UPDATE investment_product_terms
SET term_value = term_days
WHERE term_value IS NULL;

ALTER TABLE investment_product_terms
    ALTER COLUMN term_value SET NOT NULL;

CREATE UNIQUE INDEX uq_investment_product_term_value
    ON investment_product_terms(product_id, term_value);
