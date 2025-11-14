CREATE OR REPLACE FUNCTION get_clue_by_entry_in_collection(
    p_collection_id text,
    p_entry text,
    p_lang text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_array(
        jsonb_build_object(
            'id', c.id,
            'entry', c.entry,
            'lang', c.lang,
            'sense_id', c.sense_id,
            'custom_clue', c.custom_clue,
            'custom_display_text', c.custom_display_text,
            'source', c.source,
            'translated_clues', NULL -- This might need to be populated based on schema
        )
    )
    INTO result
    FROM clue c
    JOIN collection__clue cc ON c.id = cc.clue_id
    WHERE cc.collection_id = p_collection_id
    AND c.entry = p_entry
    AND c.lang = p_lang
    LIMIT 1;

    -- If no result found, return empty array
    IF result IS NULL THEN
        RETURN jsonb_build_array();
    END IF;

    RETURN result;
END;
$$;
