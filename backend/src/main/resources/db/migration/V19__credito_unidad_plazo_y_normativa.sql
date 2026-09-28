-- Migración V19: Unidad de plazo, control normativo BCE con vigencia temporal y cargos indirectos

-- 1. Nuevas columnas en producto_credito
ALTER TABLE "${app-schema}".producto_credito
    ADD COLUMN IF NOT EXISTS unidad_plazo VARCHAR(20) DEFAULT 'MESES';

COMMENT ON COLUMN "${app-schema}".producto_credito.unidad_plazo IS 'Unidad de plazo para el simulador: MESES o ANIOS';

-- 2. Nuevas columnas en cargo_credito para cargos indirectos regulados
ALTER TABLE "${app-schema}".cargo_credito
    ADD COLUMN IF NOT EXISTS periodicidad VARCHAR(20) DEFAULT 'MENSUAL',
    ADD COLUMN IF NOT EXISTS base_calculo VARCHAR(30) DEFAULT 'SALDO_DEUDOR',
    ADD COLUMN IF NOT EXISTS norma_aplicable VARCHAR(200);

COMMENT ON COLUMN "${app-schema}".cargo_credito.periodicidad IS 'MENSUAL o UNICO';
COMMENT ON COLUMN "${app-schema}".cargo_credito.base_calculo IS 'SALDO_DEUDOR, MONTO_SOLICITADO o FIJO';
COMMENT ON COLUMN "${app-schema}".cargo_credito.norma_aplicable IS 'Resolución o norma aplicable (BCE, JPRFM, SB, SEPS)';

-- 3. Tabla de Reglas Normativas con Vigencia Temporal (BCE / JPRFM / SB / SEPS)
CREATE TABLE IF NOT EXISTS "${app-schema}".regla_normativa (
    id                     BIGSERIAL PRIMARY KEY,
    segmento               VARCHAR(100) NOT NULL,
    tipo_parametro         VARCHAR(50)  NOT NULL, -- TASA_MAXIMA, MONTO_MAXIMO, PLAZO_MAXIMO, DESGRAVAMEN_MAXIMO, CARGO_MAXIMO
    limite                 NUMERIC(15, 4) NOT NULL,
    unidad                 VARCHAR(20)  NOT NULL, -- PORCENTAJE, USD, MESES
    fecha_inicio_vigencia  DATE         NOT NULL,
    fecha_fin_vigencia     DATE,
    normativa              VARCHAR(200) NOT NULL,
    resolucion             VARCHAR(100),
    organismo              VARCHAR(50)  NOT NULL DEFAULT 'BCE', -- BCE, JPRFM, SB, SEPS
    activo                 BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regla_normativa_segmento ON "${app-schema}".regla_normativa(segmento);
CREATE INDEX IF NOT EXISTS idx_regla_normativa_vigencia ON "${app-schema}".regla_normativa(fecha_inicio_vigencia, fecha_fin_vigencia);

COMMENT ON TABLE "${app-schema}".regla_normativa IS 'Límites regulatorios y normativos vigentes publicados por BCE, JPRFM, SB y SEPS';

-- 4. Semilla de Reglas Normativas vigentes (Resoluciones Oficiales 2026)
INSERT INTO "${app-schema}".regla_normativa (
    segmento, tipo_parametro, limite, unidad, fecha_inicio_vigencia, fecha_fin_vigencia, normativa, resolucion, organismo, activo
) VALUES
-- Consumo Prioritario
('CONSUMO_PRIORITARIO', 'TASA_MAXIMA', 16.7700, 'PORCENTAJE', '2026-01-01', NULL, 'Resolución Tasa Activa Máxima BCE', 'BCE-2026-001', 'BCE', TRUE),
('CONSUMO_PRIORITARIO', 'MONTO_MAXIMO', 30000.00, 'USD', '2026-01-01', NULL, 'Tope Legal Crédito de Consumo', 'JPRFM-2025-089', 'JPRFM', TRUE),
('CONSUMO_PRIORITARIO', 'PLAZO_MAXIMO', 60, 'MESES', '2026-01-01', NULL, 'Plazo Máximo Consumo Prioritario', 'JPRFM-2025-089', 'JPRFM', TRUE),

-- Consumo Ordinario
('CONSUMO_ORDINARIO', 'TASA_MAXIMA', 17.3000, 'PORCENTAJE', '2026-01-01', NULL, 'Resolución Tasa Activa Máxima BCE', 'BCE-2026-001', 'BCE', TRUE),
('CONSUMO_ORDINARIO', 'MONTO_MAXIMO', 30000.00, 'USD', '2026-01-01', NULL, 'Tope Legal Crédito Ordinario', 'JPRFM-2025-089', 'JPRFM', TRUE),
('CONSUMO_ORDINARIO', 'PLAZO_MAXIMO', 60, 'MESES', '2026-01-01', NULL, 'Plazo Máximo Consumo Ordinario', 'JPRFM-2025-089', 'JPRFM', TRUE),

-- Microcrédito Minorista
('MICROCREDITO_MINORISTA', 'TASA_MAXIMA', 28.2300, 'PORCENTAJE', '2026-01-01', NULL, 'Resolución Microcrédito BCE', 'BCE-2026-001', 'BCE', TRUE),
('MICROCREDITO_MINORISTA', 'MONTO_MAXIMO', 3000.00, 'USD', '2026-01-01', NULL, 'Tope Minorista SEPS/BCE', 'SEPS-2025-014', 'SEPS', TRUE),
('MICROCREDITO_MINORISTA', 'PLAZO_MAXIMO', 36, 'MESES', '2026-01-01', NULL, 'Plazo Máximo Microcrédito Minorista', 'SEPS-2025-014', 'SEPS', TRUE),

-- Microcrédito Simple
('MICROCREDITO_SIMPLE', 'TASA_MAXIMA', 25.5000, 'PORCENTAJE', '2026-01-01', NULL, 'Resolución Microcrédito Acumulación Simple', 'BCE-2026-001', 'BCE', TRUE),
('MICROCREDITO_SIMPLE', 'MONTO_MAXIMO', 10000.00, 'USD', '2026-01-01', NULL, 'Tope Microcrédito Simple', 'SEPS-2025-014', 'SEPS', TRUE),
('MICROCREDITO_SIMPLE', 'PLAZO_MAXIMO', 48, 'MESES', '2026-01-01', NULL, 'Plazo Máximo Microcrédito Simple', 'SEPS-2025-014', 'SEPS', TRUE),

-- Vivienda VIP
('VIVIENDA_VIP', 'TASA_MAXIMA', 4.9900, 'PORCENTAJE', '2026-01-01', NULL, 'Tasa Subsidiada Vivienda de Interés Público', 'MIDUVI-BCE-2024-003', 'BCE', TRUE),
('VIVIENDA_VIP', 'MONTO_MAXIMO', 105000.00, 'USD', '2026-01-01', NULL, 'Tope Avalúo Vivienda VIP', 'MIDUVI-2024-001', 'JPRFM', TRUE),
('VIVIENDA_VIP', 'PLAZO_MAXIMO', 300, 'MESES', '2026-01-01', NULL, 'Plazo Máximo Hipotecario VIP (25 años)', 'JPRFM-2024-055', 'JPRFM', TRUE),

-- Inmobiliario General
('INMOBILIARIO', 'TASA_MAXIMA', 10.4000, 'PORCENTAJE', '2026-01-01', NULL, 'Resolución Inmobiliario BCE', 'BCE-2026-001', 'BCE', TRUE),
('INMOBILIARIO', 'MONTO_MAXIMO', 500000.00, 'USD', '2026-01-01', NULL, 'Tope Crédito Inmobiliario Comercial', 'SB-2025-002', 'SB', TRUE),
('INMOBILIARIO', 'PLAZO_MAXIMO', 240, 'MESES', '2026-01-01', NULL, 'Plazo Máximo Inmobiliario (20 años)', 'SB-2025-002', 'SB', TRUE),

-- Productivo PYMES
('PRODUCTIVO_PYMES', 'TASA_MAXIMA', 11.8300, 'PORCENTAJE', '2026-01-01', NULL, 'Resolución Productivo PYMES BCE', 'BCE-2026-001', 'BCE', TRUE),
('PRODUCTIVO_PYMES', 'MONTO_MAXIMO', 500000.00, 'USD', '2026-01-01', NULL, 'Tope Productivo PYMES', 'JPRFM-2025-032', 'JPRFM', TRUE),
('PRODUCTIVO_PYMES', 'PLAZO_MAXIMO', 60, 'MESES', '2026-01-01', NULL, 'Plazo Máximo Productivo PYMES', 'JPRFM-2025-032', 'JPRFM', TRUE),

-- Educativo
('EDUCATIVO', 'TASA_MAXIMA', 9.5000, 'PORCENTAJE', '2026-01-01', NULL, 'Resolución Crédito Educativo BCE', 'BCE-2026-001', 'BCE', TRUE),
('EDUCATIVO', 'MONTO_MAXIMO', 20000.00, 'USD', '2026-01-01', NULL, 'Tope Legal Educativo', 'JPRFM-2025-045', 'JPRFM', TRUE),
('EDUCATIVO', 'PLAZO_MAXIMO', 84, 'MESES', '2026-01-01', NULL, 'Plazo Máximo Educativo (7 años)', 'JPRFM-2025-045', 'JPRFM', TRUE)
ON CONFLICT DO NOTHING;

-- 5. Semilla de Productos de Crédito Representativos para el Simulador
-- Consumo
INSERT INTO "${app-schema}".producto_credito (
    tipo_credito_id, nombre, descripcion, plazo_min_meses, plazo_max_meses,
    monto_min, monto_max, entidad, sistemas_permitidos, tasa_desgravamen_mensual,
    segmento_bce, unidad_plazo, activo
)
SELECT t.id, 'Crédito de Consumo', 'Financiamiento personal y adquisición de bienes y servicios',
       6, 60, 500.00, 30000.00, 'Banco', 'FRANCES,ALEMAN', 0.0550,
       'CONSUMO_PRIORITARIO', 'MESES', TRUE
FROM "${app-schema}".tipo_credito t
WHERE t.nombre = 'Crédito de consumo'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Microcrédito
INSERT INTO "${app-schema}".producto_credito (
    tipo_credito_id, nombre, descripcion, plazo_min_meses, plazo_max_meses,
    monto_min, monto_max, entidad, sistemas_permitidos, tasa_desgravamen_mensual,
    segmento_bce, unidad_plazo, activo
)
SELECT t.id, 'Microcrédito Minorista', 'Crédito ágil para microempresarios y emprendimientos comerciales',
       3, 36, 300.00, 3000.00, 'Cooperativa', 'FRANCES,ALEMAN', 0.0700,
       'MICROCREDITO_MINORISTA', 'MESES', TRUE
FROM "${app-schema}".tipo_credito t
WHERE t.nombre = 'Crédito personal' OR t.nombre = 'Crédito de consumo'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Vivienda VIP (Plazo en años)
INSERT INTO "${app-schema}".producto_credito (
    tipo_credito_id, nombre, descripcion, plazo_min_meses, plazo_max_meses,
    monto_min, monto_max, entidad, sistemas_permitidos, tasa_desgravamen_mensual,
    segmento_bce, unidad_plazo, activo
)
SELECT t.id, 'Crédito Vivienda VIP', 'Financiamiento hipotecario con tasa preferencial para primera vivienda',
       60, 300, 20000.00, 105000.00, 'Banco', 'FRANCES,ALEMAN', 0.0250,
       'VIVIENDA_VIP', 'ANIOS', TRUE
FROM "${app-schema}".tipo_credito t
WHERE t.nombre LIKE '%vivienda%' OR t.nombre = 'Crédito de consumo'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Productivo PYMES
INSERT INTO "${app-schema}".producto_credito (
    tipo_credito_id, nombre, descripcion, plazo_min_meses, plazo_max_meses,
    monto_min, monto_max, entidad, sistemas_permitidos, tasa_desgravamen_mensual,
    segmento_bce, unidad_plazo, activo
)
SELECT t.id, 'Crédito Productivo PYMES', 'Capital de trabajo y adquisición de activos fijos para empresas',
       12, 60, 5000.00, 500000.00, 'Banco', 'FRANCES,ALEMAN', 0.0300,
       'PRODUCTIVO_PYMES', 'MESES', TRUE
FROM "${app-schema}".tipo_credito t
WHERE t.nombre LIKE '%productivo%' OR t.nombre = 'Crédito de consumo'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Tasas asociadas a productos semilla
INSERT INTO "${app-schema}".tasa_credito (
    producto_id, tipo_tasa, nombre, valor, fecha_vigencia, segmento_bce, observacion, activo
)
SELECT p.id, 'ADMIN_CONFIGURED', 'Tasa Activa ' || p.nombre,
       CASE
           WHEN p.segmento_bce = 'CONSUMO_PRIORITARIO' THEN 15.5000
           WHEN p.segmento_bce = 'MICROCREDITO_MINORISTA' THEN 22.0000
           WHEN p.segmento_bce = 'VIVIENDA_VIP' THEN 4.9900
           WHEN p.segmento_bce = 'PRODUCTIVO_PYMES' THEN 11.5000
           ELSE 14.0000
       END,
       CURRENT_DATE, p.segmento_bce, 'Tasa oficial configurada según resolución BCE', TRUE
FROM "${app-schema}".producto_credito p
WHERE NOT EXISTS (SELECT 1 FROM "${app-schema}".tasa_credito tc WHERE tc.producto_id = p.id);

-- Cargos Indirectos Semilla Regulados
-- Gastos Administrativos (fijo único) para Consumo
INSERT INTO "${app-schema}".cargo_credito (
    producto_id, nombre, tipo_cargo, valor, obligatorio, descripcion, periodicidad, base_calculo, norma_aplicable, activo
)
SELECT p.id, 'Gastos de Instrumentación Notarial', 'FIJO', 15.0000, FALSE, 'Gastos administrativos notariales y de instrumentación', 'UNICO', 'FIJO', 'Resolución SB-2025-010', TRUE
FROM "${app-schema}".producto_credito p
WHERE p.nombre = 'Crédito de Consumo'
  AND NOT EXISTS (SELECT 1 FROM "${app-schema}".cargo_credito c WHERE c.producto_id = p.id AND c.nombre = 'Gastos de Instrumentación Notarial');

-- Seguro de Incendio y Líneas Aliadas para Vivienda VIP (porcentaje mensual sobre saldo deudor)
INSERT INTO "${app-schema}".cargo_credito (
    producto_id, nombre, tipo_cargo, valor, obligatorio, descripcion, periodicidad, base_calculo, norma_aplicable, activo
)
SELECT p.id, 'Seguro de Incendio y Terremoto', 'PORCENTAJE', 0.0200, TRUE, 'Seguro estructural multirriesgo obligatorio para bienes inmuebles', 'MENSUAL', 'SALDO_DEUDOR', 'Normativa SB Seguros Hipotecarios', TRUE
FROM "${app-schema}".producto_credito p
WHERE p.nombre = 'Crédito Vivienda VIP'
  AND NOT EXISTS (SELECT 1 FROM "${app-schema}".cargo_credito c WHERE c.producto_id = p.id AND c.nombre = 'Seguro de Incendio y Terremoto');
