-- Normativa de crédito con fuentes verificables.
--
-- Tasas activas efectivas máximas y referenciales publicadas por el Banco Central del Ecuador
-- para septiembre de 2026 (metodología de la JPRF, Resolución JPRF-F-2023-070). Son las mismas
-- para bancos, mutualistas y cooperativas: la norma aplica a todo el sistema financiero nacional.
-- Fuente: https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm
--
-- El BCE no fija montos ni plazos máximos por segmento (desde la Resolución 603-2020-F los
-- subsegmentos se definen por ventas del cliente, no por monto). Esos límites quedan como política
-- institucional y se etiquetan así para no presentarlos como regulación.

ALTER TABLE "${app-schema}".regla_normativa ADD COLUMN IF NOT EXISTS url_fuente TEXT;

-- ─────────────────────────────────────────────────────────────
-- Segmentos regulatorios vigentes (catálogo para el configurador)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE "${app-schema}".segmento_regulatorio (
    codigo      VARCHAR(50) PRIMARY KEY,
    nombre      VARCHAR(120) NOT NULL,
    descripcion TEXT,
    orden       INTEGER NOT NULL DEFAULT 0,
    activo      BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO "${app-schema}".segmento_regulatorio (codigo, nombre, descripcion, orden, activo) VALUES
('CONSUMO_PRIORITARIO',   'Consumo', 'Personas naturales para bienes, servicios o gastos no productivos.', 1, TRUE),
('EDUCATIVO',             'Educativo', 'Formación y capacitación profesional o técnica.', 2, TRUE),
('EDUCATIVO_SOCIAL',      'Educativo social', 'Crédito educativo con condiciones preferenciales de política pública.', 3, TRUE),
('INMOBILIARIO',          'Inmobiliario', 'Adquisición, construcción o mejora de vivienda no incluida en VIP o VIS.', 4, TRUE),
('VIVIENDA_VIP',          'Vivienda de interés público', 'Primera vivienda dentro del valor fijado para VIP.', 5, TRUE),
('VIVIENDA_VIS',          'Vivienda de interés social', 'Primera vivienda dentro del valor fijado para VIS.', 6, TRUE),
('MICROCREDITO_MINORISTA','Microcrédito minorista', 'Microempresarios con ventas anuales en el rango minorista.', 7, TRUE),
('MICROCREDITO_SIMPLE',   'Microcrédito de acumulación simple', 'Microempresarios con ventas anuales de acumulación simple.', 8, TRUE),
('MICROCREDITO_AMPLIADA', 'Microcrédito de acumulación ampliada', 'Microempresarios con ventas anuales de acumulación ampliada.', 9, TRUE),
('PRODUCTIVO_PYMES',      'Productivo PYMES', 'Pequeñas y medianas empresas.', 10, TRUE),
('PRODUCTIVO_EMPRESARIAL','Productivo empresarial', 'Empresas medianas grandes.', 11, TRUE),
('PRODUCTIVO_CORPORATIVO','Productivo corporativo', 'Empresas grandes.', 12, TRUE),
-- Segmento eliminado en la segmentación de 2020: se conserva solo para productos antiguos.
('CONSUMO_ORDINARIO',     'Consumo ordinario (anterior a 2020)', 'Se unificó con Consumo. No se ofrece para productos nuevos.', 99, FALSE);

-- ─────────────────────────────────────────────────────────────
-- Tasas máximas y referenciales de septiembre de 2026
-- ─────────────────────────────────────────────────────────────
UPDATE "${app-schema}".regla_normativa
SET fecha_fin_vigencia = DATE '2026-08-31'
WHERE tipo_parametro = 'TASA_MAXIMA' AND fecha_fin_vigencia IS NULL;

INSERT INTO "${app-schema}".regla_normativa
    (segmento, tipo_parametro, limite, unidad, fecha_inicio_vigencia, normativa, resolucion, organismo, url_fuente)
SELECT t.segmento, t.tipo, t.valor, 'PORCENTAJE', DATE '2026-09-01',
       CASE t.tipo WHEN 'TASA_MAXIMA' THEN 'Tasa activa efectiva máxima – septiembre 2026'
                   ELSE 'Tasa activa efectiva referencial – septiembre 2026' END,
       'JPRF-F-2023-070', 'BCE',
       'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'
FROM (VALUES
    ('PRODUCTIVO_CORPORATIVO', 'TASA_MAXIMA', 7.7200),  ('PRODUCTIVO_CORPORATIVO', 'TASA_REFERENCIAL', 7.0300),
    ('PRODUCTIVO_EMPRESARIAL', 'TASA_MAXIMA', 9.9900),  ('PRODUCTIVO_EMPRESARIAL', 'TASA_REFERENCIAL', 9.0500),
    ('PRODUCTIVO_PYMES',       'TASA_MAXIMA', 10.1500), ('PRODUCTIVO_PYMES',       'TASA_REFERENCIAL', 8.9800),
    ('CONSUMO_PRIORITARIO',    'TASA_MAXIMA', 16.7700), ('CONSUMO_PRIORITARIO',    'TASA_REFERENCIAL', 15.7400),
    ('CONSUMO_ORDINARIO',      'TASA_MAXIMA', 16.7700), ('CONSUMO_ORDINARIO',      'TASA_REFERENCIAL', 15.7400),
    ('EDUCATIVO',              'TASA_MAXIMA', 9.5000),  ('EDUCATIVO',              'TASA_REFERENCIAL', 8.8300),
    ('EDUCATIVO_SOCIAL',       'TASA_MAXIMA', 7.5000),  ('EDUCATIVO_SOCIAL',       'TASA_REFERENCIAL', 5.4900),
    ('VIVIENDA_VIP',           'TASA_MAXIMA', 4.9900),  ('VIVIENDA_VIP',           'TASA_REFERENCIAL', 4.9900),
    ('VIVIENDA_VIS',           'TASA_MAXIMA', 4.9900),  ('VIVIENDA_VIS',           'TASA_REFERENCIAL', 4.9900),
    ('INMOBILIARIO',           'TASA_MAXIMA', 9.2600),  ('INMOBILIARIO',           'TASA_REFERENCIAL', 8.5500),
    ('MICROCREDITO_MINORISTA', 'TASA_MAXIMA', 28.2300), ('MICROCREDITO_MINORISTA', 'TASA_REFERENCIAL', 19.6500),
    ('MICROCREDITO_SIMPLE',    'TASA_MAXIMA', 24.8900), ('MICROCREDITO_SIMPLE',    'TASA_REFERENCIAL', 20.7400),
    ('MICROCREDITO_AMPLIADA',  'TASA_MAXIMA', 22.0500), ('MICROCREDITO_AMPLIADA',  'TASA_REFERENCIAL', 18.5300)
) AS t(segmento, tipo, valor);

-- Montos y plazos: política institucional, no regulación.
UPDATE "${app-schema}".regla_normativa
SET organismo = 'INSTITUCIONAL',
    normativa = 'Política de crédito institucional (el BCE no fija este límite por segmento)',
    resolucion = NULL
WHERE tipo_parametro IN ('MONTO_MAXIMO', 'PLAZO_MAXIMO');

INSERT INTO "${app-schema}".regla_normativa
    (segmento, tipo_parametro, limite, unidad, fecha_inicio_vigencia, normativa, organismo)
VALUES
('EDUCATIVO_SOCIAL',       'PLAZO_MAXIMO', 84,  'MESES', DATE '2026-09-01', 'Política de crédito institucional (el BCE no fija este límite por segmento)', 'INSTITUCIONAL'),
('VIVIENDA_VIS',           'PLAZO_MAXIMO', 300, 'MESES', DATE '2026-09-01', 'Política de crédito institucional (el BCE no fija este límite por segmento)', 'INSTITUCIONAL'),
('MICROCREDITO_AMPLIADA',  'PLAZO_MAXIMO', 60,  'MESES', DATE '2026-09-01', 'Política de crédito institucional (el BCE no fija este límite por segmento)', 'INSTITUCIONAL'),
('PRODUCTIVO_EMPRESARIAL', 'PLAZO_MAXIMO', 120, 'MESES', DATE '2026-09-01', 'Política de crédito institucional (el BCE no fija este límite por segmento)', 'INSTITUCIONAL'),
('PRODUCTIVO_CORPORATIVO', 'PLAZO_MAXIMO', 120, 'MESES', DATE '2026-09-01', 'Política de crédito institucional (el BCE no fija este límite por segmento)', 'INSTITUCIONAL');

-- ─────────────────────────────────────────────────────────────
-- Seguro de desgravamen y cobros indirectos: rangos prudenciales
-- ─────────────────────────────────────────────────────────────
-- La prima de desgravamen la fija la aseguradora (controlada por la Superintendencia de Compañías)
-- según edad y riesgo del deudor. Estos rangos evitan valores fuera de mercado según el tipo de entidad.
INSERT INTO "${app-schema}".regla_normativa
    (segmento, tipo_parametro, limite, unidad, fecha_inicio_vigencia, normativa, organismo)
VALUES
('BANCO',       'DESGRAVAMEN_MINIMO', 0.0100, 'PORCENTAJE', DATE '2026-01-01', 'Rango prudencial de desgravamen mensual sobre saldo (la prima la fija la aseguradora)', 'INSTITUCIONAL'),
('BANCO',       'DESGRAVAMEN_MAXIMO', 0.0650, 'PORCENTAJE', DATE '2026-01-01', 'Rango prudencial de desgravamen mensual sobre saldo (la prima la fija la aseguradora)', 'INSTITUCIONAL'),
('COOPERATIVA', 'DESGRAVAMEN_MINIMO', 0.0400, 'PORCENTAJE', DATE '2026-01-01', 'Rango prudencial de desgravamen mensual sobre saldo (la prima la fija la aseguradora)', 'INSTITUCIONAL'),
('COOPERATIVA', 'DESGRAVAMEN_MAXIMO', 0.1200, 'PORCENTAJE', DATE '2026-01-01', 'Rango prudencial de desgravamen mensual sobre saldo (la prima la fija la aseguradora)', 'INSTITUCIONAL'),
('CARGOS', 'CARGO_PORCENTAJE_MENSUAL_MAXIMO', 0.5000,  'PORCENTAJE', DATE '2026-01-01', 'Tope prudencial por cobro porcentual mensual', 'INSTITUCIONAL'),
('CARGOS', 'CARGO_FIJO_MENSUAL_MAXIMO',       50.0000, 'USD',        DATE '2026-01-01', 'Tope prudencial por cobro fijo mensual', 'INSTITUCIONAL'),
('CARGOS', 'CARGO_UNICO_PORCENTAJE_MAXIMO',   3.0000,  'PORCENTAJE', DATE '2026-01-01', 'Tope prudencial por cobro único sobre el monto', 'INSTITUCIONAL'),
('CARGOS', 'CARGO_UNICO_FIJO_MAXIMO',         500.0000,'USD',        DATE '2026-01-01', 'Tope prudencial por cobro único fijo', 'INSTITUCIONAL'),
('CARGOS', 'CARGOS_MAXIMOS_POR_PRODUCTO',     5,       'CANTIDAD',   DATE '2026-01-01', 'Máximo de cobros indirectos por producto', 'INSTITUCIONAL');

-- ─────────────────────────────────────────────────────────────
-- Cobros indirectos: categoría (seguro, gasto, donación u otro)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "${app-schema}".cargo_credito
    ADD COLUMN IF NOT EXISTS categoria VARCHAR(20) NOT NULL DEFAULT 'GASTO'
        CHECK (categoria IN ('SEGURO', 'GASTO', 'DONACION', 'OTRO'));

UPDATE "${app-schema}".cargo_credito SET categoria = 'SEGURO' WHERE lower(nombre) LIKE '%seguro%';

-- Una donación nunca puede ser obligatoria para obtener un crédito.
UPDATE "${app-schema}".cargo_credito SET obligatorio = FALSE WHERE categoria = 'DONACION';

-- La institución es una sola: el tipo de entidad sale de la configuración institucional (Banco por defecto).
UPDATE "${app-schema}".producto_credito SET entidad = 'Banco';

-- Los cobros opcionales que el cliente elija viajan con la simulación y la solicitud.
ALTER TABLE "${app-schema}".saved_simulations ADD COLUMN optional_charges VARCHAR(200);
ALTER TABLE "${app-schema}".applications ADD COLUMN optional_charges VARCHAR(200);
