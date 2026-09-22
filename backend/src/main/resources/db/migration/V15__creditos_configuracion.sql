-- Módulo: Configuración de créditos
-- Estructura jerárquica: SEGMENTO → TIPO → PRODUCTO

-- ─────────────────────────────────────────────────────────────
-- 1. Segmentos de crédito
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "${app-schema}".segmento_credito (
    id          BIGSERIAL PRIMARY KEY,
    codigo      VARCHAR(50)  NOT NULL UNIQUE,
    nombre      VARCHAR(200) NOT NULL,
    descripcion TEXT,
    orden       INT          NOT NULL DEFAULT 0,
    activo      BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE "${app-schema}".segmento_credito
    IS 'Segmentos de crédito (Consumo, Vivienda, Productivo, etc.)';

-- ─────────────────────────────────────────────────────────────
-- 2. Tipos de crédito
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "${app-schema}".tipo_credito (
    id               BIGSERIAL PRIMARY KEY,
    segmento_id      BIGINT       NOT NULL REFERENCES "${app-schema}".segmento_credito(id),
    nombre           VARCHAR(200) NOT NULL,
    descripcion      TEXT,
    orden            INT          NOT NULL DEFAULT 0,
    activo           BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actualizado_en   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tipo_credito_segmento ON "${app-schema}".tipo_credito(segmento_id);
COMMENT ON TABLE "${app-schema}".tipo_credito
    IS 'Tipos de crédito dentro de un segmento (ej: Crédito automotriz dentro de Consumo)';

-- ─────────────────────────────────────────────────────────────
-- 3. Productos de crédito
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "${app-schema}".producto_credito (
    id               BIGSERIAL PRIMARY KEY,
    tipo_credito_id  BIGINT          NOT NULL REFERENCES "${app-schema}".tipo_credito(id),
    nombre           VARCHAR(200)    NOT NULL,
    descripcion      TEXT,
    plazo_min_meses  INT             NOT NULL DEFAULT 1,
    plazo_max_meses  INT             NOT NULL DEFAULT 360,
    monto_min        NUMERIC(15, 2)  NOT NULL DEFAULT 100.00,
    monto_max        NUMERIC(15, 2)  NOT NULL DEFAULT 1000000.00,
    requiere_garante BOOLEAN         NOT NULL DEFAULT FALSE,
    imagen_url       TEXT,
    orden            INT             NOT NULL DEFAULT 0,
    activo           BOOLEAN         NOT NULL DEFAULT TRUE,
    creado_en        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actualizado_en   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_producto_credito_tipo ON "${app-schema}".producto_credito(tipo_credito_id);
COMMENT ON TABLE "${app-schema}".producto_credito
    IS 'Productos específicos de crédito (ej: Vehículo nuevo dentro de Crédito automotriz)';

-- ─────────────────────────────────────────────────────────────
-- 4. Fuentes de tasas
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "${app-schema}".fuente_tasa (
    id          BIGSERIAL PRIMARY KEY,
    codigo      VARCHAR(50)  NOT NULL UNIQUE,
    nombre      VARCHAR(200) NOT NULL,
    descripcion TEXT,
    url         TEXT,
    activo      BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE "${app-schema}".fuente_tasa
    IS 'Fuentes de tasas de interés: BCE, SEPS, BIESS, Institucional, Admin';

-- ─────────────────────────────────────────────────────────────
-- 5. Tasas de crédito
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "${app-schema}".tasa_credito (
    id              BIGSERIAL PRIMARY KEY,
    producto_id     BIGINT          REFERENCES "${app-schema}".producto_credito(id),
    fuente_id       BIGINT          REFERENCES "${app-schema}".fuente_tasa(id),
    -- REFERENTIAL | MAXIMUM | INSTITUTIONAL | ADMIN_CONFIGURED | MARKET_REFERENCE | ACADEMIC
    tipo_tasa       VARCHAR(30)     NOT NULL DEFAULT 'ADMIN_CONFIGURED',
    nombre          VARCHAR(200),
    valor           NUMERIC(8, 4)   NOT NULL,  -- porcentaje, ej: 15.7400
    fecha_vigencia  DATE            NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin       DATE,
    segmento_bce    VARCHAR(100),  -- segmento regulatorio del BCE si aplica
    institucion_ref VARCHAR(200),  -- institución de referencia si aplica
    observacion     TEXT,
    url_fuente      TEXT,
    activo          BOOLEAN         NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasa_credito_producto ON "${app-schema}".tasa_credito(producto_id);
CREATE INDEX idx_tasa_credito_tipo ON "${app-schema}".tasa_credito(tipo_tasa);
COMMENT ON TABLE "${app-schema}".tasa_credito
    IS 'Tasas de crédito. Tipo: REFERENTIAL, MAXIMUM, INSTITUTIONAL, ADMIN_CONFIGURED, MARKET_REFERENCE, ACADEMIC';

-- ─────────────────────────────────────────────────────────────
-- 6. Rangos de crédito
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "${app-schema}".rango_credito (
    id              BIGSERIAL PRIMARY KEY,
    producto_id     BIGINT          NOT NULL REFERENCES "${app-schema}".producto_credito(id),
    tasa_id         BIGINT          REFERENCES "${app-schema}".tasa_credito(id),
    monto_min       NUMERIC(15, 2)  NOT NULL,
    monto_max       NUMERIC(15, 2)  NOT NULL,
    plazo_min_meses INT             NOT NULL,
    plazo_max_meses INT             NOT NULL,
    descripcion     TEXT,
    activo          BOOLEAN         NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rango_credito_producto ON "${app-schema}".rango_credito(producto_id);
COMMENT ON TABLE "${app-schema}".rango_credito IS 'Rangos de monto y plazo por producto de crédito';

-- ─────────────────────────────────────────────────────────────
-- 7. Cargos de crédito
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "${app-schema}".cargo_credito (
    id          BIGSERIAL PRIMARY KEY,
    producto_id BIGINT          NOT NULL REFERENCES "${app-schema}".producto_credito(id),
    nombre      VARCHAR(200)    NOT NULL,
    tipo_cargo  VARCHAR(20)     NOT NULL DEFAULT 'FIJO',  -- FIJO | PORCENTAJE
    valor       NUMERIC(12, 4)  NOT NULL DEFAULT 0,
    obligatorio BOOLEAN         NOT NULL DEFAULT TRUE,
    descripcion TEXT,
    activo      BOOLEAN         NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cargo_credito_producto ON "${app-schema}".cargo_credito(producto_id);
COMMENT ON TABLE "${app-schema}".cargo_credito IS 'Cargos asociados a productos de crédito (comisiones, gastos)';

-- ─────────────────────────────────────────────────────────────
-- 8. Seguros de crédito
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "${app-schema}".seguro_credito (
    id              BIGSERIAL PRIMARY KEY,
    producto_id     BIGINT          NOT NULL REFERENCES "${app-schema}".producto_credito(id),
    nombre          VARCHAR(200)    NOT NULL,
    tipo_seguro     VARCHAR(30)     NOT NULL DEFAULT 'DESGRAVAMEN',  -- DESGRAVAMEN | INCENDIO | ROBO | VIDA | OTRO
    valor_porcentaje NUMERIC(8, 4)  NOT NULL DEFAULT 0,
    obligatorio     BOOLEAN         NOT NULL DEFAULT TRUE,
    descripcion     TEXT,
    activo          BOOLEAN         NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seguro_credito_producto ON "${app-schema}".seguro_credito(producto_id);
COMMENT ON TABLE "${app-schema}".seguro_credito IS 'Seguros requeridos por productos de crédito';

-- ─────────────────────────────────────────────────────────────
-- 9. Garantías de crédito
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "${app-schema}".garantia_credito (
    id              BIGSERIAL PRIMARY KEY,
    producto_id     BIGINT       NOT NULL REFERENCES "${app-schema}".producto_credito(id),
    -- QUIROGRAFARIO | HIPOTECARIO | PRENDARIO | PERSONAL | GARANTE | LIQUIDA | SIN_GARANTIA
    tipo_garantia   VARCHAR(30)  NOT NULL,
    descripcion     TEXT,
    obligatoria     BOOLEAN      NOT NULL DEFAULT FALSE,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_garantia_credito_producto ON "${app-schema}".garantia_credito(producto_id);
COMMENT ON TABLE "${app-schema}".garantia_credito IS 'Tipos de garantía requeridas por producto de crédito';
