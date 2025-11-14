-- Function to initialize user collection progress if it doesn't exist
-- Creates a record with all clues marked as unseen
CREATE OR REPLACE FUNCTION initialize_user_collection_progress(
    p_user_id text,
    p_collection_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO user__collection (user_id, collection_id, unseen, in_progress, completed)
    SELECT
        p_user_id,
        p_collection_id,
        COUNT(*)::int,
        0,
        0
    FROM collection__clue
    WHERE collection_id = p_collection_id
    ON CONFLICT (user_id, collection_id) DO NOTHING;
END;
$$;
