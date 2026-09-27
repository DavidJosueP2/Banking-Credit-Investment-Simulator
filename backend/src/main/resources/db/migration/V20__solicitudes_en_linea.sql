-- Solicitudes en línea: el cliente convierte una simulación pública en una solicitud autenticada,
-- la confirma con su rostro y un asesor la revisa. Los cálculos los hace siempre el módulo dueño
-- del producto (créditos o inversiones); aquí solo se guarda la foto de lo que el cliente aceptó.

INSERT INTO "${app-schema}".app_permissions (code, label, area) VALUES
    ('credit.request.create', 'Solicitar un crédito', 'Cliente'),
    ('simulation.save', 'Guardar simulaciones', 'Cliente');

INSERT INTO "${app-schema}".app_role_permissions (role_code, permission_code) VALUES
    ('client', 'credit.request.create'),
    ('client', 'simulation.save');

-- ─────────────────────────────────────────────────────────────
-- Simulaciones guardadas por el cliente
-- ─────────────────────────────────────────────────────────────
CREATE TABLE "${app-schema}".saved_simulations (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES "${app-schema}".app_users(id) ON DELETE CASCADE,
    product_type varchar(12) NOT NULL CHECK (product_type IN ('CREDIT', 'INVESTMENT')),
    product_id bigint NOT NULL,
    product_name varchar(200) NOT NULL,
    label varchar(80),
    amount numeric(15, 2) NOT NULL CHECK (amount > 0),
    term integer NOT NULL CHECK (term > 0),
    term_unit varchar(10) NOT NULL,
    amortization_system varchar(10) CHECK (amortization_system IN ('FRANCES', 'ALEMAN')),
    payout_frequency varchar(20),
    asset_cost numeric(15, 2),
    -- Tasa anual en porcentaje (15.50 = 15,50 %) para ambos módulos.
    annual_rate numeric(10, 6) NOT NULL,
    periodic_payment numeric(15, 2),
    total_interest numeric(15, 2) NOT NULL,
    total_amount numeric(15, 2) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX saved_simulations_user_idx ON "${app-schema}".saved_simulations(user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- Solicitudes
-- ─────────────────────────────────────────────────────────────
CREATE TABLE "${app-schema}".applications (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code varchar(20) UNIQUE,
    user_id bigint NOT NULL REFERENCES "${app-schema}".app_users(id) ON DELETE CASCADE,
    product_type varchar(12) NOT NULL CHECK (product_type IN ('CREDIT', 'INVESTMENT')),
    product_id bigint NOT NULL,
    product_name varchar(200) NOT NULL,
    amount numeric(15, 2) NOT NULL CHECK (amount > 0),
    term integer NOT NULL CHECK (term > 0),
    term_unit varchar(10) NOT NULL,
    amortization_system varchar(10) CHECK (amortization_system IN ('FRANCES', 'ALEMAN')),
    payout_frequency varchar(20),
    asset_cost numeric(15, 2),
    annual_rate numeric(10, 6) NOT NULL,
    periodic_payment numeric(15, 2),
    total_interest numeric(15, 2) NOT NULL,
    total_insurance numeric(15, 2) NOT NULL DEFAULT 0,
    total_charges numeric(15, 2) NOT NULL DEFAULT 0,
    total_withholding numeric(15, 2) NOT NULL DEFAULT 0,
    total_amount numeric(15, 2) NOT NULL,
    -- Crédito: ingreso mensual declarado. Inversión: no aplica.
    monthly_income numeric(15, 2) CHECK (monthly_income IS NULL OR monthly_income > 0),
    -- Crédito: destino de los fondos. Inversión: origen de los fondos.
    purpose varchar(300) NOT NULL,
    status varchar(12) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'OBSERVED', 'APPROVED', 'REJECTED', 'CANCELLED')),
    biometric_result varchar(16) CHECK (biometric_result IN ('APPROVED', 'MANUAL_REVIEW')),
    biometric_session_id varchar(80),
    biometric_attempts integer NOT NULL DEFAULT 0,
    reviewer_id bigint REFERENCES "${app-schema}".app_users(id),
    decision_comment varchar(600),
    -- Fecha desde la que se proyectó el cronograma; al aprobar, las fechas se corren a la de aprobación.
    schedule_base_date date NOT NULL,
    submitted_at timestamptz,
    decided_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX applications_user_idx ON "${app-schema}".applications(user_id, created_at DESC);
CREATE INDEX applications_queue_idx ON "${app-schema}".applications(status, product_type, submitted_at);
-- Un cliente no puede tener dos solicitudes abiertas del mismo producto.
CREATE UNIQUE INDEX applications_one_open_per_product ON "${app-schema}".applications(user_id, product_type, product_id)
    WHERE status IN ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'OBSERVED');

CREATE TABLE "${app-schema}".application_schedule (
    application_id bigint NOT NULL REFERENCES "${app-schema}".applications(id) ON DELETE CASCADE,
    number integer NOT NULL,
    due_date date NOT NULL,
    opening_balance numeric(15, 2),
    principal numeric(15, 2) NOT NULL DEFAULT 0,
    interest numeric(15, 2) NOT NULL DEFAULT 0,
    insurance numeric(15, 2) NOT NULL DEFAULT 0,
    charges numeric(15, 2) NOT NULL DEFAULT 0,
    withholding numeric(15, 2) NOT NULL DEFAULT 0,
    payment numeric(15, 2) NOT NULL,
    closing_balance numeric(15, 2),
    PRIMARY KEY (application_id, number)
);

CREATE TABLE "${app-schema}".application_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id bigint NOT NULL REFERENCES "${app-schema}".applications(id) ON DELETE CASCADE,
    from_status varchar(12),
    to_status varchar(12) NOT NULL,
    comment varchar(600),
    actor_id bigint REFERENCES "${app-schema}".app_users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX application_events_application_idx ON "${app-schema}".application_events(application_id, created_at);

CREATE TABLE "${app-schema}".application_documents (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id bigint NOT NULL REFERENCES "${app-schema}".applications(id) ON DELETE CASCADE,
    file_name varchar(160) NOT NULL,
    content_type varchar(80) NOT NULL,
    size_bytes integer NOT NULL,
    content bytea NOT NULL,
    uploaded_by bigint NOT NULL REFERENCES "${app-schema}".app_users(id),
    uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX application_documents_application_idx ON "${app-schema}".application_documents(application_id);
