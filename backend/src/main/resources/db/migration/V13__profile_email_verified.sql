ALTER TABLE "${app-schema}".customer_profiles RENAME COLUMN phone_verified TO email_verified;

UPDATE "${app-schema}".customer_profiles AS profile SET email_verified = true
WHERE EXISTS (
    SELECT 1 FROM "${app-schema}".email_verifications AS verification
    WHERE verification.user_id = profile.user_id AND verification.verified_at IS NOT NULL
);
