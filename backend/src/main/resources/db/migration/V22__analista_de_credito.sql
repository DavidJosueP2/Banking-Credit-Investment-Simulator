-- Separación de funciones en créditos:
--   Asesor de crédito: recibe, revisa, pide información y recomienda. Aprueba solo dentro de su
--                      atribución (monto configurable) y con biometría aprobada.
--   Analista de crédito: aprueba o rechaza lo que el asesor recomienda. Nunca la misma persona.
--   Administrador: configura reglas y usuarios; consulta solicitudes sin decidirlas.

INSERT INTO "${app-schema}".app_roles (code, label) VALUES ('credit_analyst', 'Analista de crédito');

INSERT INTO "${app-schema}".app_permissions (code, label, area) VALUES
    ('credit.requests.approve', 'Aprobar o rechazar créditos recomendados', 'Créditos'),
    ('requests.audit', 'Consultar solicitudes (solo lectura)', 'Administración');

INSERT INTO "${app-schema}".app_role_permissions (role_code, permission_code) VALUES
    ('credit_analyst', 'admin.dashboard.view'),
    ('credit_analyst', 'credit.requests.approve'),
    ('credit_analyst', 'credit.simulate'),
    ('credit_analyst', 'simulation.report.download'),
    ('administrator', 'requests.audit');

-- El administrador deja de decidir operaciones individuales.
DELETE FROM "${app-schema}".app_role_permissions
WHERE role_code = 'administrator' AND permission_code IN ('credit.requests.review', 'investment.requests.review');

-- Nuevo estado: recomendada por el asesor, pendiente de la decisión del analista.
ALTER TABLE "${app-schema}".applications ALTER COLUMN status TYPE varchar(20);
ALTER TABLE "${app-schema}".application_events ALTER COLUMN from_status TYPE varchar(20);
ALTER TABLE "${app-schema}".application_events ALTER COLUMN to_status TYPE varchar(20);

ALTER TABLE "${app-schema}".applications DROP CONSTRAINT applications_status_check;
ALTER TABLE "${app-schema}".applications ADD CONSTRAINT applications_status_check CHECK (status IN
    ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'OBSERVED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'));

DROP INDEX "${app-schema}".applications_one_open_per_product;
CREATE UNIQUE INDEX applications_one_open_per_product ON "${app-schema}".applications(user_id, product_type, product_id)
    WHERE status IN ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'OBSERVED', 'PENDING_APPROVAL');

ALTER TABLE "${app-schema}".applications
    ADD COLUMN recommendation varchar(10) CHECK (recommendation IN ('APPROVE', 'REJECT')),
    ADD COLUMN recommendation_comment varchar(600),
    ADD COLUMN recommended_by bigint REFERENCES "${app-schema}".app_users(id),
    ADD COLUMN recommended_at timestamptz,
    ADD COLUMN decided_by bigint REFERENCES "${app-schema}".app_users(id);
