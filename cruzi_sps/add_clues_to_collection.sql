CREATE OR REPLACE FUNCTION add_clues_to_collection(
    clues_data jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_collection_id text;
    v_start_order int;
    v_count int;
BEGIN
    -- All clues in the batch must be for the same collection; use the first element
    v_collection_id := clues_data->0->>'collection_id';

    -- Get the next order number for this collection
    SELECT COALESCE(MAX("order"), 0) + 1
    INTO v_start_order
    FROM collection__clue
    WHERE collection_id = v_collection_id;

    -- Insert all clues into clue table
    INSERT INTO clue (id, entry, lang, sense_id, custom_clue, custom_display_text, source)
    SELECT
        elem->>'id',
        elem->>'entry',
        elem->>'lang',
        NULL,
        elem->>'custom_clue',
        elem->>'custom_display_text',
        elem->>'source'
    FROM jsonb_array_elements(clues_data) AS elem;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Insert all into collection__clue with sequential order
    INSERT INTO collection__clue (collection_id, clue_id, "order", metadata1, metadata2)
    SELECT
        v_collection_id,
        ord.elem->>'id',
        v_start_order + (ord.ord - 1),
        NULL,
        NULL
    FROM jsonb_array_elements(clues_data) WITH ORDINALITY AS ord(elem, ord);

    -- Increment the clue count for the collection by the number of clues added
    UPDATE clue_collection
    SET clue_count = clue_count + v_count
    WHERE id = v_collection_id;
END;
$$;
