-- Los costos adicionales pasan a ser solo un porcentaje del interés generado, descontado en cada pago: así nunca
-- superan el rendimiento del cliente. Los montos fijos o sobre el capital (solo existían como pruebas) se eliminan.
DELETE FROM investment_product_charges
WHERE charge_type <> 'PERCENTAGE' OR base IS DISTINCT FROM 'GROSS_INTEREST';

UPDATE investment_product_charges SET frequency = 'PER_PAYMENT';

ALTER TABLE investment_product_charges
    ADD CONSTRAINT ck_investment_charge_interest_only CHECK (
        charge_type = 'PERCENTAGE' AND base = 'GROSS_INTEREST' AND frequency = 'PER_PAYMENT' AND value < 100);
