CREATE OR REPLACE FUNCTION get_single_clue(
    p_clue_id text
)
RETURNS jsonb AS
$$
DECLARE
    clue_record jsonb;
BEGIN
    -- Select the entire row from the clue table where the id matches the input parameter.
    -- Include loading_status from the entry table.
    SELECT to_jsonb(c) || jsonb_build_object('loading_status', e.loading_status)
    INTO clue_record
    FROM clue AS c
    LEFT JOIN entry e ON c.entry = e.entry AND c.lang = e.lang
    WHERE c.id = p_clue_id;

    -- Return the JSONB object containing the clue's data.
    RETURN clue_record;
END;
$$ LANGUAGE plpgsql;
