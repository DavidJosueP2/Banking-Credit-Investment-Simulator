CREATE TABLE "${app-schema}".app_settings (
    category varchar(40) NOT NULL,
    setting_key varchar(80) NOT NULL,
    setting_value text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint REFERENCES "${app-schema}".app_users(id),
    PRIMARY KEY (category, setting_key)
);

CREATE TABLE "${app-schema}".app_assets (
    asset_key varchar(80) PRIMARY KEY,
    file_name varchar(255) NOT NULL,
    content_type varchar(80) NOT NULL,
    content bytea NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint REFERENCES "${app-schema}".app_users(id)
);

COMMENT ON TABLE "${app-schema}".app_settings IS 'Personalizaciones sobre la configuración Brunexa predeterminada';
COMMENT ON TABLE "${app-schema}".app_assets IS 'Logotipos e imágenes institucionales personalizados';
