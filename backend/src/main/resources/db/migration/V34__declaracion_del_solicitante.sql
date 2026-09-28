-- Datos que el cliente declara al solicitar, en forma estructurada (como en un formulario bancario real)
-- en lugar de un solo texto libre:
--   Crédito: destino (categoría), situación laboral y gastos mensuales, además del ingreso que ya existía.
--   Inversión: origen de los fondos (categoría) y la declaración de licitud de fondos que exige la
--   normativa de prevención de lavado de activos.
-- "purpose" se conserva como detalle libre de la categoría elegida.

ALTER TABLE "${app-schema}".applications
    ADD COLUMN purpose_category      varchar(40),
    ADD COLUMN employment_type       varchar(30),
    ADD COLUMN monthly_expenses      numeric(15, 2) CHECK (monthly_expenses IS NULL OR monthly_expenses >= 0),
    ADD COLUMN funds_source          varchar(40),
    ADD COLUMN funds_lawful_declared boolean NOT NULL DEFAULT false;
