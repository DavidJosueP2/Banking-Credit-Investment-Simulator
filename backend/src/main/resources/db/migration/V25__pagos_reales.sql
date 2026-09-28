-- Registro de pagos reales: "próxima cuota", "saldo proyectado" y el avance de cada solicitud
-- dejan de inferirse por fecha (cronograma proyectado) y pasan a leerse de pagos que el personal
-- registra a mano. Los pagos se registran en orden (cuota N solo si la N-1 ya está registrada) para
-- que el saldo tras el último pago siga siendo el que corresponde según el cronograma.

CREATE TABLE "${app-schema}".application_payments (
    id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id     bigint NOT NULL REFERENCES "${app-schema}".applications(id) ON DELETE CASCADE,
    installment_number integer NOT NULL CHECK (installment_number > 0),
    amount             numeric(15, 2) NOT NULL CHECK (amount > 0),
    paid_at            date NOT NULL,
    note               varchar(200),
    recorded_by        bigint NOT NULL REFERENCES "${app-schema}".app_users(id),
    recorded_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (application_id, installment_number)
);

CREATE INDEX application_payments_application_idx ON "${app-schema}".application_payments(application_id, installment_number);

INSERT INTO "${app-schema}".app_permissions (code, label, area) VALUES
    ('payments.register', 'Registrar pagos y desembolsos', 'Operaciones');

-- Bookkeeping, no una decisión de crédito: no rompe la separación asesor/analista.
INSERT INTO "${app-schema}".app_role_permissions (role_code, permission_code) VALUES
    ('credit_advisor', 'payments.register'),
    ('credit_analyst', 'payments.register'),
    ('investment_advisor', 'payments.register'),
    ('administrator', 'payments.register');
