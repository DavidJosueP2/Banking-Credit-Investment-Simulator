-- Módulo: Registro de simulaciones

CREATE TABLE IF NOT EXISTS "${app-schema}".simulacion (
    id              BIGSERIAL PRIMARY KEY,
    usuario_id      BIGINT          REFERENCES "${app-schema}".usuario(id),
    producto_id     BIGINT          REFERENCES "${app-schema}".producto_credito(id),
    monto           NUMERIC(15, 2)  NOT NULL,
    plazo_meses     INT             NOT NULL,
    tasa_efectiva   NUMERIC(8, 4)   NOT NULL,
    tipo_tasa       VARCHAR(30)     NOT NULL DEFAULT 'ADMIN_CONFIGURED',
    -- FRANCES | ALEMAN
    sistema         VARCHAR(10)     NOT NULL DEFAULT 'FRANCES',
    cuota_calculada NUMERIC(12, 2),
    total_intereses NUMERIC(15, 2),
    total_pagado    NUMERIC(15, 2),
    resultado_json  TEXT,           -- tabla de amortización completa en JSON
    ip_origen       VARCHAR(45),
    creado_en       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_simulacion_usuario  ON "${app-schema}".simulacion(usuario_id);
CREATE INDEX idx_simulacion_producto ON "${app-schema}".simulacion(producto_id);
CREATE INDEX idx_simulacion_fecha    ON "${app-schema}".simulacion(creado_en);

COMMENT ON TABLE "${app-schema}".simulacion
    IS 'Historial de simulaciones. Sistema: FRANCES (cuota fija) o ALEMAN (cuota decreciente)';
