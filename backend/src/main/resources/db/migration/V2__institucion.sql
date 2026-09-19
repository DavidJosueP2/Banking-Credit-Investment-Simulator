-- Módulo: Configuración de la institución financiera
-- Solo puede existir un registro activo. El sistema NO hardcodea el nombre.

CREATE TABLE IF NOT EXISTS "${app-schema}".institucion_financiera (
    id                  BIGSERIAL PRIMARY KEY,
    nombre              VARCHAR(200)  NOT NULL,
    nombre_comercial    VARCHAR(200),
    ruc                 VARCHAR(13),
    logo_url            TEXT,
    direccion           VARCHAR(500),
    telefono            VARCHAR(50),
    email               VARCHAR(150),
    sitio_web           VARCHAR(300),
    ciudad              VARCHAR(100),
    provincia           VARCHAR(100),
    descripcion         TEXT,
    horarios            TEXT,
    color_primario      VARCHAR(20)   DEFAULT '#1e3a5f',
    color_secundario    VARCHAR(20)   DEFAULT '#2e7d32',
    info_legal          TEXT,
    terminos_condiciones TEXT,
    politica_privacidad  TEXT,
    activo              BOOLEAN       NOT NULL DEFAULT TRUE,
    creado_en           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Solo un registro activo a la vez
CREATE UNIQUE INDEX idx_institucion_activa
    ON "${app-schema}".institucion_financiera (activo)
    WHERE activo = TRUE;

COMMENT ON TABLE "${app-schema}".institucion_financiera
    IS 'Configuración de la institución financiera. Registro único activo.';
