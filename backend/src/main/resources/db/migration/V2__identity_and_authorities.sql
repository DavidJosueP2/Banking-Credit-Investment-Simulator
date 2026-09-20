CREATE TABLE "${app-schema}".app_roles (
    code varchar(40) PRIMARY KEY,
    label varchar(100) NOT NULL
);

CREATE TABLE "${app-schema}".app_permissions (
    code varchar(100) PRIMARY KEY,
    label varchar(120) NOT NULL,
    area varchar(60) NOT NULL
);

CREATE TABLE "${app-schema}".app_role_permissions (
    role_code varchar(40) NOT NULL REFERENCES "${app-schema}".app_roles(code),
    permission_code varchar(100) NOT NULL REFERENCES "${app-schema}".app_permissions(code),
    PRIMARY KEY (role_code, permission_code)
);

CREATE TABLE "${app-schema}".app_users (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email varchar(254) NOT NULL UNIQUE,
    full_name varchar(120) NOT NULL,
    password_hash varchar(100) NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "${app-schema}".app_user_roles (
    user_id bigint NOT NULL REFERENCES "${app-schema}".app_users(id) ON DELETE CASCADE,
    role_code varchar(40) NOT NULL REFERENCES "${app-schema}".app_roles(code),
    PRIMARY KEY (user_id, role_code)
);

INSERT INTO "${app-schema}".app_roles (code, label) VALUES
    ('client', 'Cliente'),
    ('credit_advisor', 'Asesor de crédito'),
    ('investment_advisor', 'Asesor de inversiones'),
    ('administrator', 'Administrador');

INSERT INTO "${app-schema}".app_permissions (code, label, area) VALUES
    ('credit.simulate', 'Simular créditos', 'Público'),
    ('investment.simulate', 'Simular inversiones', 'Público'),
    ('simulation.report.download', 'Descargar reportes de simulación', 'Público'),
    ('investment.request.create', 'Solicitar una inversión', 'Cliente'),
    ('identity.verification.start', 'Iniciar verificación de identidad', 'Cliente'),
    ('investment.documents.upload', 'Subir documentos de inversión', 'Cliente'),
    ('own.requests.read', 'Consultar solicitudes propias', 'Cliente'),
    ('admin.dashboard.view', 'Entrar al panel interno', 'Panel interno'),
    ('credit.products.manage', 'Gestionar tipos y tasas de crédito', 'Créditos'),
    ('credit.charges.manage', 'Gestionar cobros indirectos', 'Créditos'),
    ('credit.requests.review', 'Revisar solicitudes de crédito', 'Créditos'),
    ('investment.products.manage', 'Gestionar productos y tasas de inversión', 'Inversiones'),
    ('investment.requests.review', 'Revisar solicitudes de inversión', 'Inversiones'),
    ('institution.manage', 'Configurar la institución', 'Administración'),
    ('users.roles.manage', 'Administrar usuarios y roles', 'Administración');

INSERT INTO "${app-schema}".app_role_permissions (role_code, permission_code)
SELECT 'client', code FROM "${app-schema}".app_permissions
WHERE code IN ('credit.simulate', 'investment.simulate', 'simulation.report.download',
               'investment.request.create', 'identity.verification.start',
               'investment.documents.upload', 'own.requests.read');

INSERT INTO "${app-schema}".app_role_permissions (role_code, permission_code)
SELECT 'credit_advisor', code FROM "${app-schema}".app_permissions
WHERE code IN ('credit.simulate', 'investment.simulate', 'simulation.report.download',
               'admin.dashboard.view', 'credit.products.manage', 'credit.charges.manage',
               'credit.requests.review');

INSERT INTO "${app-schema}".app_role_permissions (role_code, permission_code)
SELECT 'investment_advisor', code FROM "${app-schema}".app_permissions
WHERE code IN ('credit.simulate', 'investment.simulate', 'simulation.report.download',
               'admin.dashboard.view', 'investment.products.manage', 'investment.requests.review');

INSERT INTO "${app-schema}".app_role_permissions (role_code, permission_code)
SELECT 'administrator', code FROM "${app-schema}".app_permissions
WHERE code IN ('credit.simulate', 'investment.simulate', 'simulation.report.download',
               'admin.dashboard.view', 'credit.products.manage', 'credit.charges.manage',
               'credit.requests.review', 'investment.products.manage',
               'investment.requests.review', 'institution.manage', 'users.roles.manage');

CREATE INDEX app_user_roles_role_idx ON "${app-schema}".app_user_roles(role_code);
