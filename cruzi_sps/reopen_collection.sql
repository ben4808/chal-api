-- Function to reopen a collection by incrementing correctResponsesNeeded for completed clues
CREATE OR REPLACE FUNCTION reopen_collection(
    p_user_id text,
    p_collection_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Increment correct_solves_needed by 1 for all completed clues in the collection
    -- A clue is considered completed when correct_solves >= correct_solves_needed
    UPDATE user__clue
    SET correct_solves_needed = correct_solves_needed + 1
    WHERE user_id = p_user_id
    AND clue_id IN (
        SELECT cc.clue_id
        FROM collection__clue cc
        WHERE cc.collection_id = p_collection_id
    )
    AND correct_solves >= correct_solves_needed;
END;
$$;
