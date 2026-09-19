-- Módulo: Usuarios y autenticación

CREATE TABLE IF NOT EXISTS "${app-schema}".usuario (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(150)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    nombre          VARCHAR(100)  NOT NULL,
    apellido        VARCHAR(100)  NOT NULL,
    cedula          VARCHAR(13),
    telefono        VARCHAR(20),
    -- ROL: ADMIN | ASESOR | CLIENTE
    rol             VARCHAR(20)   NOT NULL DEFAULT 'CLIENTE',
    activo          BOOLEAN       NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuario_email ON "${app-schema}".usuario(email);
CREATE INDEX idx_usuario_rol   ON "${app-schema}".usuario(rol);

COMMENT ON TABLE "${app-schema}".usuario
    IS 'Usuarios del sistema. Roles: ADMIN, ASESOR, CLIENTE';

-- Usuario administrador por defecto (password: Admin2024!)
-- Se debe cambiar en producción
INSERT INTO "${app-schema}".usuario (email, password_hash, nombre, apellido, rol)
VALUES (
    'admin@financiero.ec',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4tbQa2PMTW',
    'Administrador',
    'Sistema',
    'ADMIN'
);
