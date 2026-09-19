CREATE TABLE "${app-schema}".identity_documents (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES "${app-schema}".app_users(id) ON DELETE CASCADE,
    document_side varchar(10) NOT NULL CHECK (document_side IN ('FRONT', 'BACK')),
    content_type varchar(80) NOT NULL,
    content bytea NOT NULL,
    status varchar(12) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    uploaded_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, document_side)
);

CREATE TABLE "${app-schema}".customer_biometrics (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL UNIQUE REFERENCES "${app-schema}".app_users(id) ON DELETE CASCADE,
    collection_id varchar(60) NOT NULL,
    face_id varchar(60) NOT NULL,
    algorithm varchar(40) NOT NULL,
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    consent_at timestamptz NOT NULL,
    consent_version varchar(20) NOT NULL
);

CREATE TABLE "${app-schema}".biometric_verifications (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES "${app-schema}".app_users(id) ON DELETE CASCADE,
    operation_type varchar(40) NOT NULL,
    operation_id bigint,
    session_id varchar(80),
    liveness_confidence numeric(5,2),
    match_similarity numeric(5,2),
    result varchar(16) NOT NULL CHECK (result IN ('APPROVED', 'REJECTED', 'MANUAL_REVIEW')),
    verified_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX biometric_verifications_user_idx ON "${app-schema}".biometric_verifications(user_id);
CREATE INDEX biometric_verifications_operation_idx
    ON "${app-schema}".biometric_verifications(operation_type, operation_id);
