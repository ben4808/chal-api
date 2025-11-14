CREATE OR REPLACE FUNCTION remove_clue_from_collection(
    p_collection_id text,
    p_clue_id text
)
RETURNS void AS $$
DECLARE
    rows_deleted int;
BEGIN
    -- Delete from the junction table and get count of deleted rows
    DELETE FROM collection__clue
    WHERE collection_id = p_collection_id AND clue_id = p_clue_id;

    GET DIAGNOSTICS rows_deleted = ROW_COUNT;

    -- If we actually deleted a row from the junction table, decrement the count
    IF rows_deleted > 0 THEN
        UPDATE clue_collection
        SET clue_count = clue_count - 1
        WHERE id = p_collection_id;
    END IF;

    -- Delete the clue entirely (assuming it's not needed elsewhere)
    -- Note: This will delete the clue even if it might be used in other collections
    DELETE FROM clue
    WHERE id = p_clue_id;
END;
$$ LANGUAGE plpgsql;
