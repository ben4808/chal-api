-- Function to insert a user if they don't already exist (based on id)
CREATE OR REPLACE FUNCTION insert_user_if_not_exists(
    p_id text,
    p_email text,
    p_first_name text DEFAULT NULL,
    p_last_name text DEFAULT NULL,
    p_native_lang text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "user" (id, email, first_name, last_name, native_lang, created_at)
    VALUES (p_id, p_email, p_first_name, p_last_name, p_native_lang, NOW())
    ON CONFLICT (id) DO NOTHING;
END;
$$;
