CREATE TABLE "${app-schema}".customer_profiles (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL UNIQUE REFERENCES "${app-schema}".app_users(id) ON DELETE CASCADE,
    id_type varchar(12) NOT NULL CHECK (id_type IN ('CEDULA', 'PASAPORTE')),
    id_number varchar(20) NOT NULL,
    first_names varchar(80) NOT NULL,
    last_names varchar(80) NOT NULL,
    birth_date date NOT NULL,
    phone varchar(20),
    phone_verified boolean NOT NULL DEFAULT false,
    address varchar(200),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id_type, id_number)
);
