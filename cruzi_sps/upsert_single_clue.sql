CREATE OR REPLACE FUNCTION upsert_single_clue(
  clue_data jsonb
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    clue_id text;
BEGIN
    -- Extract the 'id' from the JSONB input
    clue_id := clue_data ->> 'id';

    -- Perform the UPSERT (INSERT or UPDATE) operation
    INSERT INTO clue (
        id,
        entry,
        lang,
        sense_id,
        custom_clue,
        custom_display_text,
        source
    )
    VALUES (
        clue_id,
        clue_data ->> 'entry',
        clue_data ->> 'lang',
        clue_data ->> 'sense_id',
        clue_data ->> 'custom_clue',
        clue_data ->> 'custom_display_text',
        clue_data ->> 'source'
    )
    ON CONFLICT (id) DO UPDATE SET
        entry = EXCLUDED.entry,
        lang = EXCLUDED.lang,
        sense_id = EXCLUDED.sense_id,
        custom_clue = EXCLUDED.custom_clue,
        custom_display_text = EXCLUDED.custom_display_text,
        source = EXCLUDED.source
    RETURNING id INTO clue_id;

    -- Return the ID of the inserted/updated record
    RETURN clue_id;
END;
$$;
