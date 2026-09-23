-- Migración V8: Configuración de créditos por el Asesor y normativa BCE
-- Añade campos de entidad, sistemas permitidos, tasa de desgravamen y segmento BCE a producto_credito
-- Añade usuario de prueba ASESOR y productos configurados semilla

-- 1. Nuevas columnas en producto_credito
ALTER TABLE "${app-schema}".producto_credito
    ADD COLUMN IF NOT EXISTS entidad VARCHAR(100) DEFAULT 'Banco',
    ADD COLUMN IF NOT EXISTS sistemas_permitidos VARCHAR(100) DEFAULT 'FRANCES,ALEMAN',
    ADD COLUMN IF NOT EXISTS tasa_desgravamen_mensual NUMERIC(8, 4) DEFAULT 0.0600,
    ADD COLUMN IF NOT EXISTS segmento_bce VARCHAR(100) DEFAULT 'Consumo Prioritario';

COMMENT ON COLUMN "${app-schema}".producto_credito.entidad IS 'Tipo o nombre de la institución (Banco / Cooperativa)';
COMMENT ON COLUMN "${app-schema}".producto_credito.sistemas_permitidos IS 'Sistemas permitidos separados por coma: FRANCES, ALEMAN o FRANCES,ALEMAN';
COMMENT ON COLUMN "${app-schema}".producto_credito.tasa_desgravamen_mensual IS 'Porcentaje mensual del seguro de desgravamen sobre el saldo deudor';
COMMENT ON COLUMN "${app-schema}".producto_credito.segmento_bce IS 'Segmento regulatorio del BCE';

-- 2. Crear usuario ASESOR para pruebas si la tabla app_users existe
DO $$
DECLARE
    v_user_id BIGINT;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = '${app-schema}' AND table_name = 'app_users') THEN
        IF NOT EXISTS (SELECT 1 FROM "${app-schema}".app_users WHERE email = 'asesor@financiero.ec') THEN
            INSERT INTO "${app-schema}".app_users (username, email, full_name, password_hash, enabled)
            VALUES ('asesor', 'asesor@financiero.ec', 'Carlos Asesor Bancario',
                    '$2a$12$9F34m0a7XhD7YqR5P8V3xOeLzZ1K9Yx5I8UvYgWjW2K6I8YqW5P8V', TRUE)
            RETURNING id INTO v_user_id;

            IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = '${app-schema}' AND table_name = 'app_user_roles') THEN
                INSERT INTO "${app-schema}".app_user_roles (user_id, role_code)
                VALUES (v_user_id, 'credit_advisor')
                ON CONFLICT DO NOTHING;
            END IF;
        END IF;
    END IF;
END $$;

-- 3. Semilla de Productos configurados por defecto
-- Producto 1: Crédito de Consumo Personal (Banco)
INSERT INTO "${app-schema}".producto_credito (
    tipo_credito_id, nombre, descripcion, plazo_min_meses, plazo_max_meses,
    monto_min, monto_max, entidad, sistemas_permitidos, tasa_desgravamen_mensual,
    segmento_bce, activo
)
SELECT t.id, 'Crédito Consumo Ágil Banco', 'Crédito de libre disponibilidad para personas naturales',
       3, 60, 500.00, 30000.00, 'Banco', 'FRANCES,ALEMAN', 0.0600,
       'Consumo Prioritario', TRUE
FROM "${app-schema}".tipo_credito t
WHERE t.nombre = 'Crédito de consumo'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Producto 2: Microcrédito Emprende (Cooperativa)
INSERT INTO "${app-schema}".producto_credito (
    tipo_credito_id, nombre, descripcion, plazo_min_meses, plazo_max_meses,
    monto_min, monto_max, entidad, sistemas_permitidos, tasa_desgravamen_mensual,
    segmento_bce, activo
)
SELECT t.id, 'Microcrédito Crece Cooperativa', 'Financiamiento ágil para pequeños y medianos emprendedores',
       3, 36, 300.00, 10000.00, 'Cooperativa', 'FRANCES,ALEMAN', 0.0700,
       'Microcrédito Minorista', TRUE
FROM "${app-schema}".tipo_credito t
WHERE t.nombre = 'Crédito personal' OR t.nombre = 'Crédito de consumo'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Asociar tasas a los productos recién creados
INSERT INTO "${app-schema}".tasa_credito (
    producto_id, tipo_tasa, nombre, valor, fecha_vigencia, segmento_bce, observacion, activo
)
SELECT p.id, 'ADMIN_CONFIGURED', 'Tasa Activa Consumo Banco', 15.5000, CURRENT_DATE, p.segmento_bce, 'Tasa configurada por asesor', TRUE
FROM "${app-schema}".producto_credito p
WHERE p.nombre = 'Crédito Consumo Ágil Banco'
  AND NOT EXISTS (SELECT 1 FROM "${app-schema}".tasa_credito tc WHERE tc.producto_id = p.id);

INSERT INTO "${app-schema}".tasa_credito (
    producto_id, tipo_tasa, nombre, valor, fecha_vigencia, segmento_bce, observacion, activo
)
SELECT p.id, 'ADMIN_CONFIGURED', 'Tasa Microcrédito Cooperativa', 22.0000, CURRENT_DATE, p.segmento_bce, 'Tasa configurada por asesor', TRUE
FROM "${app-schema}".producto_credito p
WHERE p.nombre = 'Microcrédito Crece Cooperativa'
  AND NOT EXISTS (SELECT 1 FROM "${app-schema}".tasa_credito tc WHERE tc.producto_id = p.id);
