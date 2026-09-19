CREATE TABLE "${app-schema}".email_verifications (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES "${app-schema}".app_users(id) ON DELETE CASCADE,
    email varchar(254) NOT NULL,
    code_hash varchar(100) NOT NULL,
    expires_at timestamptz NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_verifications_user_idx ON "${app-schema}".email_verifications(user_id);
