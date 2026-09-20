ALTER TABLE "${app-schema}".app_users ADD COLUMN username varchar(30);

UPDATE "${app-schema}".app_users SET username = lower(split_part(email, '@', 1));

UPDATE "${app-schema}".app_users AS target SET username = target.username || target.id
WHERE EXISTS (
    SELECT 1 FROM "${app-schema}".app_users AS other
    WHERE other.username = target.username AND other.id < target.id
);

ALTER TABLE "${app-schema}".app_users ALTER COLUMN username SET NOT NULL;
ALTER TABLE "${app-schema}".app_users ADD CONSTRAINT app_users_username_key UNIQUE (username);
