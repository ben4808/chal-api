CREATE OR REPLACE FUNCTION add_clue_to_collection(
    clue_data jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_next_order int;
BEGIN
    -- Get the next order number for this collection
    SELECT COALESCE(MAX("order"), 0) + 1
    INTO v_next_order
    FROM collection__clue
    WHERE collection_id = clue_data->>'collection_id';

    -- Insert into clue table
    INSERT INTO clue (id, entry, lang, sense_id, custom_clue, custom_display_text, source)
    VALUES (
        clue_data->>'id',
        clue_data->>'entry',
        clue_data->>'lang',
        NULL, -- sense_id will be determined later or can be updated
        clue_data->>'custom_clue',
        clue_data->>'custom_display_text',
        clue_data->>'source'
    );

    -- Insert into collection__clue table
    INSERT INTO collection__clue (collection_id, clue_id, "order", metadata1, metadata2)
    VALUES (
        clue_data->>'collection_id',
        clue_data->>'id',
        v_next_order,
        NULL,
        NULL
    );

    -- Increment the clue count for the collection
    UPDATE clue_collection
    SET clue_count = clue_count + 1
    WHERE id = clue_data->>'collection_id';
END;
$$;
